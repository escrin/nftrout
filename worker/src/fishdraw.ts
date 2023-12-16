type Pair = [number, number];
type Polyline = Array<Pair>;

const HATX = 410.435;
const HATY = 285.174;
const HAT_RATIO = HATY / HATX;
const santaHat = (x: number, y: number, w: number, f: boolean) => {
  const h = HAT_RATIO * w;
  const txform = f ? `scale(-1, 1), translate(-${HATX}, 0)` : '';
  return `<svg x="${x}" y="${y}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${HATX} ${HATY}" width="${w}" height="${h}" version="1.0"><g transform="${txform}"><path d="M234.103 28.783c-28.1 7.734-56.904 23.115-77.167 38.007-20.262 14.892-73.19 52.416-85.274 64.307-11.716 11.528-25.555 15.55-31.611 29.756-2.335 5.479 15.837 22.005 19.398 23.721 9.24 4.453 24.304-3.443 31.178-3.914 22.307-1.53 45.167-4.499 67.76 10.792-4.18 4.221 2.458-.323-6.088 36.694-3.013 13.053-9.599 46.919-1.507 53.38 8.04 6.42 12.95-18.605 20.937-14.774-.004.006-.002.021-.005.026l-.004.027c0 .004-.006.023-.005.026.003.003.021.003.025.005a.427.427 0 0 0 .129-.002c.015.007.035.002.05.01.056.027.108.059.165.086l.047-.127c3.781-.978 33.263-13.966 60.176-8.743 15.172 2.944 39.37-5.31 53.29-9.615 22.076-6.828 53.068-12.999 72.728-13.351 14.483-.26 27.587-8.46 41.52-9.415 8.221-.564.6-27.066.43-29.866-.817-13.455-17.566-34.13-26.192-52.503-8.626-18.374-23.082-41.697-39.004-59.986-15.921-18.29-37.401-41.972-52.525-49.259-15.124-7.287-17.953-13.675-48.451-5.282z" style="fill:#d00000;fill-opacity:1;fill-rule:evenodd;stroke:#000;stroke-width:.83349466px;stroke-linecap:butt;stroke-linejoin:miter;stroke-opacity:1" transform="translate(-8.903 -24.385)"/><path d="M166.956 93.344c-18.233 4.416-33.848 62.691-56.32 72.822-14.697 6.625-54.748 16.692-51.187 18.408 9.24 4.453 24.304-3.443 31.178-3.914 22.307-1.53 45.167-4.499 67.76 10.792-4.18 4.221 2.458-.323-6.088 36.694-3.013 13.053-9.599 46.919-1.507 53.38 8.04 6.42 12.95-18.605 20.937-14.774-.004.006-.002.021-.005.026l-.004.027c0 .004-.006.023-.005.026.003.003.021.003.025.005a.427.427 0 0 0 .129-.002c.015.007.035.002.05.01.056.027.108.059.165.086l.047-.127c3.781-.978 33.263-13.966 60.176-8.743 15.172 2.944 39.37-5.31 53.29-9.615 22.076-6.828 53.068-12.999 72.728-13.351 14.483-.26 27.587-8.46 41.52-9.415 8.221-.564-51.084 4.52-27.449-12.576 10.486-7.584-104.984 15.808-149.314-34.777-43.895-50.088-37.455-89.505-56.126-84.982" style="opacity:.10112359;fill:#0e0000;fill-opacity:1;fill-rule:evenodd;stroke:none;stroke-width:1px;stroke-linecap:butt;stroke-linejoin:miter;stroke-opacity:1" transform="translate(-8.903 -24.385)"/><path d="M41.923 154.632c3.551 2.353 27.398 32.517 30.215 30.406.34-3.33-2.44-4.642-4.397-5.022 2.62-3.33 3.114-6.811-1.432-7.11-5.04-.89-10.543-1.514-5.133-6.936 2.498-3.039-.168-8.435-1.701-11.18-4.03-2.176-7.066-6.114-8.718-8.791" style="opacity:.26966289;fill:#000;fill-opacity:1;fill-rule:evenodd;stroke:#000;stroke-width:.83016068;stroke-linecap:butt;stroke-linejoin:miter;stroke-miterlimit:4;stroke-dasharray:none;stroke-opacity:1" transform="translate(-8.903 -24.385)"/><path d="M365.597 219.586c-7.45-2.642-16.8-5.694-23.39-5.287-4.524-3.822-7.997.888-11.918 2.142-.658-7.36-11.51 3.112-16.291 3.172-3.395 1.948-1.055-5.8-7.134-2.853-7.557.714-12.232 1.233-17.839 3.66-1.346 8.013-13.449 12.527-15.26 3.745-6.599 2.871-18.869 8.441-18.948-.642-10.565 8.194-10.9 15.599-21.214 19.553.912-7.092-22.37-10.908-25.545-3.465-6.39 2.573 1.33-9.32-7.904-6.052-10.4-3.024-4.347 17.935-25.554 9.366-11.808-.38-5.269 16.72-13.061 23.882-2.076 7.533-11.084-2.624-14.73-2.06.849 11.927 3.408 7.882.72 15.997-1.604 10.165-3.751 15.255 7.432 17.372 3.62-4.903-.182-2.829.628 6.218 6.457-1.88 14.946-12.64 14.075-1.582 4.382-6.673 18.254-10.151 18.08-17.339 7.021.737 14.902 8.58 20.83-.953 5.95-7.041 14.504-10.307 14.594-4.868 7.233 6.756 7.957 5.387 15.478 3.667-1.938-8.711 17.599-.598 7.282-9.271 4.098-4.104 15.188-6.502 21.597-5.076 5.669 8.254 22.944 8.937 25.631-1.747.564-8.404 13.683-11.279 18.588-5.468 8.53-7.479 21.984 3.388 29.324-2.344-6.598-8.563 9.324-14.158 12.298-7.593 5.841-3.137 11.278-14.423 17.668-6.343 7.35-2.395 16.325-5.726 22.542-8.222 4.667 7.693 16.748-.221 11.51-9.532-2.834-6.65 9.31 3.274 6.004-5.164-3.76-9.077-9.042-21.692-15.514-21.275-8.812-2.201-14.037 3.745-14.403 12.16-.111-6.14-10.522-.154-15.983 2.073l-2.994.712-3.577-2.523" style="opacity:.294045;fill:#000;fill-opacity:1;fill-rule:evenodd;stroke:#000;stroke-width:.60142648px;stroke-linecap:butt;stroke-linejoin:miter;stroke-opacity:1" transform="translate(-8.903 -24.385)"/><path d="M370.524 221.83c-7.451-2.642-14.356-3.013-20.945-2.606-4.525-3.822-9.895-2.569-13.815-1.315-.658-7.36-9.614 6.569-14.395 6.63-3.394 1.947-1.055-5.801-7.133-2.854-7.558.714-16.32-3.972-21.926-1.545-1.346 8.013-13.449 12.527-15.26 3.744-6.599 2.872-14.782 13.647-14.862 4.564-12.384-.543-17.69 11.633-28.003 15.588.912-7.092-15.581-6.943-18.755.5-6.39 2.573-1.7-13.438-10.933-10.17-10.4-3.023-10.117 17.698-22.525 13.484-11.808-.38-10.159 11.358-17.951 18.52-2.077 7.533-6.194 2.738-9.84 3.302 6 8.514-18.393 6.74-11.151 19.87-1.605 10.166.848 17.472 12.031 19.59 3.621-4.904 7.09-8.92 7.9.127 6.457-1.88 14.945-12.64 14.074-1.582 4.382-6.673 18.254-10.151 18.08-17.339 7.022.737 14.902 8.58 20.83-.953 5.95-7.041 6.933-1.296 7.023 4.142 7.234 6.757 15.528-3.623 23.05-5.343-1.938-8.711 17.598-.598 7.282-9.271 4.097-4.104 15.187-6.502 21.596-5.076 5.623 5.334 22.944 8.937 25.632-1.747.564-8.404 13.682-11.279 18.587-5.468 8.53-7.479 21.984 3.388 29.324-2.344-6.597-8.563 9.325-14.158 12.298-7.593 5.842-3.137 11.278-14.423 17.668-6.343 7.35-2.395 16.325-5.726 22.543-8.222 4.666 7.693 16.747-.221 11.51-9.532-2.835-6.65 9.31 3.274 6.004-5.164.074-9.656-3.563-24.6-15.514-21.275-8.812-2.201-14.038 3.745-14.403 12.16-.112-6.14-14.026-3.923-19.487-1.696l-1.789.946-1.278 1.012" style="fill:#fff;fill-opacity:1;fill-rule:evenodd;stroke:#000;stroke-width:.60142648px;stroke-linecap:butt;stroke-linejoin:miter;stroke-opacity:1" transform="translate(-8.903 -24.385)"/><path d="M155.68 210.888c3.14-40.847 23.785-59.45 20.151-92.12-2.148-19.31-19.537-4.673-13.87 13.441" style="fill:none;fill-opacity:.75;fill-rule:evenodd;stroke:#000;stroke-width:.83349466px;stroke-linecap:butt;stroke-linejoin:miter;stroke-opacity:1" transform="translate(-8.903 -24.385)"/><path d="M163.978 266.619c-2.076 7.532-6.194 2.737-9.84 3.301 6 8.514-18.392 6.74-11.15 19.87-1.605 10.166.848 17.472 12.03 19.59 3.622-4.904 7.09-8.92 7.9.126 6.457-1.88 14.946-12.64 14.075-1.58 4.382-6.674 18.254-10.152 18.08-17.34 7.021.737 14.565 7.35 20.493-2.183 5.95-7.041 7.27-.066 7.36 5.372 7.233 6.757 15.528-3.623 23.049-5.343-1.938-8.711 8.866-1.545 7.282-9.272-1.037-5.06 33.645-3.562 28.657-8.51-14.906-14.787-38.191 7.492-41.56 6.07-3.369-1.422-7.091-.56-2.385-2.72 4.707-2.159-6.742 1.393-16.277-1.993-9.535-3.387-16.515.894-17.152 9.342-7.181-4.466-7.696.607-18.885 3.718 7.13-10.422-12.6-2.768-12.6-2.768s3.438-11.428-2.739-9.92c3.321-5.964-.365-7.802-.365-7.802s1.82-5.121-5.973 2.042" style="opacity:.11235956;fill:#000;fill-opacity:1;fill-rule:evenodd;stroke:none;stroke-width:.7215721px;stroke-linecap:butt;stroke-linejoin:miter;stroke-opacity:1" transform="translate(-8.903 -24.385)"/><path d="M46.945 146.245c-1.302-2.318-5.358-2.957-5.88-4.923.907-2.283-2.659-.627-3.361-1.882-4.195 3.434-9.985 4.92-13.093 9.642 1.653-.362 1.649-2.778-.157-.996-3.401 1.69-6.688 4.658-5.41 8.893.31 2.173-2.425 4.043.914 4.558-.435 3.48-5.655 3.333-5.658 6.404 1.155 3.35.647 6.84-2.1 9.19-2.719 2.541-1.6 6.283-1.5 9.37-1.367 2.066-2.137 3.986-.335 5.953.382 3.548 3.327 5.898 3.349 9.59 1.24 1.934 3.727 1.815 4.997 4.001 3.71.316 3.983 5.497 7.517 6.215 3.036.99 6.629.304 9.365 1.03 2.243 1.82 4.819 3.087 7.643 3.598 3.551 2.26 4.758-3.365 6.907-5.176.112-2.832 2.146-3.052 3.509-.668 3.1 2.103 6.314-1.518 8.537-3.434 2.173-2.369 4.612-4.42 7.032-6.497 3.436-3.878 4.656-9.43 4.464-14.535.34-3.199-2.635-3.376-4.591-3.741.885-2.683 3.113-6.542-1.433-6.83-2.607-.68-8.517-3.593-5.132-6.661 2.498-2.919-.94-6.848-2.474-9.484-2.656-2.114-4.2-5.06-5.85-7.63-3.198-.51-6.195-2.453-7.01-5.846-.854-2.694-.237-.699.033.613" style="fill:#fff;fill-opacity:1;fill-rule:evenodd;stroke:#000;stroke-width:.81360233;stroke-linecap:butt;stroke-linejoin:miter;stroke-miterlimit:4;stroke-dasharray:none;stroke-opacity:1" transform="translate(-8.903 -24.385)"/><path d="M20.405 181.846c-1.601-1.968 4.721-1.041 4.2-3.007.906-2.283-.179-2.378-.882-3.634-4.194 3.434-3.206-4.7-6.314.022 1.652-.362 1.38-6.334-.425-4.551-3.401 1.69-2.68-5.806-2.684-2.735 1.155 3.35.647 6.84-2.1 9.19-2.719 2.541-1.6 6.283-1.5 9.37-1.367 2.066-2.137 3.986-.335 5.953.382 3.548 3.327 5.898 3.349 9.59 1.24 1.934 3.727 1.815 4.997 4.001 3.71.316 3.983 5.497 7.517 6.215 3.036.99 6.629.304 9.365 1.03 2.243 1.82 4.819 3.087 7.643 3.598 3.551 2.26 4.758-3.365 6.907-5.176.112-2.832 2.146-3.052 3.509-.668 3.1 2.103 6.314-1.518 8.537-3.434 2.173-2.369-8.346.36-5.926-1.717 3.436-3.879-7.752 5.413-7.945.308.34-3.2-12.37 4.07-9.678-1.554.884-2.682 1.536-.748-3.01-1.035-2.607-.68-9.804-5.494-6.419-8.562 2.498-2.919-1.342.456-2.876-2.18-2.656-2.114-.96-.95-2.611-3.521-3.198-.51-1.792-1.817-2.607-5.21-1.383 3.98-.982-3.604-.712-2.293" style="opacity:.0955056;fill:#000;fill-opacity:1;fill-rule:evenodd;stroke:none;stroke-width:.99599999;stroke-linecap:butt;stroke-linejoin:miter;stroke-miterlimit:4;stroke-dasharray:none;stroke-opacity:1" transform="translate(-8.903 -24.385)"/><path d="M157.67 192.362s13.145-33.512 16.303-46.882c2.955-12.509 2.573-31.603-1.853-35.137-4.426-3.534-10.247 2.578-10.86 9.816-.614 7.238-1.128 9.061 1.843 22.867 1.347 6.259.674 21.093-1.157 28.095-1.831 7.001-5.827 22.946-4.276 21.24" style="fill:#000;fill-opacity:.22346371;fill-rule:evenodd;stroke:none;stroke-width:1px;stroke-linecap:butt;stroke-linejoin:miter;stroke-opacity:1" transform="translate(-8.903 -24.385)"/></g></svg>`;
};
const snowflake = (x: number, y: number, s: number, r: number) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 397 411" x="${x}" y="${y}" width="${s}" height="${s}" version="1.0"><path transform="rotate(${r} 198.5 205.5)" d="M183.313 43.094v40.719l-30.594-17.688-15.531 26.813 46.125 26.718v60.094L131.5 149.813l-.094-53.532-31 .063.063 35.562-35.375-20.437-15.5 26.844 35.281 20.375-30.625 17.625 15.438 26.875 46.218-26.594 52 30.031-51.812 29.906-46.406-26.687-15.438 26.875 30.813 17.75-35.375 20.406 15.5 26.844 35.28-20.375-.062 35.344 31 .062.094-53.312 52-30v59.812l-46.312 26.844 15.53 26.812 30.782-17.812v40.844h31v-40.72l30.594 17.688 15.531-26.812-46.125-26.719v-60.094l51.813 29.938.093 53.531 31-.062-.062-35.563 35.375 20.438 15.5-26.844-35.281-20.375 30.625-17.625-15.438-26.875-46.187 26.594-52.032-30.032 51.844-29.937 46.375 26.719 15.438-26.875-30.813-17.75 35.375-20.407-15.5-26.844-35.281 20.376.062-35.344-31-.063-.094 53.313-52 30V119.78l46.313-26.844-15.531-26.812-30.781 17.813V43.094z" fill="snow" stroke="gray" /></svg>`;

