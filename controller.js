import {connectFirebase, watchSession, saveSession, patchSession} from "./firebase.js";
const session=new URLSearchParams(location.search).get("session");
let state=null;
const $=id=>document.getElementById(id);
function send(fn){return fn()}
function log(message){state.log=[{time:new Date().toISOString(),message},...(state.log||[])].slice(0,150)}
function pressure(s){if(!s.inserted)return 0;const sec=Math.max(0,(Date.now()-new Date(s.timeIn).getTime())/1000);return Math.max(0,s.initialPressure-((state.consumptionLpm*sec/60)/state.cylinderVolumeL))}
function render(){
 if(!state)return;
 $("rate").value=state.consumptionLpm;
 $("rateLabel").textContent=state.consumptionLpm+" L/min";
 $("status").textContent="LIVE · ECB "+state.boardName;
 const c=$("controls");c.innerHTML="";
 state.slots.filter(s=>s.inserted).forEach(s=>{
  c.innerHTML+=`<div class="slot"><div class="slothead"><b>${s.id}. ${esc(s.name)}</b><span>${Math.round(pressure(s))} bar · ${esc(s.team)}</span></div>
  <div class="buttons">
  <button onclick="alarm(${s.id},'DSU')">DSU</button><button onclick="alarm(${s.id},'ADSU')">ADSU</button>
  <button class="warn" onclick="alarm(${s.id},'MOTION ALARM')">MOTION ALARM</button><button class="danger" onclick="evac(${s.id})">EVACUATE</button>
  <button onclick="telemetry(${s.id},${!s.telemetry})">${s.telemetry?"DROP TELEMETRY":"RESTORE TELEMETRY"}</button>
  <button class="green" onclick="ack(${s.id})">ACKNOWLEDGE</button>
  <button onclick="removeTally(${s.id})">REMOVE TALLY</button></div></div>`;
 });
 $("log").innerHTML=(state.log||[]).map(e=>`<div class="event"><time>${new Date(e.time).toLocaleTimeString()}</time>${esc(e.message)}</div>`).join("");
}
function esc(v){return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[m]))}
window.changeRate=async d=>{const v=Math.max(10,Math.min(150,state.consumptionLpm+d));state.consumptionLpm=v;log(`Instructor set simulated air consumption to ${v} L/min.`);await saveSession(session,state)};
window.rateInput=async v=>{const n=Math.max(10,Math.min(150,Number(v)));state.consumptionLpm=n;log(`Instructor set simulated air consumption to ${n} L/min.`);await saveSession(session,state)};
window.alarm=async(id,type)=>{const s=state.slots[id-1];s.alarm=type;s.alarmAck=false;log(`Tally ${id}: ${type} activated.`);await saveSession(session,state)};
window.ack=async id=>{const s=state.slots[id-1];if(s.alarm){s.alarmAck=true;log(`Tally ${id}: ${s.alarm} acknowledged by ECO.`);await saveSession(session,state)}};
window.telemetry=async(id,en)=>{state.slots[id-1].telemetry=en;log(`Tally ${id}: telemetry ${en?"restored":"link lost"}.`);await saveSession(session,state)};
window.removeTally=async id=>{const s=state.slots[id-1];log(`Tally ${id} removed from board.`);Object.assign(s,{name:"",team:"",initialPressure:0,timeIn:null,inserted:false,alarm:null,alarmAck:false,evac:null,telemetry:false});await saveSession(session,state)};
window.evac=async id=>{const s=state.slots[id-1];if(!s.inserted)return;s.evac="sent";log(`Tally ${id}: evacuation signal SENT.`);await saveSession(session,state);
 setTimeout(async()=>{if(s.evac==="sent"){s.evac="received";log(`Tally ${id}: evacuation signal RECEIVED.`);await saveSession(session,state)}},1200);
 setTimeout(async()=>{if(s.evac==="received"){s.evac="confirmed";log(`Tally ${id}: withdrawal CONFIRMED by wearer.`);await saveSession(session,state)}},2600)};
window.evacAll=async()=>{log("BOARD: EVACUATE ALL initiated.");await saveSession(session,state);state.slots.filter(s=>s.inserted).forEach((s,i)=>setTimeout(()=>evac(s.id),i*300))};
window.reset=async()=>{if(!confirm("Reset board to blank?"))return;state.slots.forEach(s=>Object.assign(s,{name:"",team:"",initialPressure:0,timeIn:null,inserted:false,alarm:null,alarmAck:false,evac:null,telemetry:false}));state.log=[];log("Scenario reset. ECB ready.");await saveSession(session,state)};
async function start(){if(!session){document.body.innerHTML="<main><h2>No training session</h2><p>Scan the QR code on the ECB board.</p></main>";return}await connectFirebase();watchSession(session,s=>{if(s){state=s;render()}})}
start().catch(e=>{console.error(e);$("status").textContent="Connection failed — check Firebase setup."});
setInterval(()=>{if(state)render()},1000);
