import Matter from './vendor/matter.js';
import { BUILD_PIECES, beamKey, beamCost, bridgeSpent, hasBridgeRoad, towerBlocks } from './engineering-data.js';
const { Engine, Bodies, Body, Composite, Query, Sleeping } = Matter;
export const STEP_MS = 1000 / 60;
// A bar that stretches or squashes beyond this fraction of its length breaks.
export const BREAK_STRAIN = 0.0075;
export function createBlockWorld(mode = 'drop', { island } = {}) {
  const engine = Engine.create({ enableSleeping: true, positionIterations: 10, velocityIterations: 8 });
  engine.gravity.y = 1;
  const width = Number.isFinite(island) && island >= 120 && island <= 620 ? island : mode === 'drop' ? 300 : 620;
  const platform = Bodies.rectangle(400, 530, width, 60, { isStatic: true, friction: .85 });
  Composite.add(engine.world, platform);
  return { engine, platform, island: width, blocks: [], lost: 0, ticks: 0, nextId: 1, splashes: [] };
}
function makeBlock(type, x, y, angle = 0) {
  const piece = BUILD_PIECES.find(p => p.id === type) || BUILD_PIECES[0];
  const opts = { friction: .65, frictionStatic: .95, restitution: .05, density: .0018, sleepThreshold: 70 };
  let body;
  if (piece.id === 'ball') body = Bodies.circle(x, y, 32, opts, 32);
  else if (piece.id === 'roof') body = Bodies.fromVertices(x, y, [[{ x: -48, y: 32 }, { x: 48, y: 32 }, { x: 0, y: -32 }]], opts);
  else body = Bodies.rectangle(x, y, piece.width, piece.height, opts);
  Body.setAngle(body, angle);
  body.plugin = { type: piece.id, color: piece.color, volume: piece.volume, calm: 0, serial: 0 };
  return body;
}
export function canPlaceBlock(world, type, x, y, angle = 0) {
  const body = makeBlock(type, x, y, angle);
  return body.bounds.min.x >= 12 && body.bounds.max.x <= 788 && body.bounds.max.y <= 500 &&
    Query.collides(body, [world.platform, ...world.blocks]).length === 0;
}
export function addBlock(world, type, x, y, angle = 0) {
  const body = makeBlock(type, x, y, angle);
  body.plugin.serial = world.nextId++;
  world.blocks.push(body); Composite.add(world.engine.world, body);
  return body;
}
export function stepBlocks(world) {
  Engine.update(world.engine, STEP_MS); world.ticks++;
  const lost = world.blocks.filter(body => body.bounds.min.y > 556 || body.position.x < -150 || body.position.x > 950);
  for (const body of lost) {
    world.lost++; world.splashes.push({ x: Math.max(20, Math.min(780, body.position.x)), at: world.ticks });
    Composite.remove(world.engine.world, body);
  }
  world.blocks = world.blocks.filter(body => !lost.includes(body));
  for (const body of world.blocks) body.plugin.calm = body.speed < .18 && Math.abs(body.angularSpeed) < .015 ? body.plugin.calm + 1 : 0;
  world.splashes = world.splashes.filter(s => world.ticks - s.at < 40);
  return lost.length;
}
const owner = body => body.parent || body;
function contactPairs(world) {
  return world.engine.pairs.list
    .filter(pair => pair.isActive || (pair.bodyA.isSleeping && pair.bodyB.isSleeping))
    .map(pair => [owner(pair.bodyA), owner(pair.bodyB)]);
}
function settledBlocks(world, contacts = contactPairs(world)) {
  // Only settled pieces connected by contacts to the island count. An airborne
  // piece near its apex, or a sleeping fragment in the water, never scores.
  const supported = new Set([world.platform.id]);
  for (let i = 0; i <= world.blocks.length; i++) {
    let changed = false;
    for (const [bodyA, bodyB] of contacts) {
      if (supported.has(bodyA.id) && !supported.has(bodyB.id)) { supported.add(bodyB.id); changed = true; }
      if (supported.has(bodyB.id) && !supported.has(bodyA.id)) { supported.add(bodyA.id); changed = true; }
    }
    if (!changed) break;
  }
  return world.blocks.filter(b => supported.has(b.id) && b.plugin.calm >= 40);
}
/** count: settled pieces; height: tower height in whole cubes (64 px). */
export function blockStats(world) {
  const settled = settledBlocks(world);
  const top = settled.length ? Math.min(500, ...settled.map(b => b.bounds.min.y)) : 500;
  return { count: settled.length, height: towerBlocks(top), top };
}
const upright = body => Math.abs(Math.sin(body.angle)) < .2;
/** A roof that rests on two upright walls (pillars or cubes), directly or on a beam laid over them. */
export function hasHouse(world) {
  const contacts = contactPairs(world), settled = new Set(settledBlocks(world, contacts));
  const below = body => contacts.flatMap(([a, b]) => a === body ? [b] : b === body ? [a] : [])
    .filter(other => settled.has(other) && other.position.y > body.position.y + 8);
  const walls = body => new Set(below(body).filter(other => ['pillar', 'block'].includes(other.plugin.type) && upright(other))).size;
  return [...settled].some(roof => roof.plugin.type === 'roof' && upright(roof) && (walls(roof) >= 2
    || below(roof).some(beam => beam.plugin.type === 'plank' && upright(beam) && walls(beam) >= 2)));
}
export function snapshotBlocks(world) {
  return { lost: world.lost, island: world.island, blocks: world.blocks.map(b => ({ type: b.plugin.type, x: b.position.x, y: b.position.y, angle: b.angle })) };
}
export function restoreBlocks(mode, snapshot) {
  const world = createBlockWorld(mode, { island: snapshot.island }); world.lost = snapshot.lost;
  for (const piece of snapshot.blocks) addBlock(world, piece.type, piece.x, piece.y, piece.angle);
  // Rebuild contacts before putting restored pieces to sleep. Otherwise the
  // detector skips sleeping bodies and their support graph stays empty.
  Engine.update(world.engine, STEP_MS);
  for (const body of world.blocks) { Sleeping.set(body, true); body.plugin.calm = 70; }
  return world;
}
export function disposeBlocks(world) { if (world) { Composite.clear(world.engine.world, false); Engine.clear(world.engine); } }