// Source: https://raw.githubusercontent.com/LingDong-/fishdraw/1b31d55/fishdraw.js
let jsr = 0x5eed;
let { PI } = Math;
function rand() {
  jsr ^= jsr << 17;
  jsr ^= jsr >> 13;
  jsr ^= jsr << 5;
  return (jsr >>> 0) / 4294967295;
}

var PERLIN_YWRAPB = 4;
var PERLIN_YWRAP = 1 << PERLIN_YWRAPB;
var PERLIN_ZWRAPB = 8;
var PERLIN_ZWRAP = 1 << PERLIN_ZWRAPB;
var PERLIN_SIZE = 4095;
var perlin_octaves = 4;
var perlin_amp_falloff = 0.5;
var scaled_cosine = function (i: number) {
  return 0.5 * (1.0 - Math.cos(i * PI));
};
var perlin: number[];
let noise = function (x: number, y?: number, z?: number) {
  y = y || 0;
  z = z || 0;
  if (perlin == null) {
    perlin = new Array(PERLIN_SIZE + 1);
    for (var i = 0; i < PERLIN_SIZE + 1; i++) {
      perlin[i] = rand();
    }
  }
  if (x < 0) {
    x = -x;
  }
  if (y < 0) {
    y = -y;
  }
  if (z < 0) {
    z = -z;
  }
  var xi = Math.floor(x),
    yi = Math.floor(y),
    zi = Math.floor(z);
  var xf = x - xi;
  var yf = y - yi;
  var zf = z - zi;
  var rxf, ryf;
  var r = 0;
  var ampl = 0.5;
  var n1, n2, n3;
  for (var o = 0; o < perlin_octaves; o++) {
    var of = xi + (yi << PERLIN_YWRAPB) + (zi << PERLIN_ZWRAPB);
    rxf = scaled_cosine(xf);
    ryf = scaled_cosine(yf);
    n1 = perlin[of & PERLIN_SIZE];
    n1 += rxf * (perlin[(of + 1) & PERLIN_SIZE] - n1);
    n2 = perlin[(of + PERLIN_YWRAP) & PERLIN_SIZE];
    n2 += rxf * (perlin[(of + PERLIN_YWRAP + 1) & PERLIN_SIZE] - n2);
    n1 += ryf * (n2 - n1);
    of += PERLIN_ZWRAP;
    n2 = perlin[of & PERLIN_SIZE];
    n2 += rxf * (perlin[(of + 1) & PERLIN_SIZE] - n2);
    n3 = perlin[(of + PERLIN_YWRAP) & PERLIN_SIZE];
    n3 += rxf * (perlin[(of + PERLIN_YWRAP + 1) & PERLIN_SIZE] - n3);
    n2 += ryf * (n3 - n2);
    n1 += scaled_cosine(zf) * (n2 - n1);
    r += n1 * ampl;
    ampl *= perlin_amp_falloff;
    xi <<= 1;
    xf *= 2;
    yi <<= 1;
    yf *= 2;
    zi <<= 1;
    zf *= 2;
    if (xf >= 1.0) {
      xi++;
      xf--;
    }
    if (yf >= 1.0) {
      yi++;
      yf--;
    }
    if (zf >= 1.0) {
      zi++;
      zf--;
    }
  }
  return r;
};

function dist(x0: number, y0: number, x1: number, y1: number) {
  return Math.hypot(x1 - x0, y1 - y0);
}
function lerp(a: number, b: number, t: number) {
  return a * (1 - t) + b * t;
}
function lerp2d(x0: number, y0: number, x1: number, y1: number, t: number): Pair {
  return [x0 * (1 - t) + x1 * t, y0 * (1 - t) + y1 * t];
}
function get_bbox(points: Polyline) {
  let xmin = Infinity;
  let ymin = Infinity;
  let xmax = -Infinity;
  let ymax = -Infinity;
  for (let i = 0; i < points.length; i++) {
    let [x, y] = points[i];
    xmin = Math.min(xmin, x);
    ymin = Math.min(ymin, y);
    xmax = Math.max(xmax, x);
    ymax = Math.max(ymax, y);
  }
  return { x: xmin, y: ymin, w: xmax - xmin, h: ymax - ymin };
}

function seg_isect(
  p0x: number,
  p0y: number,
  p1x: number,
  p1y: number,
  q0x: number,
  q0y: number,
  q1x: number,
  q1y: number,
  is_ray = false,
) {
  let d0x = p1x - p0x;
  let d0y = p1y - p0y;
  let d1x = q1x - q0x;
  let d1y = q1y - q0y;
  let vc = d0x * d1y - d0y * d1x;
  if (vc == 0) {
    return null;
  }
  let vcn = vc * vc;
  let q0x_p0x = q0x - p0x;
  let q0y_p0y = q0y - p0y;
  let vc_vcn = vc / vcn;
  let t = (q0x_p0x * d1y - q0y_p0y * d1x) * vc_vcn;
  let s = (q0x_p0x * d0y - q0y_p0y * d0x) * vc_vcn;
  if (0 <= t && (is_ray || t < 1) && 0 <= s && s < 1) {
    let ret: {
      t: number;
      s: number;
      side: number | null;
      other: number | null;
      xy: Pair | null;
    } = { t, s, side: null, other: null, xy: null };
    ret.xy = [p1x * t + p0x * (1 - t), p1y * t + p0y * (1 - t)];
    ret.side = pt_in_pl(p0x, p0y, p1x, p1y, q0x, q0y) < 0 ? 1 : -1;
    return ret;
  }
  return null;
}
function pt_in_pl(x: number, y: number, x0: number, y0: number, x1: number, y1: number) {
  let dx = x1 - x0;
  let dy = y1 - y0;
  let e = (x - x0) * dy - (y - y0) * dx;
  return e;
}

function poly_bridge(poly0: Polyline, poly1: Polyline) {
  let dmin = Infinity;
  let imin = null;
  for (let i = 0; i < poly0.length; i++) {
    for (let j = 0; j < poly1.length; j++) {
      let [x0, y0] = poly0[i];
      let [x1, y1] = poly1[j];
      let dx = x0 - x1;
      let dy = y0 - y1;
      let d2 = dx * dx + dy * dy;
      if (d2 < dmin) {
        dmin = d2;
        imin = [i, j];
      }
    }
  }
  let u = poly0
    .slice(0, imin![0]!)
    .concat(poly1.slice(imin![1]))
    .concat(poly1.slice(0, imin![1]))
    .concat(poly0.slice(imin![0]));
  return u;
}

function poly_union(poly0: Polyline, poly1: Polyline, self_isect = false): any {
  let verts0 = poly0.map((xy) => ({ xy, isects: [], isects_map: {} }));
  let verts1 = poly1.map((xy) => ({ xy, isects: [], isects_map: {} }));

  function pair_key(...args: any[]) {
    return Array.from(args).join(',');
  }

  let has_isect = false;

  function build_vertices(poly: Polyline, other: Polyline, out: any, oout: any, idx: number) {
    let n = poly.length;
    let m = other.length;
    if (self_isect) {
      for (let i = 0; i < n; i++) {
        let id = pair_key(idx, i);
        let p = out[i];
        let i1 = (i + 1 + n) % n;
        let a = poly[i];
        let b = poly[i1];
        for (let j = 0; j < n; j++) {
          let jd = pair_key(idx, j);
          let j1 = (j + 1 + n) % n;
          if (i == j || i == j1 || i1 == j || i1 == j1) {
            continue;
          }
          let c = poly[j];
          let d = poly[j1];
          let xx: any;
          let ox = out[j].isects_map[id];
          if (ox) {
            xx = {
              t: ox.s,
              s: ox.t,
              xy: ox.xy,
              other: null,
              side: pt_in_pl(...a, ...b, ...c) < 0 ? 1 : -1,
            };
          } else {
            xx = seg_isect(...a, ...b, ...c, ...d);
          }
          if (xx) {
            xx.other = j;
            xx.jump = false;
            p.isects.push(xx);
            p.isects_map[jd] = xx;
          }
        }
      }
    }

    for (let i = 0; i < n; i++) {
      let id = pair_key(idx, i);
      let p = out[i];
      let i1 = (i + 1 + n) % n;
      let a = poly[i];
      let b = poly[i1];
      for (let j = 0; j < m; j++) {
        let jd = pair_key(1 - idx, j);
        let j1 = (j + 1 + m) % m;
        let c = other[j];
        let d = other[j1];
        let xx: any;

        let ox = oout[j].isects_map[id];
        if (ox) {
          xx = {
            t: ox.s,
            s: ox.t,
            xy: ox.xy,
            other: null,
            side: pt_in_pl(...a, ...b, ...c) < 0 ? 1 : -1,
          };
        } else {
          xx = seg_isect(...a, ...b, ...c, ...d);
        }
        if (xx) {
          has_isect = true;
          xx.other = j;
          xx.jump = true;
          p.isects.push(xx);
          p.isects_map[jd] = xx;
        }
      }
      p.isects.sort((a2: any, b2: any) => a2.t - b2.t);
    }
  }
  build_vertices(poly0, poly1, verts0, verts1, 0);
  build_vertices(poly1, poly0, verts1, verts0, 1);

  if (!has_isect) {
    if (!self_isect) {
      return poly_bridge(poly0, poly1);
    } else {
      return poly_union(poly_bridge(poly0, poly1), [], true);
    }
  }

  let isect_mir: any = {};
  function mirror_isects(verts0: any, verts1: any, idx: number) {
    let n = verts0.length;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < verts0[i].isects.length; j++) {
        let id = pair_key(idx, i, j);
        let { jump } = verts0[i].isects[j];
        let jd = jump ? 1 - idx : idx;
        let k = verts0[i].isects[j].other;
        let z = (jump ? verts1 : verts0)[k].isects.findIndex(
          (x: any) => x.jump == jump && x.other == i,
        );
        isect_mir[id] = [jd, k, z];
      }
    }
  }
  mirror_isects(verts0, verts1, 0);
  mirror_isects(verts1, verts0, 1);

  // console.log(verts0,verts1)

  const trace_outline: any = (idx: any, i0: number, j0: any, dir: any): Polyline | null => {
    let zero: any = null;
    let out: Polyline = [];
    const trace_from: any = (idx: any, i0: any, j0: any, dir: any) => {
      if (zero == null) {
        zero = [idx, i0, j0];
      } else if (idx == zero[0] && i0 == zero[1] && j0 == zero[2]) {
        return true;
      }
      let verts = idx ? verts1 : verts0;
      let n = verts.length;
      let p = verts[i0];
      let i1 = (i0 + dir + n) % n;
      if (j0 == -1) {
        out.push(p.xy);
        if (dir < 0) {
          return trace_from(idx, i1, verts[i1].isects.length - 1, dir);
        } else if (!verts[i0].isects.length) {
          return trace_from(idx, i1, -1, dir, [i0, j0]);
        } else {
          return trace_from(idx, i0, 0, dir, [i0, j0]);
        }
      } else if (j0 >= p.isects.length) {
        return trace_from(idx, i1, -1, dir, [i0, j0]);
      } else {
        let id = pair_key(idx, i0, j0);
        out.push((p.isects[j0] as any).xy);

        let q: any = p.isects[j0];
        let [jdx, k, z] = isect_mir[id];
        let params;
        if (q.side * dir < 0) {
          params = [jdx, k, z - 1, -1];
        } else {
          params = [jdx, k, z + 1, 1];
        }
        return trace_from(...params);
      }
    };
    let success = trace_from(idx, i0, j0, dir);
    if (!success || out.length < 3) {
      return null;
    }
    return out;
  };

  let xmin = Infinity;
  let amin: Pair | null = null;
  for (let i = 0; i < poly0.length; i++) {
    if (poly0[i][0] < xmin) {
      xmin = poly0[i][0];
      amin = [0, i] as Pair;
    }
  }
  for (let i = 0; i < poly1.length; i++) {
    if (poly1[i][0] < xmin) {
      xmin = poly1[i][0];
      amin = [1, i] as Pair;
    }
  }

  function check_concavity(poly: Polyline, idx: number) {
    let n = poly.length;
    let a = poly[(idx - 1 + n) % n];
    let b = poly[idx];
    let c = poly[(idx + 1) % n];
    let cw = pt_in_pl(...a, ...b, ...c) < 0 ? 1 : -1;
    return cw;
  }

  let cw = check_concavity(amin![0] ? poly1 : poly0, amin![1]);
  let ret = trace_outline(...amin!, -1, cw, true);
  if (!ret) {
    return [];
  }
  return ret;
}

function seg_isect_poly(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  poly: Polyline,
  is_ray = false,
) {
  let n = poly.length;
  let isects = [];
  for (let i = 0; i < poly.length; i++) {
    let a = poly[i];
    let b = poly[(i + 1) % n];
    let xx = seg_isect(x0, y0, x1, y1, ...a, ...b, is_ray);
    if (xx) {
      isects.push(xx);
    }
  }
  isects.sort((a, b) => a.t - b.t);
  return isects;
}

function clip(polyline: Polyline, polygon: Polyline): { true: Polyline[]; false: Polyline[] } {
  if (!polyline.length) {
    return { true: [], false: [] };
  }
  let zero =
    seg_isect_poly(...polyline[0], polyline[0][0] + Math.E, polyline[0][1] + PI, polygon, true)
      .length %
      2 !=
    0;
  let out: { true: Polyline[]; false: Polyline[] } = {
    true: [[]],
    false: [[]],
  };
  let io = zero;
  for (let i = 0; i < polyline.length; i++) {
    let a = polyline[i];
    let b = polyline[i + 1];
    // @ts-ignore
    out[io][out[io].length - 1].push(a);
    if (!b) break;

    let isects = seg_isect_poly(...a, ...b, polygon, false);
    for (let j = 0; j < isects.length; j++) {
      // @ts-ignore
      out[io][out[io].length - 1].push(isects[j].xy);
      io = !io;
      // @ts-ignore
      out[io].push([isects[j].xy]);
    }
  }
  out.true = out.true.filter((x) => x.length);
  out.false = out.false.filter((x) => x.length);
  return out;
}

function clip_multi(
  polylines: Polyline[],
  polygon: any,
  clipper_func: any = clip,
): { true: Polyline[]; false: Polyline[] } {
  let out = {
    true: <Polyline[]>[],
    false: <Polyline[]>[],
  };
  for (let i = 0; i < polylines.length; i++) {
    let c = clipper_func(polylines[i], polygon);
    out.true.push(...c.true);
    out.false.push(...c.false);
  }
  return out;
}

