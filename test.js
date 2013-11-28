var omgsvg = require('./omgsvg.js');

var cases = [
  ["M123 345", {}, [[123, 345]]],
  ["M123.5 345.9", {}, [[123.5, 345.9]]],
  ["M.5.9", {}, [[0.5, 0.9]]],
  ["M5. 9.", {}, [[5, 9]]],
  ["M0,0l5-.6E+2", {}, [[0, 0, 5, -60.0]]],
  ["M0 0c5 5 10 5 15 0", {tolerance: 1}, [[0,0,2.5,2.5,5,3.75,7.5,3.75,10,3.75,12.5,2.5,15,0]]],
];

for (var i = 0, il = cases.length; i < il; ++i) {
  var c = cases[i];
  var paths = omgsvg.constructPolygonFromSVGPath(c[0], c[1]);

  /*
  if (paths.length !== c[1].lengths) throw "failed: " + c[0];
  for (var j = 0, jl = paths.length; j < jl; ++j) {
    var p0 = paths[j]; // Actual.
    var p1 = c[1][j];  // Expected.
    if (p1.length !== p1.length) throw "failed: " + c[0];
  }
  */

  // Lazy...
  var expected = JSON.stringify(c[2]);
  var actual = JSON.stringify(paths);
  if (expected !== actual)
    throw 'failed: ' + c[0] + ' ' + expected + ' ' + actual;
}
