// spin.js - 单人模式转盘逻辑（<200行）
// 职责：封装旋转动画、结果判定，与 Canvas 绘制模块解耦。
import { challenges } from '../data.js';
import { updateSpin, appState, resetSpin } from '../state/appState.js';
import { drawWheel } from '../wheel.js';
import { getSynth, getMetalSynth } from '../sound.js';
import { weapons } from '../data.js';

const synth = getSynth();
const metal = getMetalSynth();

let animationId = null;
let lastAngleIndex = 0;
const DECAY = 0.98;
const MIN_SPEED = 0.001;
function isTestFast(){ try { return !!window.__TEST_FAST__; } catch { return false; } }

const spinRuntime = { rotation:0, speed:0, highlighted:null };
export function getRotation(){ return spinRuntime.rotation; }

export function startSpin(ctx, canvas, activeWeaponNames){
  if (appState.spin.isSpinning) return;
  const active = weapons.filter(w=>activeWeaponNames.includes(w.name));
  if (active.length < 2) return;
  resetSpin();
  updateSpin({ isSpinning: true });
  spinRuntime.rotation %= (Math.PI*2);
  spinRuntime.speed = isTestFast()? 0.05 : (Math.random()*0.2 + 0.3);
  try { synth.triggerAttackRelease('C2','8n'); } catch {}
  animate(active, ctx, canvas);
}

function animate(active, ctx, canvas){
  if (isTestFast() ? spinRuntime.speed <= 0.01 : spinRuntime.speed <= MIN_SPEED){
    finish(active);
    return;
  }
  spinRuntime.rotation += spinRuntime.speed;
  spinRuntime.speed *= isTestFast()? 0.6 : DECAY;
  const step = (Math.PI*2)/active.length;
  const angleIndex = Math.floor(spinRuntime.rotation * (active.length / (Math.PI*2)));
  if (angleIndex !== lastAngleIndex){
    try { metal.triggerAttackRelease('C5','8n'); } catch {}
    lastAngleIndex = angleIndex;
  }
  drawWheel(ctx, canvas, active, spinRuntime.rotation, spinRuntime.highlighted);
  animationId = requestAnimationFrame(()=>animate(active, ctx, canvas));
}

function finish(active){
  updateSpin({ isSpinning:false });
  try { synth.triggerAttackRelease('G4','0.5s'); } catch {}
  const finalAngle = spinRuntime.rotation % (Math.PI*2);
  const step = (Math.PI*2)/active.length;
  const corrected = (1.5*Math.PI - finalAngle + 2*Math.PI) % (2*Math.PI);
  const idx = Math.floor(corrected / step);
  const weapon = active[idx];
  let challenge=null, show=false;
  if (Math.random()>0.25){ challenge = challenges[Math.floor(Math.random()*challenges.length)]; show=true; }
  updateSpin({ weapon, challenge, showChallenge: show });
}

export function cancelSpin(){ if(animationId) cancelAnimationFrame(animationId); }