function binclip(polyline: Polyline, func: any): { true: Polyline[]; false: Polyline[] } {
  if (!polyline.length) {
    return { true: [], false: [] };
  }
  let bins = [];
  for (let i = 0; i < polyline.length; i++) {
    let t = i / (polyline.length - 1);
    bins.push(func(...polyline[i], t));
  }
  let zero = bins[0];
  let out = {
    true: [[]],
    false: [[]],
  };
  let io = zero;
  for (let i = 0; i < polyline.length; i++) {
    let a = polyline[i];
    let b = polyline[i + 1];
    // @ts-ignore
    out[io][out[io].length - 1].push(a);
    if (!b) break;

    let do_isect = bins[i] != bins[i + 1];

    if (do_isect) {
      let pt = lerp2d(...a, ...b, 0.5);
      // @ts-ignore
      out[io][out[io].length - 1].push(pt);
      // @ts-ignore
      io = !io;
      // @ts-ignore
      out[io].push([pt]);
    }
  }
  out.true = out.true.filter((x) => x.length);
  out.false = out.false.filter((x) => x.length);
  return out;
}

function shade_shape(poly: Polyline, step = 5, dx = 10, dy = 20) {
  let bbox = get_bbox(poly);
  bbox.x -= step;
  bbox.y -= step;
  bbox.w += step * 2;
  bbox.h += step * 2;
  let lines: Polyline[] = [];
  for (let i = -bbox.h; i < bbox.w; i += step) {
    let x0 = bbox.x + i;
    let y0 = bbox.y;
    let x1 = bbox.x + i + bbox.h;
    let y1 = bbox.y + bbox.h;
    lines.push([
      [x0, y0],
      [x1, y1],
    ]);
  }
  lines = clip_multi(lines, poly).true;

  let carve = trsl_poly(poly, -dx, -dy);

  lines = clip_multi(lines, carve).false;

  for (let i = 0; i < lines.length; i++) {
    let [a, b] = lines[i];
    let s = rand() * 0.5;
    if (dy > 0) {
      a = lerp2d(...a, ...b, s);
      lines[i][0] = a;
    } else {
      b = lerp2d(...b, ...a, s);
      lines[i][1] = b;
    }
  }

  return lines;
}

function fill_shape(poly: Polyline, step = 5): Polyline[] {
  let bbox = get_bbox(poly);
  bbox.x -= step;
  bbox.y -= step;
  bbox.w += step * 2;
  bbox.h += step * 2;
  let lines: Polyline[] = [];
  for (let i = 0; i < bbox.w + bbox.h / 2; i += step) {
    let x0 = bbox.x + i;
    let y0 = bbox.y;
    let x1 = bbox.x + i - bbox.h / 2;
    let y1 = bbox.y + bbox.h;
    lines.push([
      [x0, y0],
      [x1, y1],
    ]);
  }
  lines = clip_multi(lines, poly).true;
  return lines;
}

function patternshade_shape(
  poly: Polyline,
  step = 5,
  pattern_func: (x: number, y?: number) => number | boolean,
) {
  let bbox = get_bbox(poly);
  bbox.x -= step;
  bbox.y -= step;
  bbox.w += step * 2;
  bbox.h += step * 2;
  let lines: Polyline[] = [];
  for (let i = -bbox.h / 2; i < bbox.w; i += step) {
    let x0 = bbox.x + i;
    let y0 = bbox.y;
    let x1 = bbox.x + i + bbox.h / 2;
    let y1 = bbox.y + bbox.h;
    lines.push([
      [x0, y0],
      [x1, y1],
    ]);
  }
  lines = clip_multi(lines, poly).true;

  for (let i = 0; i < lines.length; i++) {
    lines[i] = resample(lines[i], 2);
  }

  lines = clip_multi(lines, pattern_func, binclip).true;

  return lines;
}

function vein_shape(poly: Polyline, n = 50) {
  let bbox = get_bbox(poly);
  let out: Polyline[] = [];
  for (let i = 0; i < n; i++) {
    let x = bbox.x + rand() * bbox.w;
    let y = bbox.y + rand() * bbox.h;
    let o: Polyline = [[x, y]];
    for (let j = 0; j < 15; j++) {
      let dx = (noise(x * 0.1, y * 0.1, 7) - 0.5) * 4;
      let dy = (noise(x * 0.1, y * 0.1, 6) - 0.5) * 4;
      x += dx;
      y += dy;
      o.push([x, y]);
    }
    out.push(o);
  }
  out = clip_multi(out, poly).true;
  return out;
}

function smalldot_shape(poly: Polyline, scale = 1) {
  let samples: Polyline = [];
  let bbox = get_bbox(poly);
  poissondisk(bbox.w, bbox.h, 5 * scale, samples);
  for (let i = 0; i < samples.length; i++) {
    samples[i][0] += bbox.x;
    samples[i][1] += bbox.y;
  }
  let out = [];
  let n = 7;
  for (let i = 0; i < samples.length; i++) {
    let [x, y] = samples[i];
    let t = y > 0 ? y / 300 : 0.5;
    // console.log(y,t);
    if ((t > 0.4 || y < 0) && t > rand()) {
      continue;
    }
    for (let k = 0; k < 2; k++) {
      let o: Polyline = [];
      for (let j = 0; j < n; j++) {
        let t = j / (n - 1);
        let a = t * PI * 2;
        o.push([Math.cos(a) * 1 - k * 0.3, Math.sin(a) * 0.5 - k * 0.3]);
      }
      o = trsl_poly(rot_poly(o, rand() * PI * 2), x, y);
      out.push(o);
    }
  }
  return clip_multi(out, poly).true;
}

function isect_circ_line(
  cx: number,
  cy: number,
  r: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
) {
  //https://stackoverflow.com/a/1084899
  let dx = x1 - x0;
  let dy = y1 - y0;
  let fx = x0 - cx;
  let fy = y0 - cy;
  let a = dx * dx + dy * dy;
  let b = 2 * (fx * dx + fy * dy);
  let c = fx * fx + fy * fy - r * r;
  let discriminant = b * b - 4 * a * c;
  if (discriminant < 0) {
    return null;
  }
  discriminant = Math.sqrt(discriminant);
  let t0 = (-b - discriminant) / (2 * a);
  if (0 <= t0 && t0 <= 1) {
    return t0;
  }
  let t = (-b + discriminant) / (2 * a);
  if (t > 1 || t < 0) {
    return null;
  }
  return t;
}

function resample(polyline: Polyline, step: number): Polyline {
  if (polyline.length < 2) {
    return polyline.slice();
  }
  polyline = polyline.slice();
  let out: Polyline = [polyline[0].slice() as Pair];
  let next = null;
  let i = 0;
  while (i < polyline.length - 1) {
    let a = polyline[i];
    let b = polyline[i + 1];
    let dx = b[0] - a[0];
    let dy = b[1] - a[1];
    let d = Math.sqrt(dx * dx + dy * dy);
    if (d == 0) {
      i++;
      continue;
    }
    let n = ~~(d / step);
    let rest = (n * step) / d;
    let rpx = a[0] * (1 - rest) + b[0] * rest;
    let rpy = a[1] * (1 - rest) + b[1] * rest;
    for (let j = 1; j <= n; j++) {
      let t = j / n;
      let x = a[0] * (1 - t) + rpx * t;
      let y = a[1] * (1 - t) + rpy * t;
      let xy: Pair = [x, y];
      for (let k = 2; k < a.length; k++) {
        xy.push(a[k] * (1 - t) + (a[k] * (1 - rest) + b[k] * rest) * t);
      }
      out.push(xy);
    }

    next = null;
    for (let j = i + 2; j < polyline.length; j++) {
      let b = polyline[j - 1];
      let c = polyline[j];
      if (b[0] == c[0] && b[1] == c[1]) {
        continue;
      }
      let t = isect_circ_line(rpx, rpy, step, b[0], b[1], c[0], c[1]);
      if (t == null) {
        continue;
      }

      let q: Pair = [b[0] * (1 - t) + c[0] * t, b[1] * (1 - t) + c[1] * t];
      for (let k = 2; k < b.length; k++) {
        q.push(b[k] * (1 - t) + c[k] * t);
      }
      out.push(q);
      polyline[j - 1] = q;
      next = j - 1;
      break;
    }
    if (next == null) {
      break;
    }
    i = next;
  }

  if (out.length > 1) {
    let lx = out[out.length - 1][0];
    let ly = out[out.length - 1][1];
    let mx = polyline[polyline.length - 1][0];
    let my = polyline[polyline.length - 1][1];
    let d = Math.sqrt((mx - lx) ** 2 + (my - ly) ** 2);
    if (d < step * 0.5) {
      out.pop();
    }
  }
  out.push(polyline[polyline.length - 1].slice() as Pair);
  return out;
}

function pt_seg_dist(p: Pair, p0: Pair, p1: Pair) {
  // https://stackoverflow.com/a/6853926
  let x = p[0];
  let y = p[1];
  let x1 = p0[0];
  let y1 = p0[1];
  let x2 = p1[0];
  let y2 = p1[1];
  let A = x - x1;
  let B = y - y1;
  let C = x2 - x1;
  let D = y2 - y1;
  let dot = A * C + B * D;
  let len_sq = C * C + D * D;
  let param = -1;
  if (len_sq != 0) {
    param = dot / len_sq;
  }
  let xx;
  let yy;
  if (param < 0) {
    xx = x1;
    yy = y1;
  } else if (param > 1) {
    xx = x2;
    yy = y2;
  } else {
    xx = x1 + param * C;
    yy = y1 + param * D;
  }
  let dx = x - xx;
  let dy = y - yy;
  return Math.sqrt(dx * dx + dy * dy);
}

function approx_poly_dp(polyline: Polyline, epsilon: number): Polyline {
  if (polyline.length <= 2) {
    return polyline;
  }
  let dmax = 0;
  let argmax = -1;
  for (let i = 1; i < polyline.length - 1; i++) {
    let d = pt_seg_dist(polyline[i], polyline[0], polyline[polyline.length - 1]);
    if (d > dmax) {
      dmax = d;
      argmax = i;
    }
  }
  let ret: Polyline = [];
  if (dmax > epsilon) {
    let L = approx_poly_dp(polyline.slice(0, argmax + 1), epsilon);
    let R = approx_poly_dp(polyline.slice(argmax, polyline.length), epsilon);
    ret = ret.concat(L.slice(0, L.length - 1)).concat(R);
  } else {
    ret.push(polyline[0].slice() as Pair);
    ret.push(polyline[polyline.length - 1].slice() as Pair);
  }
  return ret;
}

function distsq(x0: number, y0: number, x1: number, y1: number) {
  let dx = x0 - x1;
  let dy = y0 - y1;
  return dx * dx + dy * dy;
}
function poissondisk(W: number, H: number, r: number, samples: Polyline): void {
  let grid: number[] = [];
  let active: Pair[] = [];
  let w = r / 1.4142135624;
  let r2 = r * r;
  let cols = ~~(W / w);
  let rows = ~~(H / w);
  for (let i = 0; Number(i < cols * rows); i += 1) {
    grid.splice(grid.length, 0, -1);
  }
  let pos: Pair = [W / 2.0, H / 2.0];
  samples.splice(samples.length, 0, pos);
  for (let i = 0; Number(i < samples.length); i += 1) {
    let col = ~~(samples[i][0] / w);
    let row = ~~(samples[i][1] / w);
    grid[col + row * cols] = i;
    active.splice(active.length, 0, samples[i]);
  }
  while (active.length) {
    let ridx = ~~(rand() * active.length);
    pos = active[ridx];
    let found = 0;
    for (let n = 0; Number(n < 30); n += 1) {
      let sr = r + rand() * r;
      let sa = 6.2831853072 * rand();
      let sx = pos[0] + sr * Math.cos(sa);
      let sy = pos[1] + sr * Math.sin(sa);
      let col = ~~(sx / w);
      let row = ~~(sy / w);
      if (
        Number(col > 0) &&
        Number(row > 0) &&
        Number(col < cols - 1) &&
        Number(row < rows - 1) &&
        Number(grid[col + row * cols] == -1)
      ) {
        let ok = 1;
        for (let i = -1; Number(i <= 1); i += 1) {
          for (let j = -1; Number(j <= 1); j += 1) {
            let idx = (row + i) * cols + col + j;
            let nbr = grid[idx];
            if (Number(-1 != nbr)) {
              let d = distsq(sx, sy, samples[nbr][0], samples[nbr][1]);
              if (Number(d < r2)) {
                ok = 0;
              }
            }
          }
        }
        if (ok) {
          found = 1;
          grid[row * cols + col] = samples.length;
          let sample: Pair = [sx, sy];
          active.splice(active.length, 0, sample);
          samples.splice(samples.length, 0, sample);
        }
      }
    }
    if (Number(!found)) {
      active.splice(ridx, 1);
    }
  }
}

type DrawSvgInput = {
  polylines: Polyline[];
  layout: any;
  poi: { head: { length: number; neckline: Pair } };
  params: any;
};

function draw_svg(
  { polylines, layout, poi }: DrawSvgInput,
  attrs: Partial<{ color: 'normal' | 'santa' | 'rainbow'; santa: boolean }>,
) {
  let bgcolor = 'floralwhite';
  let fillcolor = 'floralwhite';
  let fgstroke = 'black';
  let underlay = '';
  let overlay = '';

  if (attrs.color === 'rainbow') {
    underlay = `<linearGradient xmlns="http://www.w3.org/2000/svg" id="trout-gradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#4F0E23"/><stop offset="15%" stop-color="#63343E"/><stop offset="30%" stop-color="#3F7067"/><stop offset="50%" stop-color="#E38A26"/><stop offset="70%" stop-color="#A1161D"/><stop offset="85%" stop-color="#581414"/></linearGradient>`;
    fgstroke = 'url(#trout-gradient)';
    fillcolor = 'snow';
  }

  if (attrs.santa) {
    const [x, y] = poi.head.neckline;
    const { bbox, px, s, py, p } = layout;
    const hatw = poi.head.length * 4;
    const hath = HAT_RATIO * hatw;
    fillcolor = '#fff6e5';
    bgcolor = 'powderblue';
    const flip = rand() > 0.8;
    overlay += santaHat(
      (x - bbox.x) * s + px + p - (flip ? 0 : hatw / 2),
      (y - bbox.y) * s + py + p - hath + 25 + (flip ? 10 : 0),
      hatw,
      flip,
    );
    for (let i = 0; i < 20 + Math.ceil(rand() * 100); i++) {
      const s = 40 * rand() + 3;
      const r = Math.round(360 * rand());
      underlay += snowflake(rand() * (500 - s), rand() * (300 - s), s, r);
    }
  }

  let o = `<svg xmlns="http://www.w3.org/2000/svg" width="520" height="320">`;
  o += `<rect x="0" y="0" width="520" height="320" fill="${bgcolor}"/>`;
  o += `<rect x="10" y="10" width="500" height="300" stroke="black" stroke-width="1" fill="none"/>`;
  o += underlay;

  const drawBg = (k: number) => {
    const start = k < 0 ? polylines.length + k : 0;
    const stop = k < 0 ? polylines.length : k;
    const bodyLines = polylines.slice(start, stop).flat();
    o += `<path fill="${fillcolor}" d="M `;
    for (let i = 0; i < bodyLines.length; i++) {
      let [x, y] = bodyLines[i];
      o += `${~~((x + 10) * 100) / 100} ${~~((y + 10) * 100) / 100} `;
    }
    o += ` Z"/>\n`;
  };
  drawBg(2);
  drawBg(3);
  // drawBg(4);
  drawBg(5);
  drawBg(-8);
  drawBg(-5);
  // drawBg(-4);
  drawBg(-3);
  drawBg(-2);

  o += `<path stroke="${fgstroke}" stroke-width="1" fill="${fillcolor}" stroke-linecap="round" stroke-linejoin="round" d="`;
  for (let i = 0; i < polylines.length; i++) {
    o += '\nM ';
    for (let j = 0; j < polylines[i].length; j++) {
      let [x, y] = polylines[i][j];
      o += `${~~((x + 10) * 100) / 100} ${~~((y + 10) * 100) / 100} `;
    }
  }
  o += `\n"/>`;
  o += `${overlay}`;
  o += `</svg>`;
  return o;
}

