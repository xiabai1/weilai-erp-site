// 蔚来智居官网 · WebGL 黄昏海岸
// 水面由连续波场、法线、菲涅耳反射与程序化泡沫直接计算，不使用图片或视频。
(function () {
  var canvas = document.getElementById('sea-canvas');
  if (!canvas || !canvas.getContext) return;

  var gl = canvas.getContext('webgl', {
    alpha: false,
    antialias: true,
    depth: false,
    stencil: false,
    powerPreference: 'high-performance',
    preserveDrawingBuffer: false
  });
  if (!gl) return;

  function restoreCanvasFallback() {
    var replacement = canvas.cloneNode(false);
    replacement.removeAttribute('width');
    replacement.removeAttribute('height');
    canvas.replaceWith(replacement);
    canvas = replacement;
  }

  var vertexSource = [
    'attribute vec2 a_position;',
    'void main() {',
    '  gl_Position = vec4(a_position, 0.0, 1.0);',
    '}'
  ].join('\n');

  var fragmentSource = [
    'precision highp float;',
    '',
    'uniform vec2 u_resolution;',
    'uniform float u_time;',
    'uniform float u_horizon;',
    'uniform float u_quality;',
    '',
    'const float PI = 3.14159265359;',
    'const vec3 SUN_DIR = normalize(vec3(0.54, 0.085, 0.84));',
    '',
    'float hash12(vec2 p) {',
    '  vec3 p3 = fract(vec3(p.xyx) * 0.1031);',
    '  p3 += dot(p3, p3.yzx + 33.33);',
    '  return fract((p3.x + p3.y) * p3.z);',
    '}',
    '',
    'float noise(vec2 p) {',
    '  vec2 i = floor(p);',
    '  vec2 f = fract(p);',
    '  f = f * f * (3.0 - 2.0 * f);',
    '  float a = hash12(i);',
    '  float b = hash12(i + vec2(1.0, 0.0));',
    '  float c = hash12(i + vec2(0.0, 1.0));',
    '  float d = hash12(i + vec2(1.0, 1.0));',
    '  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);',
    '}',
    '',
    'float fbm(vec2 p) {',
    '  float value = 0.0;',
    '  float amplitude = 0.52;',
    '  mat2 turn = mat2(0.84, -0.54, 0.54, 0.84);',
    '  for (int i = 0; i < 5; i++) {',
    '    value += noise(p) * amplitude;',
    '    p = turn * p * 2.03 + vec2(7.3, 3.8);',
    '    amplitude *= 0.5;',
    '  }',
    '  return value;',
    '}',
    '',
    'vec3 skyGradient(float y) {',
    '  vec3 color = mix(vec3(0.018, 0.025, 0.072), vec3(0.12, 0.052, 0.17), smoothstep(0.0, 0.52, y));',
    '  color = mix(color, vec3(0.34, 0.09, 0.20), smoothstep(0.38, 0.73, y));',
    '  color = mix(color, vec3(0.82, 0.20, 0.20), smoothstep(0.66, 0.90, y));',
    '  color = mix(color, vec3(1.0, 0.43, 0.23), smoothstep(0.88, 1.0, y));',
    '  return color;',
    '}',
    '',
    'float swashPhase(float x, float time) {',
    '  float variation = (noise(vec2(x * 0.13, 7.1)) - 0.5) * 0.055;',
    '  return fract(time * 0.178 + x * 0.013 + variation);',
    '}',
    '',
    'float shorePulse(float x, float time) {',
    '  float phase = swashPhase(x, time);',
    '  float rise = smoothstep(0.0, 0.16, phase);',
    '  float fall = 1.0 - smoothstep(0.16, 0.98, phase);',
    '  float secondary = pow(max(0.0, sin(time * 0.43 + x * 0.44 + 2.2)), 9.0);',
    '  return clamp(rise * fall * 0.94 + secondary * 0.08, 0.0, 1.0);',
    '}',
    '',
    'float shoreHeight(float x, float time) {',
    '  float pulse = shorePulse(x, time);',
    '  float base = 5.15 + sin(x * 0.82 + 0.5) * 0.16 + sin(x * 2.25 - 1.4) * 0.075;',
    '  return base - pulse * 1.2 - sin(time * 0.22 + x * 0.41) * 0.055;',
    '}',
    '',
    'float waveHeight(vec2 p, float time, float lod, float shore) {',
    '  vec2 q = p;',
    '  q.x += sin(p.y * 0.63 + time * 0.17) * 0.23 + sin(p.y * 1.71 - time * 0.29) * 0.052;',
    '  float group = 0.72 + 0.28 * sin(q.y * 0.19 - time * 0.12 + sin(q.x * 0.14) * 1.8);',
    '  float h = 0.0;',
    '  h += sin(dot(q, vec2(0.113, 0.994)) * 1.17 - time * 0.64 + 0.9) * 0.074 * group;',
    '  h += sin(dot(q, vec2(0.664, 0.748)) * 1.93 + time * 0.86 + 1.8) * 0.034;',
    '  h += sin(dot(q, vec2(-0.537, 0.843)) * 3.47 - time * 1.17 + 4.1) * 0.017 * lod;',
    '  h += sin(dot(q, vec2(0.968, 0.251)) * 2.61 + time * 0.77 + 3.2) * 0.014 * lod;',
    '  h += sin(dot(q, vec2(0.917, 0.399)) * 5.13 + time * 1.49 + 0.3) * 0.008 * lod;',
    '  h += sin(dot(q, vec2(-0.803, 0.596)) * 8.17 - time * 1.93 + 2.7) * 0.0042 * lod;',
    '  h += (noise(q * 0.23 + vec2(time * 0.021, -time * 0.017)) - 0.5) * 0.052 * lod;',
    '  float dShore = max(0.0, q.y - shore);',
    '  float bore = pow(max(0.0, sin(dShore * 3.45 - time * 1.9 + sin(q.x * 1.12) * 0.82 + 0.5)), 6.0);',
    '  bore *= 0.35 + 0.65 * shorePulse(q.x, time);',
    '  h += bore * exp(-dShore * 0.15) * 0.12 * lod * group;',
    '  return h;',
    '}',
    '',
    'vec3 sandColor(vec2 p, float wetness) {',
    '  float broad = fbm(vec2(p.x * 0.46, p.y * 0.28) + vec2(2.7, 8.2));',
    '  float fine = hash12(floor(vec2(p.x * 275.0, p.y * 165.0))) - 0.5;',
    '  vec3 dry = mix(vec3(0.34, 0.22, 0.18), vec3(0.83, 0.57, 0.39), broad * 0.72 + 0.34);',
    '  dry += fine * 0.055;',
    '  dry += vec3(0.08, 0.025, 0.0) * smoothstep(3.0, 6.0, p.y);',
    '  return mix(dry, dry * vec3(0.62, 0.54, 0.50), wetness);',
    '}',
    '',
    'vec3 reflectedSky(vec3 direction, float time) {',
    '  float h = clamp(direction.y * 1.35 + 0.09, 0.0, 1.0);',
    '  vec3 color = skyGradient(h);',
    '  float sun = max(dot(normalize(direction), SUN_DIR), 0.0);',
    '  color += vec3(1.0, 0.48, 0.16) * (pow(sun, 10.0) * 0.18 + pow(sun, 90.0) * 0.75);',
    '  float cloud = fbm(vec2(atan(direction.x, direction.z) * 2.2, h * 6.5) + vec2(time * 0.006, 0.0));',
    '  float cloudMask = smoothstep(0.56, 0.73, cloud) * smoothstep(0.05, 0.65, h);',
    '  vec3 cloudColor = mix(vec3(0.10, 0.045, 0.12), vec3(0.72, 0.16, 0.12), h);',
    '  color = mix(color, cloudColor, cloudMask * 0.42);',
    '  return color;',
    '}',
    '',
    'vec3 renderSky(vec2 uv, float time, float aspect, float horizon) {',
    '  float sy = clamp(uv.y / horizon, 0.0, 1.0);',
    '  vec3 color = skyGradient(sy);',
    '',
    '  vec2 sunPos = vec2(0.69, horizon - 0.012);',
    '  vec2 sunDelta = (uv - sunPos) * vec2(aspect, 1.0);',
    '  float sunDistance = length(sunDelta);',
    '  float glow = exp(-sunDistance * (3.4 + sin(time * 0.21) * 0.05));',
    '',
    '  vec2 cloudP = vec2(uv.x * 2.15 + time * 0.004, uv.y * 5.1);',
    '  vec2 warp = vec2(',
    '    fbm(cloudP * 1.3 + vec2(2.1, 7.4)),',
    '    fbm(cloudP * 1.3 + vec2(8.7, 1.5))',
    '  );',
    '  float cumulusNoise = fbm(vec2(cloudP.x * 0.8, cloudP.y * 1.8) + warp * vec2(1.7, 0.8));',
    '  float cloudEnvelope = 0.0;',
    '  for (int i = 0; i < 6; i++) {',
    '    vec2 center = vec2(0.16, 0.20);',
    '    if (i == 1) center = vec2(0.38, 0.12);',
    '    if (i == 2) center = vec2(0.50, 0.28);',
    '    if (i == 3) center = vec2(0.64, 0.16);',
    '    if (i == 4) center = vec2(0.80, 0.27);',
    '    if (i == 5) center = vec2(0.90, 0.12);',
    '    center.y *= horizon;',
    '    vec2 delta = (uv - center) * vec2(aspect * 1.55, 1.75);',
    '    float puff = exp(-(delta.x * delta.x * 7.2 + delta.y * delta.y * 18.0));',
    '    float irregular = 0.58 + 0.42 * noise(vec2(float(i) * 7.31 + time * 0.013, float(i) * 3.17));',
    '    cloudEnvelope = max(cloudEnvelope, puff * irregular);',
    '  }',
    '  float cumulusField = mix(0.34, cumulusNoise, cloudEnvelope);',
    '  float cumulus = smoothstep(0.61, 0.76, cumulusField);',
    '  float sheetField = fbm(vec2(uv.x * 3.6 - time * 0.010, uv.y * 10.5));',
    '  float sheet = smoothstep(0.72, 0.88, sheetField);',
    '  float cloud = clamp(cumulus * 0.9 + sheet * 0.38, 0.0, 1.0);',
    '  cloud *= smoothstep(0.012, 0.14, uv.y);',
    '  cloud *= 1.0 - smoothstep(horizon - 0.055, horizon, uv.y) * 0.9;',
    '',
    '  float warm = pow(glow, 0.7);',
    '  vec3 cloudShadow = vec3(0.075, 0.045, 0.115);',
    '  vec3 cloudMid = mix(cloudShadow, vec3(0.42, 0.10, 0.19), smoothstep(0.2, 0.85, sy));',
    '  vec3 cloudColor = mix(cloudMid, vec3(1.0, 0.33, 0.07), warm * 0.55);',
    '  cloudColor += vec3(0.32, 0.08, 0.015) * glow;',
    '  color = mix(color, cloudColor, cloud * 0.62);',
    '',
    '  color += vec3(0.45, 0.08, 0.10) * glow * 0.12;',
    '  color += vec3(1.0, 0.36, 0.13) * glow * 0.26;',
    '  color += vec3(1.0, 0.66, 0.30) * pow(glow, 8.0) * 0.48;',
    '  float sunRadius = 0.0148;',
    '  float disc = 1.0 - smoothstep(sunRadius - 0.0012, sunRadius + 0.0012, sunDistance);',
    '  vec3 sunColor = mix(vec3(1.0, 0.90, 0.62), vec3(1.0, 0.58, 0.28), smoothstep(0.0, sunRadius, sunDistance));',
    '  color = mix(color, sunColor, disc * 0.96);',
    '  float horizonHaze = exp(-abs(uv.y - horizon) * 85.0);',
    '  color = mix(color, vec3(1.0, 0.53, 0.28), horizonHaze * 0.26);',
    '  float airBand = exp(-pow((uv.y - horizon) / 0.025, 2.0));',
    '  color += vec3(1.0, 0.46, 0.20) * airBand * 0.06;',
    '  return color;',
    '}',
    '',
    'vec3 renderOcean(vec2 uv, float time, float aspect, float horizon) {',
    '  float below = (uv.y - horizon) / max(1.0 - horizon, 0.001);',
    '  float zNear = 3.25;',
    '  float z = zNear / max(below, 0.0024);',
    '  float x = (uv.x - 0.5) * z * aspect * 1.18;',
    '  float baseX = x;',
    '  float baseZ = z;',
    '  vec2 p = vec2(baseX, baseZ);',
    '  float shoreZ = shoreHeight(baseX, time);',
    '',
    '  float lodEarly = 1.0 / (1.0 + z * 0.03);',
    '  float heightEarly = waveHeight(p, time, lodEarly, shoreZ);',
    '  vec3 eyeApprox = normalize(vec3(-x, 2.45, -z));',
    '  float parallaxAtten = smoothstep(0.0, 0.3, below) * clamp(1.0 / (1.0 + z * 0.09), 0.0, 1.0);',
    '  vec2 shift = -eyeApprox.xz / max(eyeApprox.y, 0.12) * heightEarly * (3.0 * u_quality) * parallaxAtten;',
    '  shift = clamp(shift, vec2(-0.62), vec2(0.62));',
    '  p += shift;',
    '',
    '  float pixelZ = baseZ * baseZ / (zNear * u_resolution.y * max(1.0 - horizon, 0.01));',
    '  float waterMask = smoothstep(shoreZ - pixelZ * 1.4, shoreZ + pixelZ * 1.4, baseZ);',
    '  float distanceShore = max(0.0, baseZ - shoreZ);',
    '  float swash = shorePulse(baseX, time);',
    '  float phase = swashPhase(baseX, time);',
    '  float advancing = 1.0 - smoothstep(0.08, 0.25, phase);',
    '  float draining = smoothstep(0.2, 0.95, phase);',
    '  float sandDistance = max(0.0, shoreZ - baseZ);',
    '  float lod = 1.0 / (1.0 + baseZ * 0.03);',
    '  float h = waveHeight(p, time, lod, shoreZ);',
    '  float eps = 0.032;',
    '  float hx = (waveHeight(p + vec2(eps, 0.0), time, lod, shoreZ) - waveHeight(p - vec2(eps, 0.0), time, lod, shoreZ)) / (2.0 * eps);',
    '  float hz = (waveHeight(p + vec2(0.0, eps), time, lod, shoreZ) - waveHeight(p - vec2(0.0, eps), time, lod, shoreZ)) / (2.0 * eps);',
    '  float slopeMagnitude = length(vec2(hx, hz));',
    '  vec3 normal = normalize(vec3(-hx * 0.92, 1.0, -hz * 0.92));',
    '  float microA = noise(p * 2.15 + vec2(time * 0.17, -time * 0.23));',
    '  float microB = noise(p * 3.55 + vec2(-time * 0.28, time * 0.19));',
    '  float microC = noise(p * 7.8 + vec2(-time * 0.51, time * 0.43));',
    '  normal.x += (microA - 0.5) * 0.095 * lod;',
    '  normal.z += (microB - 0.5) * 0.075 * lod;',
    '  normal.x += (microC - 0.5) * 0.038 * lod;',
    '  normal = normalize(normal);',
    '',
    '  float opticalDepth = max(0.008, distanceShore * 0.29 + swash * 0.038);',
    '  float wetDecay = 3.4 / (1.0 + draining * 0.9);',
    '  float wetSand = exp(-sandDistance * wetDecay);',
    '  vec2 sandPoint = vec2(baseX, baseZ);',
    '  vec2 refractionPoint = sandPoint + normal.xz * waterMask * min(opticalDepth, 0.12) * 0.62;',
    '  vec3 sand = sandColor(refractionPoint, wetSand);',
    '  float sandRipple = smoothstep(0.52, 0.76, fbm(vec2(baseX * 1.75, baseZ * 0.94) + vec2(3.4, 7.1)));',
    '  sand += vec3(0.04, 0.022, 0.012) * sandRipple * 0.45;',
    '  float filmDepth = 0.10 + swash * 0.27 + advancing * 0.06;',
    '  float filmNoise = fbm(vec2(baseX * 7.2, baseZ * 5.8 - time * 0.42));',
    '  float filmTexture = noise(vec2(baseX * 19.0, baseZ * 15.0 - time * 0.94));',
    '  float filmBreak = smoothstep(0.36, 0.68, filmNoise + filmTexture * 0.18);',
    '  float sandFilm = exp(-sandDistance / filmDepth) * smoothstep(0.04, 0.54, swash);',
    '  sandFilm *= mix(0.48, 1.0, filmBreak) * mix(1.0, 0.62, draining);',
    '  float filmRipple = 0.5 + 0.5 * sin(sandDistance * 29.0 - time * 5.1 + noise(vec2(baseX * 8.0, baseZ * 5.0)) * 3.4);',
    '  float filmGlint = pow(max(0.0, sin(sandDistance * 47.0 - time * 6.0 + baseX * 3.7)), 18.0);',
    '  float filmThickness = 0.005 + swash * 0.032;',
    '  vec3 filmAbsorption = exp(-filmThickness * vec3(2.55, 1.16, 0.58));',
    '  vec3 filmColor = sand * filmAbsorption;',
    '  filmColor += vec3(0.012, 0.064, 0.072) * (1.0 - exp(-filmThickness * 1.45));',
    '  filmColor += vec3(0.018, 0.065, 0.052) * filmRipple * filmBreak;',
    '  filmColor += vec3(0.92, 0.57, 0.28) * filmGlint * filmBreak * (0.018 + advancing * 0.028);',
    '  sand = mix(sand, filmColor, sandFilm * (0.18 + (1.0 - filmBreak) * 0.18));',
    '  float pastShoreZ = shoreHeight(baseX, time - 2.4);',
    '  float trailMask = smoothstep(pastShoreZ, pastShoreZ + pixelZ * 4.0, baseZ);',
    '  trailMask *= 1.0 - smoothstep(shoreZ - pixelZ * 4.0, shoreZ, baseZ);',
    '  trailMask *= smoothstep(0.04, 0.34, shoreZ - pastShoreZ) * draining;',
    '  float trailFilm = trailMask * smoothstep(0.35, 0.66, filmNoise + filmTexture * 0.15);',
    '  sand = mix(sand, filmColor, trailFilm * 0.085);',
    '  sand *= 1.0 - trailMask * 0.065;',
    '  float percolation = exp(-sandDistance * (9.5 + (1.0 - swash) * 8.0));',
    '  percolation *= (0.24 + swash * 0.56) * (0.55 + filmNoise * 0.45);',
    '  sand *= mix(1.0, 0.72, percolation);',
    '  float soakedTrail = exp(-sandDistance * 4.6) * draining * (1.0 - swash);',
    '  sand *= 1.0 - soakedTrail * 0.09;',
    '  float sandWetGlow = exp(-pow((uv.x - 0.69) / 0.035, 2.0)) * wetSand;',
    '  sand += vec3(1.0, 0.38, 0.12) * sandWetGlow * 0.16;',
    '',
    '  vec3 eye = vec3(0.0, 2.45, 0.0);',
    '  vec3 world = vec3(p.x, h, p.y);',
    '  vec3 viewDir = normalize(eye - world);',
    '  vec3 reflected = reflect(-viewDir, normal);',
    '  vec3 skyReflection = reflectedSky(reflected, time);',
    '  float fresnel = 0.025 + 0.975 * pow(1.0 - clamp(dot(normal, viewDir), 0.0, 1.0), 5.0);',
    '',
    '  float deepMix = smoothstep(0.08, 1.75, opticalDepth);',
    '  float clarity = exp(-opticalDepth * 0.72);',
    '  vec3 absorption = exp(-opticalDepth * vec3(2.65, 1.18, 0.62));',
    '  vec3 transmitted = sand * absorption * vec3(0.82, 0.95, 0.94);',
    '  transmitted += vec3(0.018, 0.105, 0.12) * (1.0 - exp(-opticalDepth * 0.82));',
    '  vec3 deepWater = mix(vec3(0.004, 0.04, 0.098), vec3(0.007, 0.12, 0.165), 0.36 + 0.2 * h);',
    '  vec3 water = mix(transmitted, deepWater, deepMix);',
    '  float lightSide = 0.78 + 0.34 * clamp(dot(normal, SUN_DIR), 0.0, 1.0);',
    '  water *= lightSide;',
    '  water *= 1.0 - smoothstep(-0.13, -0.015, h) * 0.22;',
    '  water += vec3(0.025, 0.15, 0.15) * clamp(h * 3.0, 0.0, 0.2);',
    '  water *= 0.94 + microC * 0.12;',
    '  float backlight = clamp(dot(-normal, SUN_DIR), 0.0, 1.0);',
    '  water += vec3(0.02, 0.17, 0.14) * pow(backlight, 2.0) * clarity * 0.32;',
    '  float thinFilm = smoothstep(0.02, 0.52, opticalDepth);',
    '  float reflectivity = fresnel * mix(0.16, 1.0, thinFilm);',
    '  water = mix(water, skyReflection, clamp(reflectivity * 0.82, 0.0, 0.74));',
    '',
    '  vec3 halfDir = normalize(SUN_DIR + viewDir);',
    '  float sunAlignment = max(dot(normal, halfDir), 0.0);',
    '  float sparkle = smoothstep(0.52, 0.74, noise(vec2(p.x * 17.0, p.y * 24.0 - time * 2.1)));',
    '  float specular = pow(sunAlignment, 260.0) * (0.5 + sparkle * 2.35) + pow(sunAlignment, 56.0) * 0.075;',
    '  water += vec3(1.0, 0.56, 0.25) * specular;',
    '',
    '  float sunPathWidth = 0.022 + below * 0.115;',
    '  float sunPath = exp(-pow(abs(uv.x - 0.69) / sunPathWidth, 2.0));',
    '  float pathBreak = smoothstep(0.53, 0.77, noise(vec2(uv.x * 73.0, below * 56.0 - time * 0.92)));',
    '  float fineGlitter = smoothstep(0.66, 0.91, noise(vec2(uv.x * 310.0, below * 185.0 - time * 2.6)));',
    '  water += vec3(1.0, 0.45, 0.15) * sunPath * 0.10 * exp(-distanceShore * 0.035);',
    '  water += vec3(1.0, 0.42, 0.13) * sunPath * (0.035 + pathBreak * 0.11 + fineGlitter * 0.075) * exp(-distanceShore * 0.035);',
    '',
    '  float caustic = pow(0.5 + 0.5 * sin(p.x * 2.9 + sin(p.y * 1.4 + time * 0.34) * 1.7), 7.0);',
    '  caustic += pow(0.5 + 0.5 * sin(p.y * 3.1 - p.x * 1.6 + time * 0.51), 9.0) * 0.7;',
    '  water += vec3(0.12, 0.46, 0.37) * caustic * exp(-distanceShore * 1.15) * 0.16 * clarity;',
    '',
    '  float foamNoise = fbm(vec2(p.x * 3.25, p.y * 4.75 - time * 0.31) + vec2(time * 0.08, 0.0));',
    '  float foamFine = fbm(vec2(p.x * 9.2, p.y * 12.8 - time * 0.58) + vec2(time * 0.11, 0.0));',
    '  float foamVeryFine = noise(vec2(p.x * 26.0, p.y * 34.0 - time * 1.6));',
    '  float foamMix = mix(foamNoise, foamFine, 0.38);',
    '  float bands = 0.5 + 0.5 * sin(distanceShore * 10.2 - time * 2.35 + sin(p.x * 1.95 + time * 0.17) * 1.05);',
    '  float shoreFoam = exp(-distanceShore * 2.7);',
    '  float lace = smoothstep(0.61, 0.81, foamMix + bands * 0.24);',
    '  float holes = smoothstep(0.30, 0.62, foamVeryFine);',
    '  float foam = shoreFoam * lace * (0.38 + holes * 0.34);',
    '  float rollerCenter = 0.5 + swash * 0.34;',
    '  float roller = exp(-pow((distanceShore - rollerCenter) / 0.28, 2.0));',
    '  foam += roller * swash * smoothstep(0.48, 0.70, foamMix + holes * 0.08) * 0.56;',
    '  float crest = smoothstep(0.052, 0.105, h);',
    '  foam += crest * smoothstep(0.53, 0.75, foamMix) * (0.24 + 0.48 * lod) * (0.52 + holes * 0.48);',
    '  foam += smoothstep(0.26, 0.52, slopeMagnitude) * 0.12 * lod * (0.45 + holes * 0.55);',
    '  float edgeFoam = exp(-distanceShore * 10.5);',
    '  edgeFoam *= smoothstep(0.22, 0.50, foamVeryFine + foamMix * 0.28) * mix(0.52, 1.0, advancing);',
    '  foam = clamp(foam + edgeFoam * (0.20 + 0.52 * foamMix), 0.0, 0.84);',
    '  float bubbleField = smoothstep(0.70, 0.84, noise(vec2(p.x * 41.0, p.y * 49.0 - time * 2.8)));',
    '  float edgeBubbles = exp(-distanceShore * 3.6) * bubbleField * (0.34 + swash * 0.62);',
    '  vec3 foamColor = mix(vec3(0.78, 0.89, 0.84), vec3(1.0, 0.76, 0.42), sunPath * 0.55);',
    '  water = mix(water, foamColor, foam);',
    '  water = mix(water, vec3(0.72, 0.86, 0.83), edgeBubbles * 0.28);',
    '',
    '  float horizonMist = exp(-below * 62.0);',
    '  vec3 horizonColor = mix(vec3(0.14, 0.11, 0.13), vec3(0.88, 0.36, 0.20), 0.5);',
    '  water = mix(water, horizonColor, horizonMist * 0.42);',
    '',
    '  float sandFoam = exp(-sandDistance * (21.0 - swash * 7.0));',
    '  sandFoam *= smoothstep(0.38, 0.68, foamVeryFine + filmNoise * 0.24) * (0.28 + swash * 0.58);',
    '  sand = mix(sand, vec3(0.84, 0.86, 0.76), sandFoam * 0.58);',
    '  float filmSheen = sandFilm * filmBreak * 0.055 + wetSand * 0.012;',
    '  sand += skyReflection * filmSheen;',
    '  return mix(sand, water, waterMask);',
    '}',
    '',
    'void main() {',
    '  vec2 uv = vec2(gl_FragCoord.x / u_resolution.x, 1.0 - gl_FragCoord.y / u_resolution.y);',
    '  float aspect = u_resolution.x / u_resolution.y;',
    '  vec3 color;',
    '  if (uv.y < u_horizon) {',
    '    color = renderSky(uv, u_time, aspect, u_horizon);',
    '  } else {',
    '    color = renderOcean(uv, u_time, aspect, u_horizon);',
    '  }',
    '  float dither = (hash12(gl_FragCoord.xy + u_time * 0.01) - 0.5) / 255.0;',
    '  color = 1.0 - exp(-max(color + dither, 0.0) * 1.52);',
    '  color = pow(color, vec3(0.90));',
    '  gl_FragColor = vec4(color, 1.0);',
    '}'
  ].join('\n');

  function compileShader(type, source) {
    var shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error('Sea shader compile failed:', gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  var vertexShader = compileShader(gl.VERTEX_SHADER, vertexSource);
  var fragmentShader = compileShader(gl.FRAGMENT_SHADER, fragmentSource);
  if (!vertexShader || !fragmentShader) {
    restoreCanvasFallback();
    return;
  }

  var program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('Sea shader link failed:', gl.getProgramInfoLog(program));
    restoreCanvasFallback();
    return;
  }
  gl.useProgram(program);
  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);

  var buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    -1, -1,
     1, -1,
    -1,  1,
     1,  1
  ]), gl.STATIC_DRAW);

  var positionLocation = gl.getAttribLocation(program, 'a_position');
  gl.enableVertexAttribArray(positionLocation);
  gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

  var resolutionLocation = gl.getUniformLocation(program, 'u_resolution');
  var timeLocation = gl.getUniformLocation(program, 'u_time');
  var horizonLocation = gl.getUniformLocation(program, 'u_horizon');
  var qualityLocation = gl.getUniformLocation(program, 'u_quality');
  var motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  var reducedMotion = motionQuery.matches;
  var running = true;
  var rafId = 0;
  var startTime = performance.now();
  var resizeTimer = 0;
  var horizon = 0.455;

  window.SeaSceneHandled = true;

  function resize() {
    var cssWidth = Math.max(1, canvas.clientWidth);
    var cssHeight = Math.max(1, canvas.clientHeight);
    var mobile = cssWidth < 700;
    var scale = Math.min(window.devicePixelRatio || 1, mobile ? 1.18 : 1.45);
    var maxPixels = mobile ? 1100000 : 2500000;
    var pixels = cssWidth * cssHeight * scale * scale;
    if (pixels > maxPixels) scale *= Math.sqrt(maxPixels / pixels);

    var width = Math.max(1, Math.round(cssWidth * scale));
    var height = Math.max(1, Math.round(cssHeight * scale));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    horizon = mobile ? 0.465 : 0.455;
    gl.viewport(0, 0, width, height);
    gl.uniform2f(resolutionLocation, width, height);
    gl.uniform1f(horizonLocation, horizon);
    gl.uniform1f(qualityLocation, mobile ? 0.62 : 1.0);
    if (reducedMotion) render(3.7);
  }

  function render(seconds) {
    gl.uniform1f(timeLocation, seconds);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  function animate(now) {
    if (!running || reducedMotion) return;
    render((now - startTime) / 1000);
    rafId = requestAnimationFrame(animate);
  }

  function start() {
    if (reducedMotion || running) return;
    running = true;
    startTime = performance.now() - 4200;
    cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(animate);
  }

  resize();
  if (reducedMotion) {
    running = false;
    render(3.7);
  } else {
    running = false;
    start();
  }

  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 140);
  });

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      running = false;
      cancelAnimationFrame(rafId);
    } else if (!reducedMotion) {
      start();
    }
  });

  var onMotionPreference = function (event) {
    reducedMotion = event.matches;
    if (reducedMotion) {
      running = false;
      cancelAnimationFrame(rafId);
      render(3.7);
    } else {
      start();
    }
  };

  if (motionQuery.addEventListener) motionQuery.addEventListener('change', onMotionPreference);
  else motionQuery.addListener(onMotionPreference);
})();
