// (c) Dean McNamee <dean@gmail.com>, 2012.
//
// https://github.com/deanm/omgsvg
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to
// deal in the Software without restriction, including without limitation the
// rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
// sell copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
// FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
// IN THE SOFTWARE.

function subdivCubic(p0x, p0y, p1x, p1y, p2x, p2y, p3x, p3y, t) {
  // Using the naming convention of 00, 10, xy where x is the iteration step
  // of the recursive and y is the point (each step one less).  The first
  // p0 would be 00, p1 would be 01, etc.

  var x10 = p0x + (p1x-p0x)*t;
  var x11 = p1x + (p2x-p1x)*t;
  var x12 = p2x + (p3x-p2x)*t;
  var x20 = x10 + (x11-x10)*t;
  var x21 = x11 + (x12-x11)*t;
  var x30 = x20 + (x21-x20)*t;  // Point on the curve at |t|.
  var y10 = p0y + (p1y-p0y)*t;
  var y11 = p1y + (p2y-p1y)*t;
  var y12 = p2y + (p3y-p2y)*t;
  var y20 = y10 + (y11-y10)*t;
  var y21 = y11 + (y12-y11)*t;
  var y30 = y20 + (y21-y20)*t;  // Point on the curve at |t|.

  return [p0x, p0y, x10, y10, x20, y20, x30, y30,
          x30, y30, x21, y21, x12, y12, p3x, p3y];
}

// Subdivide a bezier |subdiv_level| times (recursively).
// Appends the points to |points| in place.
function doCubicSubdiv(p0x, p0y, p1x, p1y, p2x, p2y, p3x, p3y,
                       points, subdiv_level) {
  var bezs = [p0x, p0y, p1x, p1y, p2x, p2y, p3x, p3y];

  for (var j = 0; j < subdiv_level; ++j) {
    var new_bezs = [ ];
    for (var i = 7, il = bezs.length; i < il; i += 8) {
      // Subdivide one cubic bezier (4 control points) in half, producing
      // 8 new control points (well, the original endpoints will remain).
      var n = subdivCubic(bezs[i-7], bezs[i-6], bezs[i-5], bezs[i-4],
                          bezs[i-3], bezs[i-2], bezs[i-1], bezs[i], 0.5);
      new_bezs.push(n[0], n[1],  n[2] , n[3],  n[4],  n[5],  n[6],  n[7],
                    n[8], n[9], n[10], n[11], n[12], n[13], n[14], n[15]);
    }
    bezs = new_bezs;
  }

  for (var i = 7, il = bezs.length; i < il; i += 8) {
    // Assume start point is already pushed (bezs[j-7] and bezs[j-6]).
    points.push(bezs[i-5], bezs[i-4], bezs[i-3], bezs[i-2], bezs[i-1], bezs[i]);
  }

  return points;
}

function doCubicSubdivRel(p0x, p0y, p1x, p1y, p2x, p2y, p3x, p3y,
                          points, subdiv_level) {
  return doCubicSubdiv(p0x, p0y,
                       p0x+p1x,p0y+p1y,
                       p0x+p2x, p0y+p2y,
                       p0x+p3x, p0y+p3y,
                       points, subdiv_level);
}

function doQuadSubdiv(p0x, p0y, p1x, p1y, p2x, p2y, points, subdiv_level) {
  // TODO(deanm): subdivQuadratic... currently the code just up-orders
  // quadratic beziers to cubics.
  return doCubicSubdiv(p0x, p0y,
                       p0x + 2/3 * (p1x-p0x), p0y + 2/3 * (p1y-p0y),
                       p2x + 2/3 * (p1x-p2x), p2y + 2/3 * (p1y-p2y),
                       p2x, p2y, points, subdiv_level);
}

function doQuadSubdivRel(p0x, p0y, p1x, p1y, p2x, p2y, points, subdiv_level) {
  return doQuadSubdiv(p0x, p0y,
                      p0x+p1x, p0y+p1y,
                      p0x+p2x, p0y+p2y,
                      points, subdiv_level);
}

function SVGPathParser(svgstr) {
  var p = -1;
  var pl = svgstr.length;

  this.cur_cmd = function() {
    return p >= 0 && p < pl ? svgstr[p] : null;
  };

  function find_cmd(s) {
    while (s < pl) {
      switch (svgstr[s]) {
        case '0': case '1': case '2': case '3': case '4':
        case '5': case '6': case '7': case '8': case '9':
        case '+': case '-': case '.':
        case 'e': case 'E':
        case ',': case ' ': case '\t': case '\r': case '\n':
          ++s; break;
        default:
          return s;
      }
    }

    return null;
  }

  this.seek_next_cmd = function() {
    p = find_cmd(p + 1);
    return p !== null;
  };

  this.parse_cur_args = function() {
    var end = find_cmd(p + 1);
    var argpart = svgstr.substr(p + 1, (end === null ? pl : end) - p - 1);

    // NOTE(deanm): SVG numbers can also be in exponential notation, follow the
    // grammar from the SVG spec:
    //
    // http://www.w3.org/TR/SVG/paths.html
    //
    // integer-constant:
    //   digit-sequence
    // number:
    //   sign? integer-constant
    //   | sign? floating-point-constant
    // floating-point-constant:
    //   fractional-constant exponent?
    //   | digit-sequence exponent
    // fractional-constant:
    //   digit-sequence? "." digit-sequence
    //   | digit-sequence "."
    // exponent:
    //   ( "e" | "E" ) sign? digit-sequence
    // sign:
    //   "+" | "-"
    // digit-sequence:
    //   digit
    //   | digit digit-sequence
    //
    // NOTE(deanm): Handling of leading space/commas not conformant but should
    // work well enough.  If we simplify the above BNF just for the case of
    // number, we get something more like:
    //
    // number:
    //   sign? (digit-sequence | fractional-constant) exponent?
    //
    // NOTE(deanm): At least how I looked at the BNF there is no special
    // handling of leading zeros, so 000.3 should be for example.  I believe
    // this would different form the JSON spec for numbers, for example.  But
    // I think parseFloat should be okay with it, even though it's not a valid
    // JavaScript numerical constant.
    //
    var num_re = /[+-]?(?:[0-9]+\.?|[0-9]*\.[0-9]+)(?:[eE][+-]?[0-9]+)?/g;

    var m;
    var args = [ ];
    while ((m = num_re.exec(argpart)) !== null) {
      args.push(parseFloat(m[0]));
    }

    return args;
  };
}

