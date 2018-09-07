'use strict';

let canvas = document.getElementById('cmain');
let ctx = canvas.getContext('2d');
let snailLight = document.getElementById('snail_light');
let snailDark = document.getElementById('snail_dark');

// *** fnoise code begin
function rnd(seed) {
    var x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
}

function pnoise(x, offset) {
    offset = offset|0;
    var x0 = Math.floor(x);
    var x1 = x0 + 1;
    var r0 = rnd(x0+offset);
    var r1 = rnd(x1+offset);
    var dx = x - x0;
    var rx = (r1 - r0) * dx + r0;
    return rx;
}

function fnoise(x,config) {
    var r=0;
    for (var i = 0; i < config.length; i++) {
        var c = config[i];
        var ri = c.a * pnoise(x * c.s, c.s);
        r += ri;
    }
    return r;
}

function getFnoiseRange(config) {
  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < 1000; i+=1.1) {
    let v = fnoise(i, config);
    min = Math.min(min, v);
    max = Math.max(max, v);
  }
  return {min, max};
}

function normalFnoise(x, config, range) {
  let v = fnoise(x, config);
  return (v - range.min) / (range.max - range.min);
}


// ** fnoise code end
//build up our clock font
let digitGrid = [];
function addDigit(s) {
  let a = s.split`|`;
  a = a.map(e => {
    return e.split``.map(d => d|0);
  });
  digitGrid.push(a);
}
function addAllDigits() {
addDigit(`01110|10001|10001|10001|10001|01110`);

addDigit(`00100|11100|00100|00100|00100|11111`);

addDigit(`01110|10001|00010|00100|01000|11111`);

addDigit(`01110|10001|00010|00010|10001|01110`);

addDigit(`00010|00110|01010|10010|11111|00010`);

addDigit(`11111|10000|11110|00001|10001|01110`);

addDigit(`01110|10000|11110|10001|10001|01110`);

addDigit(`11111|00001|00010|00010|00100|00100`);

addDigit(`01110|10001|01110|10001|10001|01110`);

addDigit(`01110|10001|10001|01111|00001|01110`);

addDigit(`00000|00100|00000|00000|00100|00000`);
}
addAllDigits();

//bring Box2D items into global namespace
let b2Vec2 = Box2D.Common.Math.b2Vec2,
  b2BodyDef = Box2D.Dynamics.b2BodyDef,
  b2Body = Box2D.Dynamics.b2Body,
  b2FixtureDef = Box2D.Dynamics.b2FixtureDef,
  b2Fixture = Box2D.Dynamics.b2Fixture,
  b2World = Box2D.Dynamics.b2World,
 	b2MassData = Box2D.Collision.Shapes.b2MassData,
 	b2PolygonShape = Box2D.Collision.Shapes.b2PolygonShape,
 	b2CircleShape = Box2D.Collision.Shapes.b2CircleShape,
	b2DebugDraw = Box2D.Dynamics.b2DebugDraw,
  b2RevoluteJointDef =  Box2D.Dynamics.Joints.b2RevoluteJointDef,
  b2MouseJointDef = Box2D.Dynamics.Joints.b2MouseJointDef;
let scale = 60;
let updateRate = 1/50;

//create box2d static rectangle
function createWall(x, y, width, height, type) {
  //x,y are the upper left corners
  var userData = {};
  userData.type = type || 'wall';
  userData.width = width;
  userData.height = height;

  var fDef = new b2FixtureDef();
  fDef.density = 1.0;
  fDef.friction = 0.5;
  fDef.friction = 0.1;
  fDef.restitution = 0.2;
  fDef.restitution = 0.1;
  fDef.shape = new b2PolygonShape();
  fDef.shape.SetAsBox(width / 2, height / 2);


  var bDef = new b2BodyDef();
  bDef.type = b2Body.b2_staticBody;

  bDef.position.x = x + width * 0.5;
  bDef.position.y = y + height * 0.5;

  var newBody;
  newBody = world.CreateBody(bDef);
  newBody.CreateFixture(fDef);
  newBody.SetUserData(userData);

  return newBody;
}