function pow(a: number, b: number) {
  return Math.sign(a) * Math.pow(Math.abs(a), b);
}

function gauss2d(x: number, y: number) {
  let z0 = Math.exp(-0.5 * x * x);
  let z1 = Math.exp(-0.5 * y * y);
  return z0 * z1;
}

function gauss1d(mean: number, std: number) {
  const sample01 = () => {
    // convert [0, 1) to (0, 1)
    let r = rand();
    do {
      r = rand();
    } while (r === 0);
    return r;
  };
  const u = sample01();
  const v = sample01();
  let normal = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return mean + std * normal;
}

function squama_mask(w: number, h: number): Polyline {
  let p: Polyline = [];
  let n = 7;
  for (let i = 0; i < n; i++) {
    let t = i / n;
    let a = t * PI * 2;
    let x = -pow(Math.cos(a), 1.3) * w;
    let y = pow(Math.sin(a), 1.3) * h;
    p.push([x, y]);
  }
  return p;
}

function squama(w: number, h: number, m = 3): Polyline[] {
  let p: Polyline = [];
  let n = 8;
  for (let i = 0; i < n; i++) {
    let t = i / (n - 1);
    let a = t * PI + PI / 2;
    let x = -pow(Math.cos(a), 1.4) * w;
    let y = pow(Math.sin(a), 1.4) * h;
    p.push([x, y]);
  }
  let q: Polyline[] = [p];
  for (let i = 0; i < m; i++) {
    let t = i / (m - 1);
    q.push([
      [-w * 0.3 + (rand() - 0.5), -h * 0.2 + t * h * 0.4 + (rand() - 0.5)],
      [w * 0.5 + (rand() - 0.5), -h * 0.3 + t * h * 0.6 + (rand() - 0.5)],
    ]);
  }
  return q;
}

function trsl_poly(poly: Polyline, x: number, y: number): Polyline {
  return poly.map((xy) => [xy[0] + x, xy[1] + y]);
}
function scl_poly(poly: Polyline, sx: number, sy: number): Polyline {
  if (sy === undefined) sy = sx;
  return poly.map((xy) => [xy[0] * sx, xy[1] * sy]);
}
function shr_poly(poly: Polyline, sx: number): Polyline {
  return poly.map((xy) => [xy[0] + xy[1] * sx, xy[1]]);
}
function rot_poly(poly: Polyline, th: number): Polyline {
  let qoly: Polyline = [];
  let costh = Math.cos(th);
  let sinth = Math.sin(th);
  for (let i = 0; i < poly.length; i++) {
    let [x0, y0] = poly[i];
    let x = x0 * costh - y0 * sinth;
    let y = x0 * sinth + y0 * costh;
    qoly.push([x, y]);
  }
  return qoly;
}

function squama_mesh(
  m: number,
  n: number,
  uw: number,
  uh: number,
  squama_func: any,
  noise_x: number,
  noise_y: number,
  interclip = true,
) {
  let clipper = null;

  let pts: Polyline = [];
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < m; j++) {
      let x = j * uw;
      let y = (n * uh) / 2 - Math.cos((i / (n - 1)) * PI) * ((n * uh) / 2);
      let a = noise(x * 0.005, y * 0.005) * PI * 2 - PI;
      let r = noise(x * 0.005, y * 0.005);
      let dx = Math.cos(a) * r * noise_x;
      let dy = Math.cos(a) * r * noise_y;
      pts.push([x + dx, y + dy]);
    }
  }
  let out = [];

  let whs: Polyline = [];
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < m; j++) {
      if (i == 0 || j == 0 || i == n - 1 || j == m - 1) {
        whs.push([uw / 2, uh / 2]);
        continue;
      }
      let a = pts[i * m + j];
      let b = pts[i * m + j + 1];
      let c = pts[i * m + j - 1];
      let d = pts[(i - 1) * m + j];
      let e = pts[(i + 1) * m + j];

      let dw = (dist(...a, ...b) + dist(...a, ...c)) / 4;
      let dh = (dist(...a, ...d) + dist(...a, ...e)) / 4;
      whs.push([dw, dh]);
    }
  }

  for (let j = 1; j < m - 1; j++) {
    for (let i = 1; i < n - 1; i++) {
      let [x, y] = pts[i * m + j];
      let [dw, dh] = whs[i * m + j];
      let q = trsl_poly(squama_mask(dw, dh), x, y);

      let p = squama_func(x, y, dw, dh).map((a: Polyline) => trsl_poly(a, x, y));
      if (!interclip) {
        out.push(...p);
      } else {
        if (clipper) {
          out.push(...clip_multi(p, clipper).false);
          clipper = poly_union(clipper, q);
        } else {
          out.push(...p);
          clipper = q;
        }
      }
    }
    for (let i = 1; i < n - 1; i++) {
      let a = pts[i * m + j];
      let b = pts[i * m + j + 1];
      let c = pts[(i + 1) * m + j];
      let d = pts[(i + 1) * m + j + 1];

      let [dwa, dha] = whs[i * m + j];
      let [dwb, dhb] = whs[i * m + j + 1];
      let [dwc, dhc] = whs[(i + 1) * m + j];
      let [dwd, dhd] = whs[(i + 1) * m + j + 1];

      let [x, y] = [(a[0] + b[0] + c[0] + d[0]) / 4, (a[1] + b[1] + c[1] + d[1]) / 4];
      let [dw, dh] = [(dwa + dwb + dwc + dwd) / 4, (dha + dhb + dhc + dhd) / 4];
      dw *= 1.2;
      let q = trsl_poly(squama_mask(dw, dh), x, y);

      let p = squama_func(x, y, dw, dh).map((a: Polyline) => trsl_poly(a, x, y));
      if (!interclip) {
        out.push(...p);
      } else {
        if (clipper) {
          out.push(...clip_multi(p, clipper).false);
          clipper = poly_union(clipper, q);
        } else {
          out.push(...p);
          clipper = q;
        }
      }
    }
  }
  // for (let i = 0; i < n-1; i++){
  //   for (let j = 0; j < m-1; j++){
  //     let a= pts[i*m+j];
  //     let b= pts[i*m+j+1];
  //     let c = pts[(i+1)*m+j];
  //     out.push([a,b]);
  //     out.push([a,c]);
  //   }
  // }
  return out;
}

function pattern_dot(scale = 1) {
  let samples: Polyline = [];
  poissondisk(500, 300, 20 * scale, samples);
  let rs: number[] = [];
  for (let i = 0; i < samples.length; i++) {
    rs.push((rand() * 5 + 10) * scale);
  }
  return function (x: number, y: number) {
    for (let i = 0; i < samples.length; i++) {
      let r = rs[i];
      if (dist(x, y, ...samples[i]) < r) {
        let [x0, y0] = samples[i];
        let dx = x - x0;
        let dy = y - y0;
        if (gauss2d((dx / r) * 2, (dy / r) * 2) * noise(x, y, 999) > 0.2) {
          return true;
        }
      }
    }
    return false;
  };
}

function fish_body_a(curve0: Polyline, curve1: Polyline, scale_scale: number, pattern_func: any) {
  let curve2 = [];
  let curve3 = [];
  for (let i = 0; i < curve0.length; i++) {
    curve2.push(lerp2d(...curve0[i], ...curve1[i], 0.95));
    curve3.push(lerp2d(...curve0[i], ...curve1[i], 0.85));
  }
  let outline1 = curve0.concat(curve1.slice().reverse());
  let outline2 = curve0.concat(curve2.slice().reverse());
  let outline3 = curve0.concat(curve3.slice().reverse());

  let bbox = get_bbox(curve0.concat(curve1));
  let m = ~~(bbox.w / (scale_scale * 15));
  let n = ~~(bbox.h / (scale_scale * 15));
  let uw = bbox.w / m;
  let uh = bbox.h / n;

  let fn = pattern_func
    ? (x: number, y: number, w: number, h: number) => squama(w, h, Number(pattern_func(x, y)) * 3)
    : (x: number, y: number, w: number, h: number) => squama(w, h);
  let sq = squama_mesh(m, n + 3, uw, uh, fn, uw * 3, uh * 3, true).map((a) =>
    trsl_poly(a, bbox.x, bbox.y - uh * 1.5),
  );
  // @ts-ignore
  let o0 = clip_multi(sq, outline2)[true];
  let o1 = clip_multi(o0, outline3);
  o1.false = o1.false.filter((x) => rand() < 0.6);
  let o = [];
  o.push(curve0, curve1.slice().reverse(), ...o1.true, ...o1.false);
  return o;
}

function fish_body_b(
  curve0: Polyline,
  curve1: Polyline,
  scale_scale: number,
  pattern_func: any,
): Polyline[] {
  let curve2 = [];
  for (let i = 0; i < curve0.length; i++) {
    curve2.push(lerp2d(...curve0[i], ...curve1[i], 0.95));
  }
  let outline1 = curve0.concat(curve1.slice().reverse());
  let outline2 = curve0.concat(curve2.slice().reverse());

  let bbox = get_bbox(curve0.concat(curve1));
  let m = ~~(bbox.w / (scale_scale * 5));
  let n = ~~(bbox.h / (scale_scale * 5));
  let uw = bbox.w / m;
  let uh = bbox.h / n;

  let sq = squama_mesh(
    m,
    n + 16,
    uw,
    uh,
    (x: number, y: number, w: number, h: number) => squama(w * 0.7, h * 0.6, 0),
    uw * 8,
    uh * 8,
    false,
  ).map((a) => trsl_poly(a, bbox.x, bbox.y - uh * 8));
  // @ts-ignore
  let o0 = clip_multi(sq, outline2)[true];

  let o1 = [];
  for (let i = 0; i < o0.length; i++) {
    let [x, y] = o0[i][0];
    let t = (y - bbox.y) / bbox.h;
    // if (rand() > t){
    //   o1.push(o0[i]);
    // }
    // if ((~~(x/30))%2 || (rand() > t && rand()>t)){
    //   o1.push(o0[i]);
    // }
    if (pattern_func) {
      if (pattern_func(x, y) || (rand() > t && rand() > t)) {
        o1.push(o0[i]);
      }
    } else {
      if (rand() > t) {
        o1.push(o0[i]);
      }
    }
  }
  let o = [];
  o.push(curve0, curve1.slice().reverse(), ...o1);
  return o;
}

function ogee(x: number) {
  return 4 * Math.pow(x - 0.5, 3) + 0.5;
}

function fish_body_c(curve0: Polyline, curve1: Polyline, scale_scale: number) {
  let step = 6 * scale_scale;

  let curve2 = [];
  let curve3 = [];

  for (let i = 0; i < curve0.length; i++) {
    curve2.push(lerp2d(...curve0[i], ...curve1[i], 0.95));
    curve3.push(lerp2d(...curve0[i], ...curve1[i], 0.4));
  }
  let outline1 = curve0.concat(curve1.slice().reverse());
  let outline2 = curve0.concat(curve2.slice().reverse());

  let bbox = get_bbox(curve0.concat(curve1));
  bbox.x -= step;
  bbox.y -= step;
  bbox.w += step * 2;
  bbox.h += step * 2;

  let lines = [curve3.reverse()];

  for (let i = -bbox.h; i < bbox.w; i += step) {
    let x0 = bbox.x + i;
    let y0 = bbox.y;
    let x1 = bbox.x + i + bbox.h;
    let y1 = bbox.y + bbox.h;
    lines.push([
      [x0, y0],
      [x1, y1],
    ]);
  }
  for (let i = 0; i < bbox.w + bbox.h; i += step) {
    let x0 = bbox.x + i;
    let y0 = bbox.y;
    let x1 = bbox.x + i - bbox.h;
    let y1 = bbox.y + bbox.h;
    lines.push([
      [x0, y0],
      [x1, y1],
    ]);
  }
  for (let i = 0; i < lines.length; i++) {
    lines[i] = resample(lines[i], 4);
    for (let j = 0; j < lines[i].length; j++) {
      let [x, y] = lines[i][j];
      let t = (y - bbox.y) / bbox.h;
      let y1 = (-Math.cos(t * PI) * bbox.h) / 2 + bbox.y + bbox.h / 2;

      let dx = (noise(x * 0.005, y1 * 0.005, 0.1) - 0.5) * 50;
      let dy = (noise(x * 0.005, y1 * 0.005, 1.2) - 0.5) * 50;

      lines[i][j][0] += dx;
      lines[i][j][1] = y1 + dy;
    }
  }

  // @ts-ignore
  let o0 = clip_multi(lines, outline2)[true];

  o0 = clip_multi(o0, (x: number, y: number, t: number) => rand() > t || rand() > t, binclip).true;

  let o = [];

  o.push(curve0, curve1.slice().reverse(), ...o0);
  return o;
}

function fish_body_d(curve0: Polyline, curve1: Polyline, scale_scale: number) {
  let curve2 = [];
  for (let i = 0; i < curve0.length; i++) {
    curve2.push(lerp2d(...curve0[i], ...curve1[i], 0.4));
  }
  curve0 = resample(curve0, 10 * scale_scale);
  curve1 = resample(curve1, 10 * scale_scale);
  curve2 = resample(curve2, 10 * scale_scale);

  let outline1 = curve0.concat(curve1.slice().reverse());
  let outline2 = curve0.concat(curve2.slice().reverse());

  let o0 = [curve2];
  for (let i = 3; i < Math.min(curve0.length, curve1.length, curve2.length); i++) {
    let a = [curve0[i], curve2[i - 3]];
    let b = [curve2[i - 3], curve1[i]];

    o0.push(a, b);
  }

  let o1 = [];
  for (let i = 0; i < o0.length; i++) {
    o0[i] = resample(o0[i], 4);
    for (let j = 0; j < o0[i].length; j++) {
      let [x, y] = o0[i][j];
      let dx = 30 * (noise(x * 0.01, y * 0.01, -1) - 0.5);
      let dy = 30 * (noise(x * 0.01, y * 0.01, 9) - 0.5);
      o0[i][j][0] += dx;
      o0[i][j][1] += dy;
    }

    o1.push(
      ...binclip(
        o0[i],
        (x: number, y: number, t: number) =>
          (rand() > Math.cos(t * PI) && rand() < x / 500) ||
          (rand() > Math.cos(t * PI) && rand() < x / 500),
      ).true,
    );
  }
  o1 = clip_multi(o1, outline1).true;

  let sh = vein_shape(outline1);

  let o = [];
  o.push(curve0, curve1.slice().reverse(), ...o1, ...sh);
  return o;
}