// A small position-based pin-jointed truss model. Bars preserve their length,
// joints can rotate, and the load moves across the actual road joints. A bare
// chain sags; triangulation restrains that motion. No prescribed solution.
export function createBridgeTrial(layout, beams) {
  const keys = beams.map(pair => Array.isArray(pair) && pair.length === 2 ? beamKey(...pair) : '');
  if (keys.includes('') || new Set(keys).size !== keys.length
    || beams.some(pair => !beamCost(layout, ...pair))
    || bridgeSpent(layout, beams) > layout.budget || !hasBridgeRoad(layout, beams)) {
    throw new Error('A hídpróbához folytonos, szabályos és a keretbe férő terv kell.');
  }
  const nodes = layout.nodes.map(n => ({ ...n, ox:n.x, oy:n.y, px:n.x, py:n.y }));
  const bars = beams.map(([a, b]) => {
    const p = nodes.find(n => n.id === a), q = nodes.find(n => n.id === b);
    return { a:p, b:q, length:Math.hypot(p.x-q.x,p.y-q.y), key:beamKey(a,b), strain:0 };
  });
  const used = new Set(beams.flat());
  return { layout, nodes, bars, used, tick:0, carX:125, carY:360, maxSag:0, maxStress:0, broken:[], result:null, failedAt:null };
}
export function stepBridge(trial) {
  if (trial.result) return trial.result;
  const { layout, nodes, bars } = trial;
  trial.tick++;
  trial.carX = 125 + Math.max(0, trial.tick - 45) * 1.05;
  const road = nodes.filter(n => n.id.startsWith('d'));
  const u = Math.max(0, Math.min(layout.spans - .00001, (trial.carX - 160) / layout.step));
  const segment = Math.floor(u), fraction = u - segment;
  for (const n of nodes) {
    if (n.fixed || !trial.used.has(n.id)) continue;
    const vx = (n.x - n.px) * .97, vy = (n.y - n.py) * .97;
    n.px = n.x; n.py = n.y;
    const load = trial.carX >= 160 && trial.carX <= 640 ? n === road[segment] ? 1-fraction : n === road[segment+1] ? fraction : 0 : 0;
    n.x += vx; n.y += vy + .08 + load * layout.load * 5;
  }
  for (let iteration = 0; iteration < 16; iteration++) {
    for (const bar of bars) {
      const {a,b,length} = bar, dx=b.x-a.x, dy=b.y-a.y, distance=Math.hypot(dx,dy) || .001;
      const error=(distance-length)/distance;
      const wa=a.fixed?0:1, wb=b.fixed?0:1;
      if (!wa && !wb) continue;
      a.x += dx*error*wa/(wa+wb); a.y += dy*error*wa/(wa+wb);
      b.x -= dx*error*wb/(wa+wb); b.y -= dy*error*wb/(wa+wb);
    }
  }
  const limit = layout.breakStrain ?? BREAK_STRAIN;
  for (const bar of bars) {
    bar.strain = Math.abs(Math.hypot(bar.b.x-bar.a.x,bar.b.y-bar.a.y)-bar.length)/bar.length;
    trial.maxStress = Math.max(trial.maxStress, bar.strain/limit);
    if (bar.strain > limit) { bar.broken = true; trial.broken.push(bar.key); }
  }
  if (trial.broken.length) trial.bars = trial.bars.filter(bar => !bar.broken);
  const sag = Math.max(...road.map(n => Math.abs(n.y-n.oy)));
  trial.maxSag = Math.max(trial.maxSag,sag);
  trial.carY = trial.carX < 160 || trial.carX > 640 ? 360 : road[segment].y*(1-fraction)+road[segment+1].y*fraction;
  if (sag > 15 || nodes.some(n => !Number.isFinite(n.x+n.y))) { trial.result='failed'; trial.failedAt=road.reduce((a,b)=>b.y-b.oy>a.y-a.oy?b:a).id; }
  else if (trial.carX >= 680) trial.result='success';
  return trial.result;
}