// Contruct a series of straight line polygons from an SVG path string.
// Returns an array of arrays, one for each subpath.  Paths are represented
// as a flat array of [x, y, x, y, ...].
//
// |svgstr|: SVG path string, ex: "M123 456 L56 18".
// |subdiv_level|: How many times to subdivide beziers (recursive).
function constructPolygonFromSVGPath(svgstr, subdiv_level) {
  var paths = [ ];
  var points = null;

  var pp = new SVGPathParser(svgstr);

  var last_control_x = null, last_control_y = null;

  var curx = 0, cury = 0;

  while (pp.seek_next_cmd()) {
    var cmd = pp.cur_cmd();
    var args = pp.parse_cur_args();

    switch (cmd) {
      case 'M':  // Move, also handle extra arguments like they are an L.
        var points = [ ];
        paths.push(points);
        curx = args[0]; cury = args[1];
        for (var j = 1; j < args.length; j += 2) {
          points.push(args[j-1], args[j]);
        }
        break;
      case 'm':  // Move relative.
        var points = [ ];
        paths.push(points);
        for (var j = 1; j < args.length; j += 2) {
          curx += args[j-1]; cury += args[j];
          points.push(curx, cury);
        }
        break;
      case 'c':  // Relative cubic.
        for (var j = 5; j < args.length; j += 6) {
          doCubicSubdivRel(curx, cury,
                           args[j-5], args[j-4], args[j-3], args[j-2],
                           args[j-1], args[j], points, subdiv_level);
          last_control_x = curx + args[j-3]; last_control_y = cury + args[j-2];
          curx += args[j-1]; cury += args[j];
        }
        break;
      case 'C':  // Absolute cubic.
        for (var j = 5; j < args.length; j += 6) {
          doCubicSubdiv(curx, cury,
                        args[j-5], args[j-4], args[j-3], args[j-2],
                        args[j-1], args[j], points, subdiv_level);
          last_control_x = args[j-3]; last_control_y = args[j-2];
          curx = args[j-1]; cury = args[j];
        }
        break;
      case 'q':  // Relative quadratic.
        for (var j = 3; j < args.length; j += 4) {
          doQuadSubdivRel(curx, cury,
                          args[j-3], args[j-2],
                          args[j-1], args[j],
                          points, subdiv_level);
          last_control_x = curx + args[j-3]; last_control_y = cury + args[j-2];
          curx += args[j-1]; cury += args[j];
        }
        break;
      case 'Q':  // Absolute quadratic.
        for (var j = 3; j < args.length; j += 4) {
          doQuadSubdiv(curx, cury,
                       args[j-3], args[j-2], args[j-1], args[j],
                       points, subdiv_level);
          last_control_x = args[j-3]; last_control_y = args[j-2];
          curx = args[j-1]; cury = args[j];
        }
        break;
      case 'l':  // Relative line.
        //if (args[0] === 0 && args[1] === 0) break;
        for (var j = 1; j < args.length; j += 2) {
          curx += args[j-1]; cury += args[j];
          points.push(curx, cury);
        }
        break;
      case 'h':  // Relative horizontal.
        if (args.length !== 1) throw args.join(',');
        curx += args[0];
        points.push(curx, cury);
        break;
      case 'H':  // Absolute horizontal.
        if (args.length !== 1) throw args.join(',');
        curx = args[0];
        points.push(curx, cury);
        break;
      case 'Z': case 'z':  // Close.
        //if (args.length !== 0) throw args.join(',');
        //points.push(points[0]); points.push(points[1]);
        break;
      case 's':  // Relative smooth.
        if (args.length !== 4) throw args.join(',');
        // Reflect previous control point across endpoint.  Assumes previous
        // command was a c or s (see comment in w3c spec).
        // Since it's a relative command, makes the reflection math even easier.
        var rx1 = curx - last_control_x, ry1 = cury - last_control_y;
        doCubicSubdivRel(curx, cury, rx1, ry1, args[0], args[1],
                         args[2], args[3], points, subdiv_level);
        last_control_x = curx + args[0], last_control_y = cury + args[1];
        curx += args[2]; cury += args[3];
        break;
      case 'S':  // Absolute smooth.
        if (args.length !== 4) throw args.join(',');
        var rx1 = curx - last_control_x, ry1 = cury - last_control_y;
        doCubicSubdiv(curx, cury, curx+rx1, cury+ry1, args[0], args[1],
                         args[2], args[3], points, subdiv_level);
        last_control_x = args[0], last_control_y = args[1];
        curx = args[2]; cury = args[3];
        break;
      default:
        console.log('Unknown command: ' + cmd);
        break;
    }
  }

  return paths;
}

try {  // Module JS
  exports.SVGPathParser = SVGPathParser;
  exports.constructPolygonFromSVGPath = constructPolygonFromSVGPath;
} catch(e) { }
