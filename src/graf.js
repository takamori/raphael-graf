/*
 * Graf 0.0.3 - a simple yet customizable JavaScript Graphing Library (implemented as a Raphael extension) 
 *
 * Copyright (c) 2009 Daiji Takamori (http://dtakamori.com)
 * Licensed under the MIT (http://www.opensource.org/licenses/mit-license.php) license.
 * 
 *  The MIT License
 * 
 * Copyright (c) 2009 Daiji Takamori
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
(function ie_png_namespaces_jquery_ready_hack() { document.namespaces; })();

Raphael.fn.graf = (function () {

    // Private variables and methods
    
    var removeFloatingPointError = function(x) {
        return Math.round(x*100000000)/100000000;
    };
    
    var color = function(v, same_val) {
        if (v == "auto") {
            return Raphael.getColor();
        } else if (v == "same") {
            return same_val;
        } else {
            return v;
        }
    };
    
    var convertDataSet = function(data) {
        if (typeof(data) != "object" || data.constructor != Array) {
            throw "Data must be an array";
        }
        var dataset = [];
        for (var k in data) {
            var value = data[k];
            if (typeof(value) != "number") {
                throw "Non-numeric value " + value + " at " + k;
            }
            dataset.push(value);
        }
        return dataset;
    };
    
    var convertData = function(data) {
        if (typeof(data) != "object" || data.constructor != Array) {
            throw "Data must be an array, or an array of arrays";
        }
        var num_dims;
        if (data.constructor == Array) {
            for (var k in data) {
                var value = data[k];
                if (typeof(value) == "number" && 
                    (num_dims == undefined || num_dims == 1)) {
                    num_dims = 1;
                } else if (typeof(value) == "object" && value.constructor == Array &&
                    (num_dims == undefined || num_dims == 2)) {
                    num_dims = 2;
                } else {
                    throw "Unexpected data type " + typeof(value) + " at " + k;
                }
            }
        } else {
            num_dims = 1;
        }
        if (num_dims == 1) {
            return [ convertDataSet(data) ];
        } else {
            var datasets = [];
            for (var i in data) {
                datasets.push(convertDataSet(data[i]));
            }
            return datasets;
        }
    };

    // ===================================================
    // Graf
    // ===================================================
    
    var Graf = {
        version: "0.0.3"
    };
    
    Graf.arcpoint = function(r, theta) {
        return { x: r * Math.cos(theta), y: r * Math.sin(theta) };
    };
    
    // ===================================================
    // Graf.Obj
    // ===================================================
    
    Graf.Obj = function(parent, type, raphaelElement, attrs) {
        this.graf = Graf.version;
        this.parent = parent;
        this.type = type;
        this.element = raphaelElement;
        this.attrs = attrs;
        this.node = raphaelElement ? raphaelElement.node : null;
        
        // Allow for easy interop with jQuery
        this[0] = this.node;
        this.length = 1;
    };
    
    Graf.Obj.prototype.attr = function(/* args */) {
        var arg, values, i;
        if (arguments.length == 1) {
            arg = arguments[0];
            if (typeof arg === "object") {
                if (arg instanceof Array) {
                    // Get multiple
                    values = [];
                    for (i = 0; i < arg.length; i++) {
                        values.push(this.attr(arg[i]));
                    }
                    return values;
                } else {
                    // Set multiple
                    for (i in arg) {
                        this.attr(i, arg[i]); //TODO: Determine whether nested is a good idea (unintentional, I think)
                    }
                }
            } else {
                // Get single
                return this.attrs[arg] ? this.attrs[arg] : this.element.attr(arg);
            }
        } else {
            // Set single
            this.element.attr.apply(this.element, arguments);
            return this;
        }
    };
    
    Graf.Obj.prototype.animate = function() {
        this.element.animate.apply(this.element, arguments);
        return this;
    };
    
    // ===================================================
    // Graf.Pie
    // ===================================================
    
    /*
     * Creates a sector, using angles in radians where 0 points right
     */
    Graf.PiePiece = function(raphael, parent, cx, cy, r, startAngle, endAngle, params) {
        var attrs = {
            cx: cx, 
            cy: cy, 
            r: r, 
            startAngle: startAngle, 
            endAngle: endAngle
        };
        var p1 = Graf.arcpoint(r, startAngle);
        var p2 = Graf.arcpoint(r, endAngle);
        var x1 = cx + p1.x, y1 = cy + p1.y,
            x2 = cx + p2.x, y2 = cy + p2.y;
        var large_arc_flag = (Math.abs(endAngle - startAngle) > Math.PI ? 1 : 0);
        var sweep_flag = startAngle > endAngle ? 0 : 1;
        var path = raphael.path("M" + cx + " " + cy + 
                                "L" + x1 + " " + y1 +
                                "A" + r + " " + r + " 0 " + large_arc_flag + " " + sweep_flag + " " + x2 + " " + y2 +
                                "Z")
                          .attr(params.path);
        Graf.Obj.call(this, parent, "piepiece", path, attrs);
    };
    Graf.PiePiece.prototype = new Graf.Obj();
    
    /*
     * Creates a label at an angle and distance from a point, 
     * using angles in radians where 0 points right
     */
    Graf.PiePieceLabel = function(raphael, parent, cx, cy, r, angle, text, params) {
        var attrs = {
            cx: cx, 
            cy: cy, 
            r: r, 
            angle: angle, 
            text: text
        };
        var labelpoint = Graf.arcpoint(r, angle);
        var labelx = cx + labelpoint.x;
        var labely = cy + labelpoint.y;
        // Raphael 0.6.4 does not align labels properly in IE
        var txt = raphael.text(labelx, labely, text).attr(params.text);
        Graf.Obj.call(this, parent, "piepiecelabel", txt, attrs);
    };
    Graf.PiePieceLabel.prototype = new Graf.Obj();
    
    /*
     * Draws a pie chart
     * 
     */
    Graf.Pie = function(raphael, parent, cx, cy, r, data, labels, params) {
        if (!params) params = {};
        var attrs = {
            cx: cx,
            cy: cy,
            r: r,
            fill: params["fill"],
            stroke: params["stroke"],
            textfill: params["textfill"],
            textstroke: params["textstroke"],
            textr: params["textr"],
            showpercent: params["showpercent"]
        }
        if (!attrs.fill) attrs.fill = "auto";
        if (!attrs.stroke) attrs.stroke = "#000";
        if (!attrs.textfill) attrs.textfill = "#000";
        if (!attrs.textstroke) attrs.textstroke = "none";
        if (!attrs.textr) attrs.textr = 0.75*r;
        if (attrs.showpercent == undefined) attrs.showpercent = true;
        var svg = raphael.set();
        Graf.Obj.call(this, parent, "piechart", svg, attrs);
        
        // Instance-private variables
        var _pieces = [];
        var _piecelabels = [];
        
        // Remainder of constructor
        var values = convertDataSet(data);
        var startAngle = -Math.PI / 2;
        var endAngle = startAngle;
        var direction = 1;
        var strings = [];
        var total = 0;
        for (var k in values) {
            total += values[k];
        }
        for (var k in values) {
            var value = values[k];
            endAngle += direction * 2 * Math.PI * value / total;
            var pieceparams = {
                path: { fill: color(attrs.fill), stroke: color(attrs.stroke) }
            };
            var piece = new Graf.PiePiece(raphael, this, cx, cy, r, startAngle, endAngle, pieceparams);
            svg.push(piece.element);
            _pieces.push(piece);
            startAngle = endAngle;
        }
        if (labels || attrs.showpercent) {
            for (var k in labels) {
                var label = labels ? labels[k] : "";
                var piece = _pieces[k];
                if (attrs.showpercent) {
                    var value = values[k];
                    percent = (100 * value / total).toFixed(2) + "%";
                    label = label ? (label + " " + percent) : percent;
                }
                strings.push(label);
                var labelparams = {
                    text: { 
                        fill: color(attrs.textfill, piece.attr("fill")), 
                        stroke: color(attrs.textstroke, piece.attr("stroke"))
                    }
                };
                var angle = (piece.attr("startAngle") + piece.attr("endAngle")) / 2;
                var piecelabel = new Graf.PiePieceLabel(raphael, this, 
                    cx, cy, attrs.textr, angle, 
                    label, labelparams);
                svg.push(piecelabel.element);
                _piecelabels.push(piecelabel);
            }
        }
        
        // Public accessor methods (that access private variables)
        this.pieces = function() {
            return _pieces;
        };
        this.labels = function() {
            return _piecelabels;
        };
        this.piece = function(i) {
            return _pieces[i];
        };
        this.label = function(i) {
            return _piecelabels[i];
        };
    }
    Graf.Pie.prototype = new Graf.Obj();
    
    // ===================================================
    // Graf.GridChart
    // ===================================================
    
    /*
     * Draws a data set as a area graph
     * 
     */
    Graf.AreaDataSet = function(raphael, parent, x, y, w, h, max, data, params) {
        if (!params) params = {};
        var attrs = {
            x: x,
            y: y,
            w: w,
            h: h,
            max: max,
            min: params["min"]
        }
        if (attrs.min == undefined) attrs.min = 0;
        var line = raphael.set();
        var areaPathStr = "M" + x + " " + (y+h);
        var linePathStr = "";
        var points = [];
        var valuesX = [];
        var valuesY = [];
        for (var k in data) {
            var value = data[k];
            var valuex = x + w * k / (data.length - 1);
            var valuey = y + h * (1 - (value - attrs.min)/(max - attrs.min));
            areaPathStr += "L" + valuex + " " + valuey;
            linePathStr += ((k == 0) ? "M" : "L") + valuex + " " + valuey;
            valuesX.push(valuex);
            valuesY.push(valuey);
        }
        areaPathStr += "L" + (x+w) + " " + (y+h) + "Z";
        var area = raphael.path(areaPathStr).attr(params.area);
        line.push(area);
        var path = raphael.path(linePathStr).attr(params.path);
        line.push(path);
        for (k in data) {
            var point = raphael.circle(valuesX[k], valuesY[k], 1).attr(params.points);
            line.push(point);
            point.length = 1;
            points.push(point);
        }
        Graf.Obj.call(this, parent, "areadataset", line, attrs);
        
        this.area = function() {
            return area;
        };
        this.path = function() {
            return path;
        };
        this.points = function() {
            return points;
        };
        this.point = function(i) {
            return points[i];
        };
        var old_attr = this.attr;
        this.attr = function(name) {
            if (arguments.length == 2) {
                if (name == "fill-opacity") {
                    area.attr.apply(area, arguments);
                } else {
                    return old_attr.apply(this, arguments);
                }
            } else {
                return old_attr.apply(this, arguments);
            }
        };
    };
    Graf.AreaDataSet.prototype = new Graf.Obj();
    
    /*
     * Draws a data set as a line graph
     * 
     */
    Graf.LineDataSet = function(raphael, parent, x, y, w, h, max, data, params) {
        if (!params) params = {};
        var attrs = {
            x: x,
            y: y,
            w: w,
            h: h,
            max: max,
            min: params["min"] || 0
        }
        var line = raphael.set();
        var linePathStr = "";
        var points = [];
        var valuesX = [];
        var valuesY = [];
        for (var k in data) {
            var value = data[k];
            var valuex = x + w * k / (data.length - 1);
            var valuey = y + h * (1 - (value - attrs.min)/(max - attrs.min));
            linePathStr += ((k == 0) ? "M" : "L") + valuex + " " + valuey;
            valuesX.push(valuex);
            valuesY.push(valuey);
        }
        var path = raphael.path(linePathStr).attr(params.path);
        line.push(path);
        for (k in data) {
            var point = raphael.circle(valuesX[k], valuesY[k], 1).attr(params.points);
            line.push(point);
            point.length = 1;
            points.push(point);
        }
        Graf.Obj.call(this, parent, "linedataset", line, attrs);
        this.path = function() {
            return path;
        };
        this.points = function() {
            return points;
        };
        this.point = function(i) {
            return points[i];
        };
        /*
        var old_attr = this.attr;
        this.attr = function(name) {
            if (arguments.length == 2) {
                if (name == "fill-opacity" || name == "stroke-width") {
                    path.attr.apply(path, arguments);
                } else {
                    return old_attr.apply(this, arguments);
                }
            } else {
                return old_attr.apply(this, arguments);
            }
        };
        this.animate = function(params, ms, callback) {
            this.element.animate.apply(this.element, arguments);
            return this;
        };
        */
    };
    
    /*
     * Draws a data set as a bar graph
     * 
     */
    Graf.BarDataSet = function(raphael, parent, x, y, w, h, barwidth, max, data, params) {
        if (!params) params = {};
        var attrs = {
            x: x,
            y: y,
            w: w,
            h: h,
            barwidth: barwidth,
            max: max,
            min: params["min"]
        }
        if (attrs.min == undefined) attrs.min = 0;
        var barset = raphael.set();
        var bars = [];
        for (var k in data) {
            var value = data[k];
            var valuex = x + w * k / data.length;
            var barheight = h * (value - attrs.min)/(max - attrs.min);
            var valuey = y + h - barheight;
            if (barheight < 0) {
                barheight = -barheight;
                valuey -= barheight;
            }
            var bar = raphael.rect(valuex, valuey, barwidth, barheight)
                            .attr(params.rect);
            barset.push(bar);
            bar.length = 1;
            bars.push(bar);
        }
        Graf.Obj.call(this, parent, "bardataset", barset, attrs);
        this.bars = function() {
            return bars;
        };
        this.bar = function(i) {
            return bars[i];
        };
    };
    
    Graf.Axis = function(raphael, parent, cx, cy, length, direction, labels, params) {
        if (!params) params = {};
        var attrs = {
            cx: cx,
            cy: cy,
            length: length,
            direction: direction,
            offset: params["offset"],
            overrun: params["overrun"],
            numticks: params["numticks"],
            orientation: params["orientation"],
            textoffset: params["textoffset"],
            mode: params["mode"]
        }
        if (!attrs.numticks) attrs.numticks = labels.length;
        if (!attrs.direction) attrs.direction = "right";
        if (!attrs.orientation) {
            switch(attrs.direction) {
            case "up":
                attrs.orientation = "left";
                break;
            case "right":
                attrs.orientation = "down";
                break;
            case "left":
                attrs.orientation = "down";
                break;
            case "down":
                attrs.orientation = "left";
                break;
            default:
                throw "invalid direction";
            }
        }
        if (attrs.textoffset == undefined) attrs.textoffset = 10;
        if (!attrs.mode) attrs.mode = "point";
        if (attrs.overrun == undefined) {
            attrs.overrun = (attrs.mode == "point") ? 0.1 : 0;
        }
        if (attrs.offset == undefined) {
            attrs.offset = (attrs.mode == "point") ? 0 : 0.5;
        }
        
        var num_divisions = attrs.numticks - ((attrs.mode == "point") ? 1 : 0);
        var ticksize = attrs.length * (1 - attrs.overrun) / num_divisions;
        var x2, y2, pi;
        switch(attrs.direction) {
        case "up":
            x2 = attrs.cx; y2 = attrs.cy - attrs.length;
            pi = function(i) {
                return { x: attrs.cx, y: attrs.cy - (i + attrs.offset) * ticksize };
            };
            break;
        case "right":
            x2 = attrs.cx + attrs.length; y2 = attrs.cy;
            pi = function(i) {
                return { x: attrs.cx + (i + attrs.offset) * ticksize, y: attrs.cy };
            };
            break;
        case "left":
            x2 = attrs.cx - attrs.length; y2 = attrs.cy;
            pi = function(i) {
                return { x: attrs.cx + (i + attrs.offset) * ticksize, y: attrs.cy };
            };
            break;
        case "down":
            x2 = attrs.cx; y2 = attrs.cy + attrs.length;
            pi = function(i) {
                return { x: attrs.cx, y: attrs.cy + (i + attrs.offset) * ticksize };
            };
            break;
        default:
            throw "invalid direction";
        }
        var align;
        switch(attrs.orientation) {
        case "up":
            align = function(text) {
                var box = text.getBBox();
                text.translate(0, -attrs.textoffset);
            };
            break;
        case "right":
            align = function(text) {
                var box = text.getBBox();
                text.translate(attrs.textoffset + box.width/2, box.height/2);
            };
            break;
        case "left":
            align = function(text) {
                var box = text.getBBox();
                text.translate(-attrs.textoffset - box.width/2, box.height/2);
            };
            break;
        case "down":
            align = function(text) {
                var box = text.getBBox();
                text.translate(0, attrs.textoffset + box.height);
            };
            break;
        default:
            throw "invalid orientation";
        }
        
        var axis = raphael.set();
        var scale = raphael.path("M" + attrs.cx + " " + attrs.cy + 
                                 "L" + x2 + " " + y2).attr({stroke: "#000"});
        axis.push(scale);
        var ticklabels = [];
        var ticks = [];
        for (var i = 0; i < attrs.numticks; i++) {
            var p = pi(i);
            var notch = raphael.circle(p.x, p.y, 1).attr("fill", "#444");
            axis.push(notch);
            ticks.push(notch);
            // Raphael 0.6.4 does not align labels properly in IE
            var ticklabel = raphael.text(p.x, p.y, labels[i]).attr("fill", "#000");
            axis.push(ticklabel);
            if (Raphael.type != "VML" || Raphael.version != "0.6.4") {
                align(ticklabel);
            }
            ticklabels.push(ticklabel);
        }
        Graf.Obj.call(this, parent, "axis", axis, attrs);
        this.scale = function() {
            return scale;
        };
        this.position = function(i) {
            return p(i);
        };
        this.labels = function() {
            return ticklabels;
        };
        this.label = function(i) {
            return ticklabels[i];
        };
        this.ticks = function() {
            return ticks;
        };
        this.tick = function(i) {
            return ticks[i];
        };
    };
    
    Graf.Gridlines = function(raphael, parent, cx, cy, w, h, gridw, gridh, params) {
        if (!params) params = {};
        var attrs = {
            cx: cx,
            cy: cy,
            w: w,
            h: h,
            gridw: gridw,
            gridh: gridh
            // TODO: add support for orientation
        };
        var grid = raphael.set();
        var gridattrs = { stroke: "#000", "stroke-dasharray": ". "};
        var bg = raphael.rect(attrs.cx, attrs.cy, w, h).attr({stroke: "none"});
        grid.push(bg);
        var hlines = raphael.set();
        grid.push(hlines);
        var vlines = raphael.set();
        grid.push(vlines);
        for (var i = gridw; i <= w; i += gridw) {
            vlines.push(raphael.path("M" + (attrs.cx+i) + " " + attrs.cy + " l0 " + h).attr(gridattrs));
        }
        for (var i = gridh; i <= h; i += gridh) {
            hlines.push(raphael.path("M" + attrs.cx + " " + (attrs.cy+h-i) + " l" + w + " 0").attr(gridattrs));
        }
        Graf.Obj.call(this, parent, "gridlines", grid, attrs);
        this.bg = function() {
            return bg;
        }
        this.vlines = function() {
            return vlines;
        };
        this.hlines = function() {
            return hlines;
        };
    };
    
    Graf.Gridchart = function(raphael, parent, x, y, w, h, type, data, labels, params) {
        if (!params) params = {};
        var attrs = {
            x: x,
            y: y,
            w: w,
            h: h,
            type: type,
            min: params["min"] || 0,
            max: params["max"],
            overrun: params["overrun"] || 0.1,
            labeloverrun: params["labeloverrun"] || 0,
            fill: params["fill"] || "auto",
            stroke: params["stroke"] || ((type == "line") ? "auto" : "#000"),
            barwidth: params["barwidth"] || 0.8,
            numticks: params["numticks"] || 5,
            stacked: params["stacked"] || false
            // TODO: add support for orientation
        }
        var values = convertData(data);
        if (attrs.max == undefined) {
            for (var i in values) {
                var dataset = values[i];
                for (var k in dataset) {
                    attrs.max = (attrs.max == undefined) ? dataset[k] : Math.max(attrs.max, dataset[k]);
                }
            }
            attrs.max = attrs.max.toPrecision(2);
        }
        if (attrs.min == "auto") {
            for (var i in values) {
                var dataset = values[i];
                for (var k in dataset) {
                    attrs.min = (attrs.min == "auto") ? dataset[k] : Math.min(attrs.min, dataset[k]);
                }
            }
            attrs.min = parseFloat(attrs.min.toPrecision(2));
        }
        var num_values = values[0].length;
        var num_datasets = values.length;
        var barwidth = attrs.barwidth * w / (num_values * num_datasets);
        var num_sections = (attrs.type == "bar") ? num_values : (num_values - 1);
        var strings = [];
        var datasets = [];
        var grid_h = h * (1-attrs.overrun);
        var grid_w = w * (1-attrs.labeloverrun);
        
        var svg = raphael.set();
        Graf.Obj.call(this, parent, "gridchart", svg, attrs);
        var grid = new Graf.Gridlines(raphael, this, x, y, w, h, 
                             grid_w / num_sections, grid_h / attrs.numticks);
        svg.push(grid);
        if (attrs.type == "bar") grid.vlines().hide();
        var ticks = [];
        for (var i = 0; i <= attrs.numticks; i++) {
            var v = attrs.min + (attrs.max - attrs.min) * i / attrs.numticks;
            ticks.push(removeFloatingPointError(v).toString());
        }
        var tickaxis = new Graf.Axis(raphael, this, x, y+h, h, "up", ticks, { overrun: attrs.overrun });
        svg.push(tickaxis);
        var labelparams = {
            mode: (attrs.type == "bar") ? "segment" : "point",
            overrun: attrs.labeloverrun
        };
        var labelaxis = new Graf.Axis(raphael, this, x, y+h, w, "right", labels, labelparams);
        svg.push(labelaxis);
        
        var max = (1+attrs.overrun) * attrs.max;
        for (var i in values) {
            var type = attrs.type;
            var datafill = color(attrs.fill),
                datastroke = color(attrs.stroke);
            if (type == "line") {
                var dsparams = {
                    min: attrs.min,
                    path: { stroke: datastroke },
                    points: { fill: "#444" }
                };
                var dataset = new Graf.LineDataSet(raphael, this, x, y, grid_w, h, max, values[i], dsparams);
                svg.push(dataset);
                datasets.push(dataset);
            } else if (type == "area") {
                var dsparams = {
                    min: attrs.min,
                    area: { fill: datafill },
                    path: { stroke: datastroke },
                    points: { fill: "#444" }
                };
                var dataset = new Graf.AreaDataSet(raphael, this, x, y, grid_w, h, max, values[i], dsparams);
                svg.push(dataset);
                datasets.push(dataset);
            } else if (type == "bar") {
                var dsparams = {
                    min: attrs.min,
                    rect: { fill: datafill, stroke: datastroke } 
                };
                var x0 = x + 0.5 * (w / num_values - barwidth * num_datasets) + barwidth*i;
                var dataset = new Graf.BarDataSet(raphael, this, x0, y, grid_w, h, barwidth, max, values[i], dsparams);
                svg.push(dataset);
                datasets.push(dataset);
            }
        }
        this.datasets = function() {
            return datasets;
        };
        this.dataset = function(i) {
            return datasets[i];
        };
        this.grid = function() {
            return grid;
        };
        this.axes = function() {
            return { x: labelaxis, y: tickaxis };
        };
    };
    
    // ===================================================
    // Graf
    // ===================================================
    
    Graf.pie = function(cx, cy, r, data, labels, params) {
        return new Graf.Pie(this, null, cx, cy, r, data, labels, params);
    };
    Graf.gridchart = function(x, y, w, h, type, data, labels, params) {
        return new Graf.Gridchart(this, null, x, y, w, h, type, data, labels, params);
    }
    
    return Graf;
})();