function fin_a(
  curve: Polyline,
  ang0: number,
  ang1: number,
  func: (t: number) => number,
  clip_root: boolean | 1 | 0 = false,
  curvature0 = 0,
  curvature1 = 0,
  softness = 10,
): [Polyline, Polyline[]] {
  let angs = [];
  for (let i = 0; i < curve.length; i++) {
    if (i == 0) {
      angs.push(Math.atan2(curve[i + 1][1] - curve[i][1], curve[i + 1][0] - curve[i][0]) - PI / 2);
    } else if (i == curve.length - 1) {
      angs.push(Math.atan2(curve[i][1] - curve[i - 1][1], curve[i][0] - curve[i - 1][0]) - PI / 2);
    } else {
      let a0 = Math.atan2(curve[i - 1][1] - curve[i][1], curve[i - 1][0] - curve[i][0]);
      let a1 = Math.atan2(curve[i + 1][1] - curve[i][1], curve[i + 1][0] - curve[i][0]);
      while (a1 > a0) {
        a1 -= PI * 2;
      }
      a1 += PI * 2;
      let a = (a0 + a1) / 2;
      angs.push(a);
    }
  }
  let out0: Polyline = [];
  let out1: Polyline[] = [];
  let out2: Polyline = [];
  let out3: Polyline = [];
  for (let i = 0; i < curve.length; i++) {
    let t = i / (curve.length - 1);
    let aa = lerp(ang0, ang1, t);
    let a = angs[i] + aa;
    let w = func(t);

    let [x0, y0] = curve[i];
    let x1 = x0 + Math.cos(a) * w;
    let y1 = y0 + Math.sin(a) * w;

    let p = resample(
      [
        [x0, y0],
        [x1, y1],
      ],
      3,
    );
    for (let j = 0; j < p.length; j++) {
      let s = j / (p.length - 1);
      let ss = Math.sqrt(s);
      let [x, y] = p[j];
      let cv = lerp(curvature0, curvature1, t) * Math.sin(s * PI);
      p[j][0] += noise(x * 0.1, y * 0.1, 3) * ss * softness + Math.cos(a - PI / 2) * cv;
      p[j][1] += noise(x * 0.1, y * 0.1, 4) * ss * softness + Math.sin(a - PI / 2) * cv;
    }
    if (i == 0) {
      out2 = p;
    } else if (i == curve.length - 1) {
      out3 = p.slice().reverse();
    } else {
      out0.push(p[p.length - 1]);
      // if (i % 2){
      let q = p.slice(
        clip_root ? ~~(rand() * 4) : 0,
        Math.max(2, ~~(p.length * (rand() * 0.5 + 0.5))),
      );
      if (q.length) {
        out1.push(q);
      }
      // }
    }
  }
  out0 = resample(out0, 3);
  for (let i = 0; i < out0.length; i++) {
    let [x, y] = out0[i];
    out0[i][0] += (noise(x * 0.1, y * 0.1) * 6 - 3) * (softness / 10);
    out0[i][1] += (noise(x * 0.1, y * 0.1) * 6 - 3) * (softness / 10);
  }
  let o = out2.concat(out0).concat(out3);
  out1.unshift(o);
  return [o.concat(curve.slice().reverse()), out1];
}

function fin_b(
  curve: Polyline,
  ang0: number,
  ang1: number,
  func: (t: number) => number,
  dark = 1,
): [Polyline, Polyline[]] {
  let angs = [];
  for (let i = 0; i < curve.length; i++) {
    if (i == 0) {
      angs.push(Math.atan2(curve[i + 1][1] - curve[i][1], curve[i + 1][0] - curve[i][0]) - PI / 2);
    } else if (i == curve.length - 1) {
      angs.push(Math.atan2(curve[i][1] - curve[i - 1][1], curve[i][0] - curve[i - 1][0]) - PI / 2);
    } else {
      let a0 = Math.atan2(curve[i - 1][1] - curve[i][1], curve[i - 1][0] - curve[i][0]);
      let a1 = Math.atan2(curve[i + 1][1] - curve[i][1], curve[i + 1][0] - curve[i][0]);
      while (a1 > a0) {
        a1 -= PI * 2;
      }
      a1 += PI * 2;
      let a = (a0 + a1) / 2;
      angs.push(a);
    }
  }

  let out0: Polyline[] = [];
  let out1: Polyline = [];
  let out2: Polyline[] = [];
  let out3: Polyline[] = [];
  for (let i = 0; i < curve.length; i++) {
    let t = i / (curve.length - 1);
    let aa = lerp(ang0, ang1, t);
    let a = angs[i] + aa;
    let w = func(t);

    let [x0, y0] = curve[i];
    let x1 = x0 + Math.cos(a) * w;
    let y1 = y0 + Math.sin(a) * w;

    let b: Pair = [x1 + 0.5 * Math.cos(a - PI / 2), y1 + 0.5 * Math.sin(a - PI / 2)];
    let c: Pair = [x1 + 0.5 * Math.cos(a + PI / 2), y1 + 0.5 * Math.sin(a + PI / 2)];

    let p: Pair = [
      curve[i][0] + 1.8 * Math.cos(a - PI / 2),
      curve[i][1] + 1.8 * Math.sin(a - PI / 2),
    ];
    let q: Pair = [
      curve[i][0] + 1.8 * Math.cos(a + PI / 2),
      curve[i][1] + 1.8 * Math.sin(a + PI / 2),
    ];
    out1.push([x1, y1]);
    out0.push([p, b, c, q]);
  }

  let n = 10;
  for (let i = 0; i < curve.length - 1; i++) {
    let [_, __, a0, q0] = out0[i];
    let [p1, a1, ___, ____] = out0[i + 1];

    let b = lerp2d(...a0, ...q0, 0.1);
    let c = lerp2d(...a1, ...p1, 0.1);

    let o: Polyline = [];
    let ang = Math.atan2(c[1] - b[1], c[0] - b[0]);

    for (let j = 0; j < n; j++) {
      let t = j / (n - 1);
      let d = Math.sin(t * PI) * 2;
      let a = lerp2d(...b, ...c, t);
      o.push([a[0] + Math.cos(ang + PI / 2) * d, a[1] + Math.sin(ang + PI / 2) * d]);
    }

    // out2.push([b,c]);
    out2.push(o);

    let m = ~~((Math.min(dist(...a0, ...q0), dist(...a1, ...p1)) / 10) * dark);
    let e = lerp2d(...curve[i], ...curve[i + 1], 0.5);
    for (let k = 0; k < m; k++) {
      let p = [];
      let s = (k / m) * 0.7;
      for (let j = 1; j < n - 1; j++) {
        p.push(lerp2d(...o[j], ...e, s));
      }
      out3.push(p);
    }
  }

  let out4 = [];
  if (out0.length > 1) {
    let clipper: Polyline = out0[0];
    out4.push(out0[0]);
    for (let i = 1; i < out0.length; i++) {
      out4.push(...clip(out0[i], clipper).false);
      clipper = poly_union(clipper, out0[i]);
    }
  }

  return [out2.flat().concat(curve.slice().reverse()), out4.concat(out2).concat(out3)];
}

function finlet(curve: Polyline, h: number, dir = 1): [Polyline, Polyline[]] {
  let angs = [];
  for (let i = 0; i < curve.length; i++) {
    if (i == 0) {
      angs.push(Math.atan2(curve[i + 1][1] - curve[i][1], curve[i + 1][0] - curve[i][0]) - PI / 2);
    } else if (i == curve.length - 1) {
      angs.push(Math.atan2(curve[i][1] - curve[i - 1][1], curve[i][0] - curve[i - 1][0]) - PI / 2);
    } else {
      let a0 = Math.atan2(curve[i - 1][1] - curve[i][1], curve[i - 1][0] - curve[i][0]);
      let a1 = Math.atan2(curve[i + 1][1] - curve[i][1], curve[i + 1][0] - curve[i][0]);
      while (a1 > a0) {
        a1 -= PI * 2;
      }
      a1 += PI * 2;
      let a = (a0 + a1) / 2;
      angs.push(a);
    }
  }
  let out0: Polyline = [];
  for (let i = 0; i < curve.length; i++) {
    let t = i / (curve.length - 1);
    let a = angs[i];
    let w = (i + 1) % 3 ? 0 : h;
    if (dir > 0) {
      w *= 1 - t * 0.5;
    } else {
      w *= 0.5 + t * 0.5;
    }

    let [x0, y0] = curve[i];
    let x1 = x0 + Math.cos(a) * w;
    let y1 = y0 + Math.sin(a) * w;
    out0.push([x1, y1]);
  }
  out0 = resample(out0, 2);
  for (let i = 0; i < out0.length; i++) {
    let [x, y] = out0[i];
    out0[i][0] += noise(x * 0.1, y * 0.1) * 2 - 3;
    out0[i][1] += noise(x * 0.1, y * 0.1) * 2 - 3;
  }
  out0.push(curve[curve.length - 1]);
  return [out0.concat(curve.slice().reverse()), [out0]];
}

function fin_adipose(curve: Polyline, dx: number, dy: number, r: number): [Polyline, Polyline[]] {
  let n = 20;
  let [x0, y0] = curve[~~(curve.length / 2)];
  let [x, y] = [x0 + dx, y0 + dy];
  let [x1, y1] = curve[0];
  let [x2, y2] = curve[curve.length - 1];
  let d1 = dist(x, y, x1, y1);
  let d2 = dist(x, y, x2, y2);
  let a1 = Math.acos(r / d1);
  let a2 = Math.acos(r / d2);
  let a01 = Math.atan2(y1 - y, x1 - x) + a1;
  let a02 = Math.atan2(y2 - y, x2 - x) - a2;
  a02 -= PI * 2;
  while (a02 < a01) {
    a02 += PI * 2;
  }
  let out0: Polyline = [[x1, y1]];
  for (let i = 0; i < n; i++) {
    let t = i / (n - 1);
    let a = lerp(a01, a02, t);
    let p: Pair = [x + Math.cos(a) * r, y + Math.sin(a) * r];
    out0.push(p);
  }
  out0.push([x2, y2]);
  out0 = resample(out0, 3);
  for (let i = 0; i < out0.length; i++) {
    let t = i / (out0.length - 1);
    let s = Math.sin(t * PI);
    let [x, y] = out0[i];
    out0[i][0] += (noise(x * 0.01, y * 0.01) - 0.5) * s * 50;
    out0[i][1] += (noise(x * 0.01, y * 0.01) - 0.5) * s * 50;
  }
  let cc = out0.concat(curve.slice().reverse());
  let out1 = clip(trsl_poly(out0, 0, 4), cc).true;

  out1 = clip_multi(
    out1,
    (x: number, y: number, t: number) => rand() < Math.sin(t * PI),
    binclip,
  ).true;
  return [cc, [out0, ...out1]];
}

function fish_lip(x0: number, y0: number, x1: number, y1: number, w: number): Polyline {
  x0 += rand() * 0.001 - 0.0005;
  y0 += rand() * 0.001 - 0.0005;
  x1 += rand() * 0.001 - 0.0005;
  y1 += rand() * 0.001 - 0.0005;
  let h = dist(x0, y0, x1, y1);
  let a0 = Math.atan2(y1 - y0, x1 - x0);
  let n = 10;
  let ang = Math.acos(w / h);
  let dx = Math.cos(a0 + PI / 2) * 0.5;
  let dy = Math.sin(a0 + PI / 2) * 0.5;
  let o: Polyline = [[x0 - dx, y0 - dy]];
  for (let i = 0; i < n; i++) {
    let t = i / (n - 1);
    let a = lerp(ang, PI * 2 - ang, t) + a0;
    let x = -Math.cos(a) * w + x1;
    let y = -Math.sin(a) * w + y1;
    o.push([x, y]);
  }
  o.push([x0 + dx, y0 + dy]);
  o = resample(o, 2.5);
  for (let i = 0; i < o.length; i++) {
    let [x, y] = o[i];
    o[i][0] += noise(x * 0.05, y * 0.05, -1) * 2 - 1;
    o[i][1] += noise(x * 0.05, y * 0.05, -2) * 2 - 1;
  }
  return o;
}

function fish_teeth(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  h: number,
  dir: number,
  sep = 3.5,
): Polyline[] {
  let n = Math.max(2, ~~(dist(x0, y0, x1, y1) / sep));
  let ang = Math.atan2(y1 - y0, x1 - x0);
  let out: Polyline[] = [];
  for (let i = 0; i < n; i++) {
    let t = i / (n - 1);
    let a = lerp2d(x0, y0, x1, y1, t);
    let w = h * t;
    let b: Pair = [
      a[0] + Math.cos(ang + (dir * PI) / 2) * w,
      a[1] + Math.sin(ang + (dir * PI) / 2) * w,
    ];
    let c: Pair = [a[0] + 1 * Math.cos(ang), a[1] + 1 * Math.sin(ang)];
    let d: Pair = [a[0] + 1 * Math.cos(ang + PI), a[1] + 1 * Math.sin(ang + PI)];
    let e = lerp2d(...c, ...b, 0.7);
    let f = lerp2d(...d, ...b, 0.7);
    let g: Pair = [
      a[0] + Math.cos(ang + dir * (PI / 2 + 0.15)) * w,
      a[1] + Math.sin(ang + dir * (PI / 2 + 0.15)) * w,
    ];
    out.push([c, e, g, f, d]);
    // out.push(barbel(...a,10,ang+dir*PI/2))
  }
  return out;
}

function fish_jaw(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): [Polyline, Polyline[]] {
  let n = 10;
  let ang = Math.atan2(y2 - y0, x2 - x0);
  let d = dist(x0, y0, x2, y2);
  let o: Polyline = [];
  for (let i = 0; i < n; i++) {
    let t = i / (n - 1);
    let s = Math.sin(t * PI);
    let w = (s * d) / 20;
    let p = lerp2d(x2, y2, x0, y0, t);
    let q: Pair = [p[0] + Math.cos(ang - PI / 2) * w, p[1] + Math.sin(ang - PI / 2) * w];
    let qq: Pair = [
      q[0] + (noise(q[0] * 0.01, q[1] * 0.01, 1) - 0.5) * 4 * s,
      q[1] + (noise(q[0] * 0.01, q[1] * 0.01, 4) - 0.5) * 4 * s,
    ];
    o.push(qq);
  }
  return [
    [
      [x2, y2],
      [x1, y1],
      [x0, y0],
    ],
    [o, ...vein_shape(o, 5)],
  ];
}

function fish_eye_a(ex: number, ey: number, rad: number): [Polyline, Polyline[]] {
  let n = 20;
  let eye0: Polyline = [];
  let eye1: Polyline = [];
  let eye2: Polyline = [];
  for (let i = 0; i < n; i++) {
    let t = i / (n - 1);
    let a = t * PI * 2 + (Math.PI / 4) * 3;
    eye0.push([ex + Math.cos(a) * rad, ey + Math.sin(a) * rad]);
    if (t > 0.5) {
      eye1.push([ex + Math.cos(a) * (rad * 0.8), ey + Math.sin(a) * (rad * 0.8)]);
    }
    eye2.push([ex + Math.cos(a) * (rad * 0.4) - 0.75, ey + Math.sin(a) * (rad * 0.4) - 0.75]);
  }

  let ef = shade_shape(eye2, 2.7, 10, 10);
  return [eye0, [eye0, eye1, eye2, ...ef]];
}