//create box2d dynamic circle
function createBall(x, y, radius, color, index) {
  var userData = {};
  userData.type = 'ball';
  userData.radius = radius;
  userData.color = color;
  userData.index = index;

  var fDef = new b2FixtureDef();
  fDef.density = 1.0;
  fDef.friction = 0.5;
  fDef.friction = 0.1;
  fDef.restitution = 0.2;
  fDef.restitution = 0.1;


  fDef.shape = new b2CircleShape();
  fDef.shape.SetRadius(radius);


  var bDef = new b2BodyDef();
  bDef.type = b2Body.b2_dynamicBody;
  bDef.position.x = x;
  bDef.position.y = y;

  var newBody;
  newBody = world.CreateBody(bDef);
  newBody.CreateFixture(fDef);
  newBody.SetUserData(userData);

  return newBody;
}

//create box2d static circle
function createPeg(x, y, radius) {
  var userData = {};
  userData.type = 'peg';
  userData.radius = radius;

  var fDef = new b2FixtureDef();
  fDef.density = 1.0;
  fDef.friction = 0.1;
  fDef.restitution = 0.1;


  fDef.shape = new b2CircleShape();
  fDef.shape.SetRadius(radius);


  var bDef = new b2BodyDef();
  bDef.type = b2Body.b2_staticBody;
  bDef.position.x = x;
  bDef.position.y = y;

  var newBody;
  newBody = world.CreateBody(bDef);
  newBody.CreateFixture(fDef);
  newBody.SetUserData(userData);

  newBody.SetAngle(Math.PI * 2 * Math.random());

  return newBody;
}

//convert time into boxes to map into circles
function getTimeBoxes (curTime) {
  let timeString = curTime.toLocaleTimeString().split` `[0];
  timeString = timeString.split`:`;
  timeString.pop();
  timeString = timeString.join`:`;

  let xsize = 18;
  let ysize = 18;
  let xpos = (canvas.width - timeString.length * xsize * 6) / 2;
  let ypos = (canvas.height - ysize * 6) * 0.9;

  let boxes = [];
  timeString.split``.forEach(d => {
    let charData;
    if (d !== ':') {
      charData = digitGrid[parseInt(d)];
    } else {
      charData = digitGrid[10];
    }

    for (let x = 0; x < 5; x++) {
      let lineX = xpos + x * xsize;
      for (let y = 0; y < 6; y++) {
        if (charData[y][x] === 1) {
          let newBox = {x: lineX, y: ypos + y * ysize,
            xsize: xsize, ysize: ysize};
          boxes.push(newBox);
        }
      }
    }
    xpos += xsize * 6;
  });
  return boxes;
}

let world;
//set everything up to display a new minute
function startNewMinute(curTime) {
  //run the sim 1 time to see where everything will settle
  initWorld(curTime, []);
  let settleSeconds = 16;
  for (let i = 0; i < (1/updateRate) * settleSeconds; i++) {
    update();
  }

  //determine colors
  let colors = new Array(700).fill('red');
  let boxes = getTimeBoxes(curTime);
  for (let b = world.GetBodyList(); b; b = b.m_next) {
    let pos = b.GetPosition();

    let x = pos.x * scale;
    let y = pos.y * scale;

    let inBox = boxes.some(box => {
      return (x > box.x && x < box.x + box.xsize & y > box.y && y < box.y + box.ysize);
    });
    if (inBox) {
      let userData = b.GetUserData();
      colors[userData.index] = 'grey';
    }
  }

  //restart sim so it can run live
  initWorld(curTime, colors);

}

let noiseConfig = [
  {a: 128, s: 1/8},
  {a: 64,  s: 1/4},
  {a: 16,  s: 1/2},
  {a: 8,   s: 1},
  {a: 4,   s: 2},
  {a: 2,   s: 4},
];
let noiseRange = getFnoiseRange(noiseConfig);

