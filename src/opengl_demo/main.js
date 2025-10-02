 
let startTime = (new Date()).getTime()/1000.0;
 
function loadShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.log(`Shader program compilation: ${gl.getShaderInfoLog(
      shader,
    )}`);
    gl.deleteShader(shader);
    return null;
  }
  
  return shader;
}

function initShaderProgram(gl, vs, fs) {
  const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vs);
  const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fs);
  
  const shaderProgram = gl.createProgram();
  
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);
  
  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    console.log(`Shader program initialisation: ${gl.getProgramInfoLog(
      shaderProgram,
    )}`,);
    
    return null;
  }
  
  return shaderProgram
}

function setPositionAttribute(gl, buffers, programInfo) {
  const numComponents = 2;
  const type = gl.FLOAT;
  const normalize = false;
  const stride = 0;
  const offset = 0;
  gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
  gl.vertexAttribPointer(
    programInfo.attribLocations.vertexPositions,
    numComponents,
    type,
    normalize,
    stride,
    offset,
  );
  
  gl.enableVertexAttribArray(programInfo.attribLocations.vertexPositions);
  gl.enableVertexAttribArray(programInfo.attribLocations.vertexPositions);
}

function drawScene(gl, programInfo, buffers, canvas) {
  gl.clearColor(0.0, 1.0, 0.0, 1.0);
  gl.clearDepth(1.0);
  gl.depthFunc(gl.LEQUAL);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  
  setPositionAttribute(gl, buffers, programInfo);
  gl.useProgram(programInfo.program);

  gl.uniform2f(
    programInfo.uniformLocations.screenResolution,
    canvas.clientWidth,
    canvas.clientHeight
  );
  
  const now = new Date();
  let time = now.getTime().valueOf()/1000.0 - startTime;

  gl.uniform1f(
    programInfo.uniformLocations.time,
    time
  );
  
  {
    const offset = 0;
    const vertexCount = 4;
    gl.drawArrays(gl.TRIANGLE_STRIP, offset, vertexCount);
  } 
}

window.onload = () => {  
  const canvas = document.querySelector("#gl-canvas");
  const gl = canvas.getContext("webgl2");
  if (gl === null) {
    console.log("So joever (WebGL broke)");
    return;
  }

  const vsSource = `#version 300 es            
in vec4 aVertexPosition;
void main() {
  gl_Position = aVertexPosition;
}
  `
  const fsSource = `#version 300 es            
precision highp float;
uniform vec2 uScreenResolution;
uniform float uTime;

out vec4 glFragColor;

struct light {
  // Direction
  vec3 d;
  // Colour
  vec3 c;
};

void main() {
  vec2 uv = 2.0*(gl_FragCoord.xy - 0.5*uScreenResolution.xy)/uScreenResolution.y;
  
  // 3D point on screen
  vec3 P = vec3(uv,0.0);
  // Direction camera is looking in
  vec3 v = vec3(0.0, 0.0, 1.0);
  // Sphere centre
  vec3 c = vec3(0.0, 0.0, 3.0);
  // Radius of sphere
  float r = 1.0;
  // Direction of lighting
  
  // Array of lights (light(direction, colour))
  float w = 1.0;
  light lights[3] = light[3](
    light(normalize(vec3(cos(uTime), sin(uTime), 1.0)), vec3(w,0.0,0.0)),
    light(normalize(vec3(5.0*sin(0.2*uTime), 3.0, -0.3)), vec3(0.0,w,0.0)),
    light(normalize(vec3(0.0, sin(0.217*uTime), -cos(0.217*uTime))), vec3(0.0,0.0,w))
  );
  
  // Construct ray P+λv and intersect with sphere. Solve for lambda
  
  float lambda = sqrt(r*r- dot((P.xy-c.xy),(P.xy-c.xy)) )+c.z;  
  
  // Find the normal of the sphere at the intersection
  vec3 n = normalize(P+lambda*v-c);
  vec3 col = vec3(0.0,0.0,0.0);
  
  for (int i=0; i<lights.length();i++) {
    // Find the sine of the angle between the normal and light direction
    float a = max(0.0, dot(n,lights[i].d));
    // Apply colour 
    col += lights[i].c*a;
  }

  float fade_in = 1.0/(1.0+exp(-(4.0*uTime-4.0)));

  // Output to screen
  glFragColor = vec4(col, col.x) * fade_in;
  //glFragColor = vec4(col, 0.0);
}
  `
  const shaderProgram = initShaderProgram(gl, vsSource, fsSource);
  
  const programInfo = {
    program: shaderProgram,
    attribLocations: {
      vertexPositions: gl.getAttribLocation(shaderProgram, "aVertexPosition")
    },
    uniformLocations: {
      screenResolution: gl.getUniformLocation(shaderProgram, "uScreenResolution"),
      time: gl.getUniformLocation(shaderProgram, "uTime"),
    },
  }
  
  const positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  const positions = [1.0, 1.0, -1.0, 1.0, 1.0, -1.0, -1.0, -1.0];
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
  const buffer = {
    position: positionBuffer,
  };

  gl.useProgram(programInfo.program);

  setInterval(() => {
    drawScene(gl, programInfo, buffer, canvas);
  }, 1000/60);
}