function fish_eye_b(ex: number, ey: number, rad: number): [Polyline, Polyline[]] {
  let n = 20;
  let eye0: Polyline = [];
  let eye1: Polyline[] = [];
  let eye2: Polyline = [];
  for (let i = 0; i < n; i++) {
    let t = i / (n - 1);
    let a = t * PI * 2 + Math.E;
    eye0.push([ex + Math.cos(a) * rad, ey + Math.sin(a) * rad]);
    eye2.push([ex + Math.cos(a) * (rad * 0.4), ey + Math.sin(a) * (rad * 0.4)]);
  }
  let m = ~~((rad * 0.6) / 2);
  for (let i = 0; i < m; i++) {
    let r = rad - i * 2;
    let e: Polyline = [];
    for (let i = 0; i < n; i++) {
      let t = i / (n - 1);
      let a = lerp((PI * 7) / 8, (PI * 13) / 8, t);
      e.push([ex + Math.cos(a) * r, ey + Math.sin(a) * r]);
    }
    eye1.push(e);
  }
  let trig: Polyline = [
    [ex + Math.cos((-PI * 3) / 4) * (rad * 0.9), ey + Math.sin((-PI * 3) / 4) * (rad * 0.9)],
    [ex + 1, ey + 1],
    [ex + Math.cos((-PI * 11) / 12) * (rad * 0.9), ey + Math.sin((-PI * 11) / 12) * (rad * 0.9)],
  ];
  trig = resample(trig, 3);
  for (let i = 0; i < trig.length; i++) {
    let [x, y] = trig[i];
    x += noise(x * 0.1, y * 0.1, 22) * 4 - 2;
    y += noise(x * 0.1, y * 0.1, 33) * 4 - 2;
    trig[i] = [x, y];
  }

  let ef = fill_shape(eye2, 1.5);

  ef = clip_multi(ef, trig).false;
  eye1 = clip_multi(eye1, trig).false;
  let eye2P = clip(eye2, trig).false;

  return [eye0, [eye0, ...eye1, ...eye2P, ...ef]];
}

function barbel(x: number, y: number, n: number, ang: number, dd = 3): Polyline {
  let curve: Polyline = [[x, y]];
  let sd = rand() * PI * 2;
  let ar = 1;
  for (let i = 0; i < n; i++) {
    x += Math.cos(ang) * dd;
    y += Math.sin(ang) * dd;
    ang += (noise(i * 0.1, sd) - 0.5) * ar;
    if (i < n / 2) {
      ar *= 1.02;
    } else {
      ar *= 0.92;
    }
    curve.push([x, y]);
  }
  let o0: Polyline = [];
  let o1: Polyline = [];
  for (let i = 0; i < n - 1; i++) {
    let t = i / (n - 1);
    let w = 1.5 * (1 - t);

    let a = curve[i - 1];
    let b = curve[i];
    let c = curve[i + 1];

    let a1 = Math.atan2(c[1] - b[1], c[0] - b[0]);
    let a2;

    if (a) {
      let a0 = Math.atan2(a[1] - b[1], a[0] - b[0]);

      a1 -= PI * 2;
      while (a1 < a0) {
        a1 += PI * 2;
      }
      a2 = (a0 + a1) / 2;
    } else {
      a2 = a1 - PI / 2;
    }

    o0.push([b[0] + Math.cos(a2) * w, b[1] + Math.sin(a2) * w]);
    o1.push([b[0] + Math.cos(a2 + PI) * w, b[1] + Math.sin(a2 + PI) * w]);
  }
  o0.push(curve[curve.length - 1]);
  return o0.concat(o1.slice().reverse());
}

function fish_head(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  arg: Haploid,
): [Polyline, Polyline[], { neckline: Pair }] {
  let n = 20;
  let curve0: Polyline = [];
  let curve1: Polyline = [];
  let curve2: Polyline = [];
  for (let i = 0; i < n; i++) {
    let t = i / (n - 1);
    let a = (PI / 2) * t;
    let x = x1 - pow(Math.cos(a), 1.5) * (x1 - x0);
    let y = y0 - pow(Math.sin(a), 1.5) * (y0 - y1);
    // let x = lerp(x0,x1,t);
    // let y = lerp(y0,y1,t);

    let dx = (noise(x * 0.01, y * 0.01, 9) * 40 - 20) * (1.01 - t);
    let dy = (noise(x * 0.01, y * 0.01, 8) * 40 - 20) * (1.01 - t);
    curve0.push([x + dx, y + dy]);
  }

  const neckline = curve0[curve0.length - 1];

  for (let i = 0; i < n; i++) {
    let t = i / (n - 1);
    let a = (PI / 2) * t;
    let x = x2 - pow(Math.cos(a), 0.8) * (x2 - x0);
    let y = y0 + pow(Math.sin(a), 1.5) * (y2 - y0);

    let dx = (noise(x * 0.01, y * 0.01, 9) * 40 - 20) * (1.01 - t);
    let dy = (noise(x * 0.01, y * 0.01, 8) * 40 - 20) * (1.01 - t);
    curve1.unshift([x + dx, y + dy]);
  }
  let ang = Math.atan2(y2 - y1, x2 - x1);
  for (let i = 1; i < n - 1; i++) {
    let t = i / (n - 1);
    let p = lerp2d(x1, y1, x2, y2, t);
    let s = pow(Math.sin(t * Math.PI), 0.5);
    let r = noise(t * 2, 1.2) * s * 20;

    let dx = Math.cos(ang - Math.PI / 2) * r;
    let dy = Math.sin(ang - Math.PI / 2) * r;
    curve2.push([p[0] + dx, p[1] + dy]);
  }
  let outline: Polyline = curve0.concat(curve2).concat(curve1);

  let inline: Polyline = curve2
    .slice(~~(curve2.length / 3))
    .concat(curve1.slice(0, ~~(curve1.length / 2)))
    .slice(0, curve0.length);
  for (let i = 0; i < inline.length; i++) {
    let t = i / (inline.length - 1);
    let s = Math.sin(t * PI) ** 2 * 0.1 + 0.12;
    inline[i] = lerp2d(...inline[i], ...curve0[i], s);
  }
  let dix = (x0 - inline[inline.length - 1][0]) * 0.3;
  let diy = (y0 - inline[inline.length - 1][1]) * 0.2;
  for (let i = 0; i < inline.length; i++) {
    inline[i][0] += dix;
    inline[i][1] += diy;
  }

  let par = [0.475, 0.375];
  let ex = x0 * par[0] + x1 * par[1] + x2 * (1 - par[0] - par[1]);
  let ey = y0 * par[0] + y1 * par[1] + y2 * (1 - par[0] - par[1]);
  let d0 = pt_seg_dist([ex, ey], [x0, y0], [x1, y1]);
  let d1 = pt_seg_dist([ex, ey], [x0, y0], [x2, y2]);
  if (d0 < arg.eye_size && d1 < arg.eye_size) {
    arg.eye_size = Math.min(d0, d1);
  } else if (d0 < arg.eye_size) {
    let ang = Math.atan2(y1 - y0, x1 - x0) + PI / 2;
    ex = x0 * 0.5 + x1 * 0.5 + Math.cos(ang) * arg.eye_size;
    ey = y0 * 0.5 + y1 * 0.5 + Math.sin(ang) * arg.eye_size;
  }

  let jaw_pt0: Pair = curve1[18 - arg.mouth_size];
  let jaw_l = dist(...jaw_pt0, ...curve1[18]) * arg.jaw_size;
  let jaw_ang0 = Math.atan2(curve1[18][1] - jaw_pt0[1], curve1[18][0] - jaw_pt0[0]);
  let jaw_ang = jaw_ang0 - ((arg.has_teeth * 0.5 + 0.5) * arg.jaw_open * PI) / 4;
  let jaw_pt1: Pair = [
    jaw_pt0[0] + Math.cos(jaw_ang) * jaw_l,
    jaw_pt0[1] + Math.sin(jaw_ang) * jaw_l,
  ];

  let [eye0, ef] = (arg.eye_type ? fish_eye_b : fish_eye_a)(ex, ey, arg.eye_size);
  ef = clip_multi(ef, outline).true;

  let inlines = clip(inline, eye0).false;

  let lip0 = fish_lip(...jaw_pt0, ...curve1[18], 3);

  let lip1: Polyline = fish_lip(...jaw_pt0, ...jaw_pt1, 3);

  let [jc, jaw] = fish_jaw(...curve1[15 - arg.mouth_size], ...jaw_pt0, ...jaw_pt1);

  jaw = clip_multi(jaw, lip1).false;
  jaw = clip_multi(jaw, outline).false;
  jaw.push(jc);

  let teeth0s: Polyline[] = [];
  let teeth1s: Polyline[] = [];
  if (arg.has_teeth) {
    let teeth0 = fish_teeth(...jaw_pt0, ...curve1[18], arg.teeth_length, -1, arg.teeth_space);
    let teeth1 = fish_teeth(...jaw_pt0, ...jaw_pt1, arg.teeth_length, 1, arg.teeth_space);

    teeth0s = clip_multi(teeth0, lip0).false;
    teeth1s = clip_multi(teeth1, lip1).false;
  }

  let olines = clip(outline, lip0).false;

  let lip0s = clip(lip0, lip1).false;

  let sh = shade_shape(outline, 6, -6, -6);
  sh = clip_multi(sh, lip0).false;
  sh = clip_multi(sh, eye0).false;

  let sh2 = vein_shape(outline, arg.head_texture_amount);

  // let sh2 = patternshade_shape(outline,3,(x,y)=>{
  //   return noise(x*0.1,y*0.1)>0.6;
  // })

  sh2 = clip_multi(sh2, lip0).false;
  sh2 = clip_multi(sh2, eye0).false;

  let bbs = [];

  let lip1s = [lip1];

  if (arg.has_moustache) {
    let bb0 = barbel(...jaw_pt0, arg.moustache_length, (PI * 3) / 4, 1.5);
    lip1s = clip(lip1, bb0).false;
    jaw = clip_multi(jaw, bb0).false;
    bbs.push(bb0);
  }

  if (arg.has_beard) {
    let jaw_pt: Pair;
    if (jaw[0] && jaw[0].length) {
      jaw_pt = jaw[0][~~(jaw[0].length / 2)] as Pair;
    } else {
      jaw_pt = curve1[8];
    }
    let bb1 = trsl_poly(
      barbel(...jaw_pt, arg.beard_length, PI * 0.6 + rand() * 0.4 - 0.2),
      rand() * 1 - 0.5,
      rand() * 1 - 0.5,
    );
    let bb2 = trsl_poly(
      barbel(...jaw_pt, arg.beard_length, PI * 0.6 + rand() * 0.4 - 0.2),
      rand() * 1 - 0.5,
      rand() * 1 - 0.5,
    );
    let bb3 = trsl_poly(
      barbel(...jaw_pt, arg.beard_length, PI * 0.6 + rand() * 0.4 - 0.2),
      rand() * 1 - 0.5,
      rand() * 1 - 0.5,
    );

    let bb3c = clip_multi([bb3], bb2).false;
    bb3c = clip_multi(bb3c, bb1).false;
    let bb2c = clip_multi([bb2], bb1).false;
    bbs.push(bb1, ...bb2c, ...bb3c);
  }

  let outlinel: Polyline = [
    [0, 0],
    [curve0[curve0.length - 1][0], 0],
    curve0[curve0.length - 1],
    ...curve2,
    curve1[0],
    [curve1[0][0], 300],
    [0, 300],
  ];

  return [
    outlinel,
    [
      ...olines,
      ...inlines,
      ...lip0s,
      ...lip1s,
      ...ef,
      ...sh,
      ...sh2,
      ...bbs,
      ...teeth0s,
      ...teeth1s,
      ...jaw,
    ] as Polyline[],
    {
      neckline,
    },
  ];
}

function bean(x: number) {
  return Math.pow(0.25 - Math.pow(x - 0.5, 2), 0.5) * (2.6 + 2.4 * Math.pow(x, 1.5)) * 0.542;
}

function deviate(n: number) {
  return rand() * 2 * n - n;
}