function initWorld(curTime, colors) {
  world = new b2World(new b2Vec2(0, 6), true);
  world.GetBodyList().SetUserData({type: 'ground'});

  let wallWidth = 0.5;
  //create floor
  createWall(0, canvas.height / scale - wallWidth, canvas.height / scale, wallWidth);
  //create walls
  createWall(0, 0, wallWidth, (canvas.height / scale) - wallWidth);
  createWall((canvas.width / scale) - wallWidth, 0, wallWidth, (canvas.height/ scale) - wallWidth);

  let rampLength = 4;
  //create left ramp
  let leftRamp = createWall(0, 0, rampLength, wallWidth);
  leftRamp.SetAngle(Math.PI * 2 * 0.03);

  //create right ramp
  let rightRamp = createWall((canvas.width / scale) - rampLength, 0, rampLength, wallWidth);
  rightRamp.SetAngle(-Math.PI * 2 * 0.03);

  //create pegRadius
  let rows = 7;
  let cols = 9;
  let minPegX = 1.5;
  let maxPegX = 8.5;
  let minPegY = 2;
  let maxPegY = 6;
  let pegRadius = 0.1;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < (y % 2 === 0 ? cols : cols + 1); x++) {
      let pegX = minPegX + (y % 2 === 0 ? x : x - 0.5) * (maxPegX - minPegX) / (cols - 1);
      let pegY = minPegY + y * (maxPegY - minPegY) / (rows - 1);
      createPeg(pegX, pegY, pegRadius);
    }
  }
  //create balls

  let ballRadius = 0.12;
  let minBallX = wallWidth + ballRadius;
  let maxBallX = (canvas.width / scale) - wallWidth - ballRadius;
  let minBallY = -30;
  let maxBallY = 0;
  for (let i = 0; i < 600; i++ ) {
    let x = (maxBallX - minBallX) * normalFnoise(i + curTime.getTime(), noiseConfig, noiseRange) + minBallX;
    let y = (maxBallY - minBallY) * normalFnoise(i + curTime.getTime() + 9999, noiseConfig, noiseRange) + minBallY;

    createBall(x, y, ballRadius, colors[i], i);
  }
}

function update() {
  world.Step(updateRate, 2, 2);
  world.ClearForces();
}

function draw() {
  ctx.save();
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  let anyAwake = false;
  for (let b = world.GetBodyList(); b; b = b.m_next) {
    anyAwake = anyAwake | b.IsAwake();
    let userData = b.GetUserData();
    if (userData === null) {
      userData = {type: 'none'};
    }
    let pos = b.GetPosition();
    ctx.save();
    ctx.translate(pos.x * scale, pos.y * scale);
    ctx.rotate(b.GetAngle());
    ctx.translate(-pos.x * scale, -pos.y * scale);
    switch (userData.type) {
      case 'wall':
        ctx.fillStyle = 'grey';
        ctx.fillRect((pos.x - userData.width / 2) * scale,
          (pos.y - userData.height / 2) * scale,
          userData.width * scale,
          userData.height * scale
        );
        break;
      case 'ball':
        let img;
        if (userData.color === 'red') {
          img = snailLight;
        } else {
          img = snailDark;
        }

        ctx.drawImage(img, (pos.x - userData.radius) * scale, (pos.y -userData.radius) * scale,
          userData.radius * 2 * scale, userData.radius * 2 * scale
        );
        break;
      case 'peg':
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(pos.x * scale, pos.y * scale, userData.radius * scale, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'ground':
        break;
      default:
        throw `Unknown body type ${userData.type}`;
    }

    ctx.restore();
  }
  console.log(anyAwake);

  ctx.restore();
}

//draw a loading message at startup
function drawLoading() {
  ctx.font = '50px "Sans"';
  ctx.textAlign = 'center';
  ctx.textAlign = 'middle';
  ctx.fillStyle = 'white';
  ctx.fillText('Loading', canvas.width * 0.5, canvas.height * 0.5);
  ctx.fillText('Quite slow on mobile', canvas.width * 0.5, canvas.height * 0.6);
}

let lastMinute = -1;
function tick() {
  let curTime = new Date();
  let curMinute = curTime.getMinutes();
  if (curMinute !== lastMinute) {
    startNewMinute(curTime);
    lastMinute = curMinute;
  }

  update();
  draw();
}

drawLoading();
setInterval(tick, updateRate * 1000);