function fish(arg: Haploid) {
  let n = 32;
  let curve0: Polyline = [];
  let curve1: Polyline = [];
  if (arg.body_curve_type == 0) {
    let s = arg.body_curve_amount;
    for (let i = 0; i < n; i++) {
      let t = i / (n - 1);

      let x = 225 + (t - 0.5) * arg.body_length;
      let y =
        150 - (Math.sin(t * PI) * lerp(0.5, 1, noise(t * 2, 1)) * s + (1 - s)) * arg.body_height;
      curve0.push([x, y]);
    }
    for (let i = 0; i < n; i++) {
      let t = i / (n - 1);
      let x = 225 + (t - 0.5) * arg.body_length;
      let y =
        150 + (Math.sin(t * PI) * lerp(0.5, 1, noise(t * 2, 2)) * s + (1 - s)) * arg.body_height;
      curve1.push([x, y]);
    }
  } else if (arg.body_curve_type == 1) {
    for (let i = 0; i < n; i++) {
      let t = i / (n - 1);

      let x = 225 + (t - 0.5) * arg.body_length;
      let y =
        150 -
        lerp(1 - arg.body_curve_amount, 1, lerp(0, 1, noise(t * 1.2, 1)) * bean(1 - t)) *
          arg.body_height;
      curve0.push([x, y]);
    }
    for (let i = 0; i < n; i++) {
      let t = i / (n - 1);
      let x = 225 + (t - 0.5) * arg.body_length;
      let y =
        150 +
        lerp(1 - arg.body_curve_amount, 1, lerp(0, 1, noise(t * 1.2, 2)) * bean(1 - t)) *
          arg.body_height;
      curve1.push([x, y]);
    }
  }
  let outline = curve0.concat(curve1.slice().reverse());
  let sh = shade_shape(outline, 8, -12, -12);

  let pattern_func: any;
  if (arg.pattern_type == 0) {
    //none
    pattern_func = null;
  } else if (arg.pattern_type == 1) {
    // pattern_func = (x,y)=>{
    //   return noise(x*0.1,y*0.1)>0.55;
    // };
    pattern_func = pattern_dot(arg.pattern_scale);
  } else if (arg.pattern_type == 2) {
    pattern_func = (x: number, y: number) => {
      return noise(x * 0.1, y * 0.1) * Math.max(0.35, (y - 10) / 280) < 0.2;
    };
  } else if (arg.pattern_type == 3) {
    pattern_func = (x: number, y: number) => {
      let dx = noise(x * 0.01, y * 0.01) * 30;
      return ~~((x + dx) / (30 * arg.pattern_scale)) % 2 == 1;
    };
  } else if (arg.pattern_type == 4) {
    //small dot;
    pattern_func = null;
  }

  let bd: Polyline[];
  if (arg.scale_type == 0) {
    bd = fish_body_a(curve0, curve1, arg.scale_scale, pattern_func!);
  } else if (arg.scale_type == 1) {
    bd = fish_body_b(curve0, curve1, arg.scale_scale, pattern_func!);
  } else if (arg.scale_type == 2) {
    bd = fish_body_c(curve0, curve1, arg.scale_scale);
  } else if (arg.scale_type == 3) {
    bd = fish_body_d(curve0, curve1, arg.scale_scale);
  }

  let f0_func: any, f0_a0: any, f0_a1: any, f0_cv;
  if (arg.dorsal_type == 0) {
    f0_a0 = 0.2 + deviate(0.05);
    f0_a1 = 0.3 + deviate(0.05);
    f0_cv = 0;
    f0_func = (t: number) =>
      (0.3 + noise(t * 3) * 0.7) * arg.dorsal_length * Math.sin(t * PI) ** 0.5;
  } else if (arg.dorsal_type == 1) {
    f0_a0 = 0.6 + deviate(0.05);
    f0_a1 = 0.3 + deviate(0.05);
    f0_cv = arg.dorsal_length / 8;
    f0_func = (t: number) => arg.dorsal_length * (Math.pow(t - 1, 2) * 0.5 + (1 - t) * 0.5);
  }
  let f0_curve, c0: Polyline, f0;
  if (arg.dorsal_texture_type == 0) {
    f0_curve = resample(curve0.slice(arg.dorsal_start, arg.dorsal_end), 5);
    [c0, f0] = fin_a(f0_curve, f0_a0!, f0_a1!, f0_func!, false, f0_cv, 0);
  } else {
    f0_curve = resample(curve0.slice(arg.dorsal_start, arg.dorsal_end), 15);
    [c0, f0] = fin_b(f0_curve, f0_a0!, f0_a1!, f0_func!);
  }
  f0 = clip_multi(f0, trsl_poly(outline, 0, 0.001)).false;

  let f1_curve: Polyline = [];
  let f1_func, f1_a0, f1_a1, f1_soft, f1_cv;
  let f1_pt = lerp2d(...curve0[arg.wing_start], ...curve1[arg.wing_end], arg.wing_y);

  for (let i = 0; i < 10; i++) {
    let t = i / 9;
    let y = lerp(f1_pt[1] - arg.wing_width / 2, f1_pt[1] + arg.wing_width / 2, t);
    f1_curve.push([f1_pt[0] /*+ Math.sin(t*PI)*2*/, y]);
  }
  if (arg.wing_type == 0) {
    f1_a0 = -0.4 + deviate(0.05);
    f1_a1 = 0.4 + deviate(0.05);
    f1_soft = 10;
    f1_cv = 0;
    f1_func = (t: number) =>
      ((40 + (20 + noise(t * 3) * 70) * Math.sin(t * PI) ** 0.5) / 130) * arg.wing_length;
  } else {
    f1_a0 = 0 + deviate(0.05);
    f1_a1 = 0.4 + deviate(0.05);
    f1_soft = 5;
    f1_cv = arg.wing_length / 25;
    f1_func = (t: number) => arg.wing_length * (1 - t * 0.95);
  }

  let c1, f1;
  if (arg.wing_texture_type == 0) {
    f1_curve = resample(f1_curve, 1.5);
    [c1, f1] = fin_a(f1_curve, f1_a0, f1_a1, f1_func, 1, f1_cv, 0, f1_soft);
  } else {
    f1_curve = resample(f1_curve, 4);
    [c1, f1] = fin_b(f1_curve, f1_a0, f1_a1, f1_func, 0.3);
  }
  bd = clip_multi(bd!, c1).false;

  let f2_curve;
  let f2_func, f2_a0, f2_a1;
  if (arg.pelvic_type == 0) {
    f2_a0 = -0.8 + deviate(0.05);
    f2_a1 = -0.5 + deviate(0.05);
    f2_func = (t: number) =>
      ((10 + (15 + noise(t * 3) * 60) * Math.sin(t * PI) ** 0.5) / 85) * arg.pelvic_length;
  } else {
    f2_a0 = -0.9 + deviate(0.05);
    f2_a1 = -0.3 + deviate(0.05);
    f2_func = (t: number) => (t * 0.5 + 0.5) * arg.pelvic_length;
  }
  let c2, f2;
  if (arg.pelvic_texture_type == 0) {
    f2_curve = resample(
      curve1.slice(arg.pelvic_start, arg.pelvic_end).reverse(),
      arg.pelvic_type ? 2 : 5,
    );
    [c2, f2] = fin_a(f2_curve, f2_a0, f2_a1, f2_func);
  } else {
    f2_curve = resample(
      curve1.slice(arg.pelvic_start, arg.pelvic_end).reverse(),
      arg.pelvic_type ? 2 : 15,
    );
    [c2, f2] = fin_b(f2_curve, f2_a0, f2_a1, f2_func);
  }
  f2 = clip_multi(f2, c1).false;

  let f3_curve;
  let f3_func, f3_a0, f3_a1;
  if (arg.anal_type == 0) {
    f3_a0 = -0.4 + deviate(0.05);
    f3_a1 = -0.4 + deviate(0.05);
    f3_func = (t: number) =>
      ((10 + (10 + noise(t * 3) * 30) * Math.sin(t * PI) ** 0.5) / 50) * arg.anal_length;
  } else {
    f3_a0 = -0.4 + deviate(0.05);
    f3_a1 = -0.4 + deviate(0.05);
    f3_func = (t: number) => arg.anal_length * (t * t * 0.8 + 0.2);
  }
  let c3, f3;
  if (arg.anal_texture_type == 0) {
    f3_curve = resample(curve1.slice(arg.anal_start, arg.anal_end).reverse(), 5);
    [c3, f3] = fin_a(f3_curve, f3_a0, f3_a1, f3_func);
  } else {
    f3_curve = resample(curve1.slice(arg.anal_start, arg.anal_end).reverse(), 15);
    [c3, f3] = fin_b(f3_curve, f3_a0, f3_a1, f3_func);
  }
  f3 = clip_multi(f3, c1).false;

  let f4_curve: Polyline, c4: Polyline, f4: Polyline[];
  let f4_r = dist(...curve0[curve0.length - 2], ...curve1[curve1.length - 2]);
  let f4_n = ~~(f4_r / 1.5);
  f4_n = Math.max(Math.min(f4_n, 20), 8);
  let f4_d = f4_r / f4_n;
  // console.log(f4_n,f4_d);
  if (arg.tail_type == 0) {
    f4_curve = [curve0[curve0.length - 1], curve1[curve1.length - 1]];
    f4_curve = resample(f4_curve, f4_d);
    [c4, f4] = fin_a(
      f4_curve,
      -0.6,
      0.6,
      (t: number) =>
        ((75 - (10 + noise(t * 3) * 10) * Math.sin(3 * t * PI - PI)) / 75) * arg.tail_length,
      1,
    );
  } else if (arg.tail_type == 1) {
    f4_curve = [curve0[curve0.length - 2], curve1[curve1.length - 2]];
    f4_curve = resample(f4_curve, f4_d);
    [c4, f4] = fin_a(
      f4_curve,
      -0.6,
      0.6,
      (t: number) => arg.tail_length * (Math.sin(t * PI) * 0.5 + 0.5),
      1,
    );
  } else if (arg.tail_type == 2) {
    f4_curve = [curve0[curve0.length - 1], curve1[curve1.length - 1]];
    f4_curve = resample(f4_curve, f4_d * 0.7);
    let cv = arg.tail_length / 8;
    [c4, f4] = fin_a(
      f4_curve,
      -0.6,
      0.6,
      (t: number) => (Math.abs(Math.cos(PI * t)) * 0.8 + 0.2) * arg.tail_length,
      1,
      cv,
      -cv,
    );
  } else if (arg.tail_type == 3) {
    f4_curve = [curve0[curve0.length - 2], curve1[curve1.length - 2]];
    f4_curve = resample(f4_curve, f4_d);
    [c4, f4] = fin_a(
      f4_curve,
      -0.6,
      0.6,
      (t: number) => (1 - Math.sin(t * PI) * 0.3) * arg.tail_length,
      1,
    );
  } else if (arg.tail_type == 4) {
    f4_curve = [curve0[curve0.length - 2], curve1[curve1.length - 2]];
    f4_curve = resample(f4_curve, f4_d);
    [c4, f4] = fin_a(
      f4_curve,
      -0.6,
      0.6,
      (t: number) => (1 - Math.sin(t * PI) * 0.6) * (1 - t * 0.45) * arg.tail_length,
      1,
    );
  } else if (arg.tail_type == 5) {
    f4_curve = [curve0[curve0.length - 2], curve1[curve1.length - 2]];
    f4_curve = resample(f4_curve, f4_d);
    [c4, f4] = fin_a(
      f4_curve,
      -0.6,
      0.6,
      (t: number) => (1 - Math.sin(t * PI) ** 0.4 * 0.55) * arg.tail_length,
      1,
    );
  }
  // f4 = clip_multi(f4,trsl_poly(outline,-1,0)).false;
  bd = clip_multi(bd, trsl_poly(c4!, 1, 0)).false;

  f4 = clip_multi(f4!, c1).false;

  let f5_curve,
    c5: Polyline,
    f5: Polyline[] = [];
  if (arg.finlet_type == 0) {
    //pass
  } else if (arg.finlet_type == 1) {
    f5_curve = resample(curve0.slice(arg.dorsal_end, -2), 5);
    [c5, f5] = finlet(f5_curve, 5);
    f5_curve = resample(curve1.slice(arg.anal_end, -2).reverse(), 5);
    if (f5_curve.length > 1) {
      [c5, f5] = finlet(f5_curve, 5);
    }
  } else if (arg.finlet_type == 2) {
    f5_curve = resample(curve0.slice(27, 30), 5);
    [c5, f5] = fin_adipose(f5_curve, 20, -5, 6);
    outline = poly_union(outline, trsl_poly(c5, 0, -1));
  } else {
    f5_curve = resample(curve0.slice(arg.dorsal_end + 2, -3), 5);
    if (f5_curve.length > 2) {
      [c5, f5] = fin_a(
        f5_curve,
        0.2,
        0.3,
        (t: number) =>
          (0.3 + noise(t * 3) * 0.7) * arg.dorsal_length * 0.6 * Math.sin(t * PI) ** 0.5,
      );
    }
  }
  let cf: Polyline, fh: Polyline[], head_poi: any;
  if (arg.neck_type == 0) {
    [cf, fh, head_poi] = fish_head(
      50 - arg.head_length,
      150 + arg.nose_height,
      ...curve0[6],
      ...curve1[5],
      arg,
    );
  } else {
    [cf, fh, head_poi] = fish_head(
      50 - arg.head_length,
      150 + arg.nose_height,
      ...curve0[5],
      ...curve1[6],
      arg,
    );
  }
  head_poi.length = arg.head_length;
  bd = clip_multi(bd, cf).false;

  sh = clip_multi(sh, cf).false;
  sh = clip_multi(sh, c1).false;

  f1 = clip_multi(f1, cf).false;

  f0 = clip_multi(f0, c1).false;

  let sh2: Polyline[] = [];
  if (pattern_func!) {
    if (arg.scale_type > 1) {
      sh2 = patternshade_shape(poly_union(outline, trsl_poly(c0, 0, 3)), 3.5, pattern_func);
    } else {
      sh2 = patternshade_shape(c0, 4.5, pattern_func);
    }
    sh2 = clip_multi(sh2, cf).false;
    sh2 = clip_multi(sh2, c1).false;
  }

  let sh3: Polyline[] = [];
  if (arg.pattern_type == 4) {
    sh3 = smalldot_shape(poly_union(outline, trsl_poly(c0, 0, 5)), arg.pattern_scale);
    sh3 = clip_multi(sh3, c1).false;
    sh3 = clip_multi(sh3, cf).false;
  }

  const lines = bd
    .concat(f0)
    .concat(f1)
    .concat(f2)
    .concat(f3)
    .concat(f5)
    .concat(fh)
    .concat(sh)
    .concat(sh2)
    .concat(sh3)
    .concat(f4)
    // concat([cf]).
    .concat();

  return { lines, poi: { head: head_poi } };
}

function reframe(polylines: Polyline[], pad = 20, text: string | null = null) {
  let W = 500 - pad * 2;
  let H = 300 - pad * 2 - (text ? 10 : 0);
  let bbox = get_bbox(polylines.flat());
  let sw = W / bbox.w;
  let sh = H / bbox.h;
  let s = Math.min(sw, sh);
  let px = (W - bbox.w * s) / 2;
  let py = (H - bbox.h * s) / 2;
  for (let i = 0; i < polylines.length; i++) {
    for (let j = 0; j < polylines[i].length; j++) {
      let [x, y] = polylines[i][j];
      x = (x - bbox.x) * s + px + pad;
      y = (y - bbox.y) * s + py + pad;
      polylines[i][j] = [x, y];
    }
  }
  return { polylines, layout: { bbox, px, py, s, p: pad } };
}

function cleanup(polylines: Polyline[]) {
  for (let i = polylines.length - 1; i >= 0; i--) {
    polylines[i] = approx_poly_dp(polylines[i], 0.1);
    for (let j = 0; j < polylines[i].length; j++) {
      for (let k = 0; k < polylines[i][j].length; k++) {
        polylines[i][j][k] = ~~(polylines[i][j][k] * 10000) / 10000;
      }
    }
    if (polylines[i].length < 2) {
      polylines.splice(i, 1);
      continue;
    }
    if (polylines[i].length == 2) {
      // @ts-ignore
      if (dist(...polylines[0], ...polylines[1]) < 0.9) {
        polylines.splice(i, 1);
        continue;
      }
    }
  }
  return polylines;
}

export type Haploid = {
  body_curve_type: 0 | 1;
  body_curve_amount: number;
  body_length: number;
  body_height: number;
  scale_type: 0 | 1 | 2 | 3;
  scale_scale: number;
  pattern_type: 0 | 1 | 2 | 3 | 4;
  pattern_scale: number;
  dorsal_texture_type: 0 | 1;
  dorsal_type: 0 | 1;
  dorsal_length: number;
  dorsal_start: number;
  dorsal_end: number;
  wing_texture_type: 0 | 1;
  wing_type: 0 | 1;
  wing_start: number;
  wing_end: number;
  wing_y: number;
  wing_length: number;
  wing_width: number;
  pelvic_start: number;
  pelvic_end: number;
  pelvic_length: number;
  pelvic_type: 0 | 1;
  pelvic_texture_type: 0 | 1;
  anal_start: number;
  anal_end: number;
  anal_length: number;
  anal_type: 0 | 1;
  anal_texture_type: 0 | 1;
  tail_type: 0 | 1 | 2 | 3 | 4 | 5;
  tail_length: number;
  finlet_type: 0 | 1 | 2 | 3;
  neck_type: 0 | 1;
  nose_height: number;
  mouth_size: number;
  head_length: number;
  head_texture_amount: number;
  has_moustache: 0 | 1;
  moustache_length: number;
  has_beard: 0 | 1;
  has_teeth: 0 | 1;
  teeth_length: number;
  teeth_space: number;
  beard_length: number;
  eye_type: 0 | 1;
  eye_size: number;
  jaw_size: number;
  jaw_open: 0 | 1;
  color: 'rainbow' | 'normal';
};

export type Diploid = [Haploid, Haploid];

export type Organism = { genotype: Diploid; phenotype: Haploid };

function choice<T>(opts: T[], percs?: number[]): T {
  if (!percs) {
    percs = opts.map(() => 1);
  }
  let s = 0;
  for (let i = 0; i < percs.length; i++) {
    s += percs[i];
  }
  let r = rand() * s;
  s = 0;
  for (let i = 0; i < percs.length; i++) {
    s += percs[i];
    if (r <= s) {
      return opts[i];
    }
  }
  throw new Error('no choice');
}

function rndtri(a: number, b: number, c: number) {
  let s0 = (b - a) / 2;
  let s1 = (c - b) / 2;
  let s = s0 + s1;
  let r = rand() * s;
  if (r < s0) {
    //d * d/(b-a) / 2 = r;
    let d = Math.sqrt(2 * r * (b - a));
    return a + d;
  }
  //d * d/(c-b) / 2 = s-r;
  let d = Math.sqrt(2 * (s - r) * (c - b));
  return c - d;
}

function default_params(): Haploid {
  return {
    body_curve_type: 0,
    body_curve_amount: 0.85,
    body_length: 350,
    body_height: 90,
    scale_type: 1,
    scale_scale: 1,
    pattern_type: 3,
    pattern_scale: 1,
    dorsal_texture_type: 1,
    dorsal_type: 0,
    dorsal_length: 100,
    dorsal_start: 8,
    dorsal_end: 27,
    wing_texture_type: 0,
    wing_type: 0,
    wing_start: 6,
    wing_end: 6,
    wing_y: 0.7,
    wing_length: 130,
    wing_width: 10,
    pelvic_start: 9,
    pelvic_end: 14,
    pelvic_length: 85,
    pelvic_type: 0,
    pelvic_texture_type: 0,
    anal_start: 19,
    anal_end: 29,
    anal_length: 50,
    anal_type: 0,
    anal_texture_type: 0,
    tail_type: 0,
    tail_length: 75,
    finlet_type: 0,
    neck_type: 0,
    nose_height: 0,
    mouth_size: 8,
    head_length: 30,
    head_texture_amount: 60,
    has_moustache: 1,
    moustache_length: 10,
    has_beard: 0,
    has_teeth: 1,
    teeth_length: 8,
    teeth_space: 3.5,
    beard_length: 30,
    eye_type: 1,
    eye_size: 10,
    jaw_size: 1,
    jaw_open: 1,
    color: 'normal',
  };
}

function generate_params(): Haploid {
  let arg = default_params();
  arg.body_curve_type = choice([0, 1]);
  arg.body_curve_amount = rndtri(0.5, 0.85, 0.98);
  arg.body_length = rndtri(200, 350, 420);
  arg.body_height = rndtri(45, 90, 150);
  arg.scale_type = choice([0, 1, 2, 3]);
  arg.scale_scale = rndtri(0.8, 1, 1.5);
  arg.pattern_type = choice([0, 1, 2, 3, 4]);
  arg.pattern_scale = rndtri(0.5, 1, 2);
  arg.dorsal_texture_type = choice([0, 1]);
  arg.dorsal_type = choice([0, 1]);
  arg.dorsal_length = rndtri(30, 90, 180);
  if (arg.dorsal_type == 0) {
    arg.dorsal_start = ~~rndtri(7, 8, 15);
    arg.dorsal_end = ~~rndtri(20, 27, 28);
  } else {
    arg.dorsal_start = ~~rndtri(11, 12, 16);
    arg.dorsal_end = ~~rndtri(19, 21, 24);
  }
  arg.wing_texture_type = choice([0, 1]);
  arg.wing_type = choice([0, 1]);
  if (arg.wing_type == 0) {
    arg.wing_length = rndtri(40, 130, 200);
  } else {
    arg.wing_length = rndtri(40, 150, 350);
  }
  if (arg.wing_texture_type == 0) {
    arg.wing_width = rndtri(7, 10, 20);
    arg.wing_y = rndtri(0.45, 0.7, 0.85);
  } else {
    arg.wing_width = rndtri(20, 30, 50);
    arg.wing_y = rndtri(0.45, 0.65, 0.75);
  }

  arg.wing_start = ~~rndtri(5, 6, 8);
  arg.wing_end = ~~rndtri(5, 6, 8);

  arg.pelvic_texture_type = arg.dorsal_texture_type ? choice([0, 1]) : 0;
  arg.pelvic_type = choice([0, 1]);
  arg.pelvic_length = rndtri(30, 85, 140);
  if (arg.pelvic_type == 0) {
    arg.pelvic_start = ~~rndtri(7, 9, 11);
    arg.pelvic_end = ~~rndtri(13, 14, 15);
  } else {
    arg.pelvic_start = ~~rndtri(7, 9, 12);
    arg.pelvic_end = arg.pelvic_start + 2;
  }

  arg.anal_texture_type = arg.dorsal_texture_type ? choice([0, 1]) : 0;
  arg.anal_type = choice([0, 1]);
  arg.anal_length = rndtri(20, 50, 80);
  arg.anal_start = ~~rndtri(16, 19, 23);
  arg.anal_end = ~~rndtri(25, 29, 31);

  arg.tail_type = choice([0, 1, 2, 3, 4, 5]);
  arg.tail_length = rndtri(50, 75, 180);

  arg.finlet_type = choice([0, 1, 2, 3]);

  arg.neck_type = choice([0, 1]);
  arg.nose_height = rndtri(-50, 0, 35);
  arg.head_length = rndtri(20, 30, 35);
  arg.mouth_size = ~~rndtri(6, 8, 11);

  arg.head_texture_amount = ~~rndtri(30, 60, 160);
  arg.has_moustache = choice([0, 0, 0, 1]);
  arg.has_beard = choice([0, 0, 0, 0, 0, 1]);
  arg.moustache_length = ~~rndtri(10, 20, 40);
  arg.beard_length = ~~rndtri(20, 30, 50);

  arg.eye_type = choice([0, 1]);
  arg.eye_size = rndtri(8, 10, 28); //arg.body_height/6//Math.min(arg.body_height/6,rndtri(8,10,30));

  arg.jaw_size = rndtri(0.7, 1, 1.4);

  arg.has_teeth = choice([0, 1, 1]);
  arg.teeth_length = rndtri(5, 8, 15);
  arg.teeth_space = rndtri(3, 3.5, 6);

  return arg;
}

type DominanceFn<T> = (g: Haploid, l: T, r: T) => T;

const dominances: { [K in keyof Haploid]: DominanceFn<Haploid[K]> } = {
  body_curve_type: mendelian([0, 1]),
  body_curve_amount: incomplete(0.5, 0.98),
  body_length: incomplete(200, 420),
  body_height: incomplete(45, 150),
  scale_type: mendelian([0, 1, 2, 3]),
  scale_scale: incomplete(0.8, 1.5),
  pattern_type: mendelian([0, 1, 2, 3, 4]),
  pattern_scale: incomplete(0.5, 2),
  dorsal_texture_type: mendelian([0, 1]),
  dorsal_type: mendelian([0, 1]),
  dorsal_length: incomplete(30, 180),
  dorsal_start: epistatic('dorsal_type', {
    0: incomplete(7, 15, undefined, Math.floor),
    1: incomplete(11, 16, undefined, Math.floor),
  }),
  dorsal_end: epistatic('dorsal_type', {
    0: incomplete(20, 28, undefined, Math.floor),
    1: incomplete(19, 24, undefined, Math.floor),
  }),
  wing_texture_type: mendelian([0, 1]),
  wing_type: mendelian([0, 1]),
  wing_length: epistatic('wing_type', {
    0: incomplete(40, 200),
    1: incomplete(40, 350),
  }),
  wing_width: epistatic('wing_texture_type', {
    0: incomplete(7, 20),
    1: incomplete(20, 50),
  }),
  wing_y: epistatic('wing_texture_type', {
    0: incomplete(0.45, 0.85),
    1: incomplete(0.45, 0.75),
  }),
  wing_start: incomplete(5, 8, undefined, Math.floor),
  wing_end: incomplete(5, 8, undefined, Math.floor),
  pelvic_texture_type: epistatic('dorsal_texture_type', {
    0: () => 0 as 0 | 1,
    1: mendelian<0 | 1>([0, 1]),
  }),
  pelvic_type: mendelian([0, 1]),
  pelvic_length: incomplete(30, 140),
  pelvic_start: epistatic('pelvic_type', {
    0: incomplete(7, 11, undefined, Math.floor),
    1: incomplete(11, 12, undefined, Math.floor),
  }),
  pelvic_end: epistatic('pelvic_type', {
    0: incomplete(13, 15, undefined, Math.floor),
    1: (g: Haploid) => g.pelvic_start + 2,
  }),
  anal_texture_type: epistatic('dorsal_texture_type', {
    0: () => 0 as 0 | 1,
    1: mendelian<0 | 1>([0, 1]),
  }),
  anal_type: mendelian([0, 1]),
  anal_length: incomplete(20, 80),
  anal_start: incomplete(16, 23, undefined, Math.floor),
  anal_end: incomplete(25, 31, undefined, Math.floor),
  tail_type: mendelian([0, 1, 2, 3, 4, 5]),
  tail_length: incomplete(50, 180),
  finlet_type: mendelian([0, 1, 2, 3]),
  neck_type: mendelian([0, 1]),
  nose_height: incomplete(-50, 35),
  head_length: incomplete(20, 35),
  mouth_size: incomplete(6, 11, undefined, Math.floor),
  head_texture_amount: incomplete(30, 160, undefined, Math.floor),
  has_moustache: mendelian([0, 1]),
  has_beard: mendelian([0, 1]),
  moustache_length: epistatic('has_moustache', {
    0: () => 0,
    1: incomplete(10, 40, undefined, Math.floor),
  }),
  beard_length: epistatic('has_beard', {
    0: () => 0,
    1: incomplete(20, 50, undefined, Math.floor),
  }),
  eye_type: mendelian([0, 1]),
  eye_size: incomplete(8, 28),
  jaw_size: incomplete(0.7, 1.4),
  has_teeth: mendelian([1, 0]),
  teeth_length: incomplete(5, 15),
  teeth_space: incomplete(3, 6),
  color: mendelian(['normal', 'rainbow']),
  jaw_open: epistatic('has_teeth', {
    0: () => (rand() < 0.8 ? 1 : 0),
    1: () => 1 as 0 | 1,
  }),
};

function mendelian<T>(totalOrder: T[]): DominanceFn<T> {
  return (_g, l, r) => {
    const lpos = totalOrder.indexOf(l);
    const rpos = totalOrder.indexOf(r);
    if (lpos === -1) return r;
    if (rpos === -1) return l;
    return rpos < lpos ? r : l;
  };
}

function incomplete(
  min: number,
  max: number,
  factor = 0.05,
  post = (n: number) => n,
): DominanceFn<number> {
  const s = (max - min) * factor;
  return (_g, l, r) => {
    const o = gauss1d((l + r) / 2, s);
    return post(Math.max(min, Math.min(o, max)));
  };
}

function epistatic<T, K extends keyof Haploid>(
  gene: K,
  options: Record<Haploid[K], DominanceFn<T>>,
): DominanceFn<T> {
  return (g, l, r) => {
    const d = options[g[gene]];
    if (!d) throw new Error(`no dominance function for epistatic gene ${gene}`);
    return d(g, l, r);
  };
}

function makePhenotype([left, right]: Diploid): Haploid {
  const genes = Object.keys(dominances) as Array<keyof Haploid>;
  const phenotype: Record<keyof Haploid, any> = {} as any;
  for (const gene of genes) {
    const d: DominanceFn<any> = dominances[gene];
    phenotype[gene] = d(phenotype, left[gene], right[gene]);
  }
  return phenotype;
}

function makeGamete([left, right]: Diploid): Haploid {
  const genes = Object.keys(left) as Array<keyof Haploid>;
  return Object.fromEntries(
    genes.map((gene) => [gene, rand() < 0.5 ? left[gene] : right[gene]]),
  ) as Haploid;
}

type MutationFn<T> = (v: T) => T;

const mutations: { [K in keyof Haploid]: MutationFn<Haploid[K]> } = {
  body_curve_type: discrete([0, 1]),
  body_curve_amount: continuous(0.5, 0.98),
  body_length: continuous(200, 420),
  body_height: continuous(45, 150),
  scale_type: discrete([0, 1, 2, 3]),
  scale_scale: continuous(0.8, 1.5),
  pattern_type: discrete([0, 1, 2, 3, 4]),
  pattern_scale: continuous(0.5, 2),
  dorsal_texture_type: discrete([0, 1]),
  dorsal_type: discrete([0, 1]),
  dorsal_length: continuous(30, 180),
  dorsal_start: continuous(11, 15),
  dorsal_end: continuous(19, 28),
  wing_texture_type: discrete([0, 1]),
  wing_type: discrete([0, 1]),
  wing_length: continuous(40, 350),
  wing_width: continuous(7, 50),
  wing_y: continuous(0.45, 0.85),
  wing_start: continuous(5, 8),
  wing_end: continuous(5, 8),
  pelvic_texture_type: discrete([0, 1]),
  pelvic_type: discrete([0, 1]),
  pelvic_length: continuous(30, 140),
  pelvic_start: continuous(7, 12),
  pelvic_end: continuous(13, 15),
  anal_texture_type: discrete([0, 1]),
  anal_type: discrete([0, 1]),
  anal_length: continuous(20, 80),
  anal_start: continuous(16, 23),
  anal_end: continuous(25, 31),
  tail_type: discrete([0, 1, 2, 3, 4, 5]),
  tail_length: continuous(50, 180),
  finlet_type: discrete([0, 1, 2, 3]),
  neck_type: discrete([0, 1]),
  nose_height: continuous(-50, 35),
  head_length: continuous(20, 35),
  mouth_size: continuous(6, 11),
  head_texture_amount: continuous(30, 160),
  has_moustache: discrete([0, 1]),
  has_beard: discrete([0, 1]),
  moustache_length: continuous(0, 40),
  beard_length: continuous(0, 50),
  eye_type: discrete([0, 1]),
  eye_size: continuous(8, 28),
  jaw_size: continuous(0.7, 1.4),
  has_teeth: discrete([1, 0]),
  teeth_length: continuous(5, 15),
  teeth_space: continuous(3, 6),
  color: discrete(['normal', 'rainbow'], 1e-3),
  jaw_open: (v) => v,
};

function discrete<T>(values: T[], mutationRate = 2e-3): MutationFn<T> {
  return (v) => {
    if (rand() >= mutationRate) return v;
    return values[Math.floor(rand() * values.length)];
  };
}

function continuous(min: number, max: number, mutationRate = 0.001): MutationFn<number> {
  return (v) => Math.max(min, Math.min(v + gauss1d(0, (max - min) * mutationRate), max));
}

function mutate(g: Haploid): Haploid {
  const mutators: Array<[keyof Haploid, MutationFn<any>]> = Object.entries(mutations) as any;
  return Object.fromEntries(
    mutators.map(([gene, fn]) => [gene, fn(g[gene as keyof Haploid] as any)]),
  ) as Haploid;
}

export function breed(left: Diploid, right: Diploid, seed: number): Organism {
  jsr = seed % 2 ** 32;
  const leftGamete = mutate(makeGamete(left));
  const rightGamete = mutate(makeGamete(right));
  const genotype: Diploid = [leftGamete, rightGamete];
  const phenotype = makePhenotype(genotype);
  return { genotype, phenotype };
}

export function spawn(seed: number): Organism {
  jsr = seed % 2 ** 32;
  const genotype: Diploid = [generate_params(), generate_params()];
  const phenotype = makePhenotype(genotype);
  return { genotype, phenotype };
}

export function draw(phenotype: Haploid, items: Partial<{ santa: boolean }>): string {
  let { lines, poi } = fish(phenotype);
  const { polylines, layout } = reframe(lines, 20, '');
  return draw_svg(
    { polylines: cleanup(polylines), layout, poi, params: phenotype },
    { color: phenotype.color, ...items },
  );
}

if (import.meta.url === `file://${globalThis?.process?.argv?.[1]}`) {
  jsr = 123;
  const left: Diploid = [generate_params(), generate_params()];
  const right: Diploid = [generate_params(), generate_params()];
  console.log('l0', left[0].head_length);
  console.log('l1', left[1].head_length);
  console.log('r0', right[0].head_length);
  console.log('r1', right[1].head_length);
  const offspring = breed(left, right, 456);
  console.log('o0', offspring.genotype[0].head_length);
  console.log('o1', offspring.genotype[1].head_length);
  console.log('op', offspring.phenotype.head_length);
}
