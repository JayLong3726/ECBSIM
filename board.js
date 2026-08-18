import {connectFirebase, saveSession, patchSession, watchSession, randomSession} from "./firebase.js";

const session = new URLSearchParams(location.search).get("session") || randomSession();
const isNew = !new URLSearchParams(location.search).get("session");
const slots = Array.from({length:6},(_,i)=>({
 id:i+1,name:"",team:"",initialPressure:0,timeIn:null,inserted:false,
 alarm:null,alarmAck:false,evac:null,telemetry:false
}));
let state={boardName:"ECB ALPHA",displayMode:"tow",consumptionLpm:50,cylinderVolumeL:9,slots,log:[]};
let pending=null;

const $=id=>document.getElementById(id);
function log(message){
 state.log=[{time:new Date().toISOString(),message},...(state.log||[])].slice(0,150);
}
function pressure(s){
 if(!s.inserted||!s.timeIn)return 0;
 const sec=Math.max(0,(Date.now()-new Date(s.timeIn).getTime())/1000);
 const used=(state.consumptionLpm*sec)/60;
 return Math.max(0,s.initialPressure-used/state.cylinderVolumeL);
}
function ttw(s){
 const p=pressure(s);
 return Math.max(0,(p-60)*state.cylinderVolumeL/state.consumptionLpm);
}
function fmt(sec){sec=Math.max(0,Math.floor(sec));return String(Math.floor(sec/60)).padStart(2,"0")+":"+String(sec%60).padStart(2,"0")}
function render(){
 $("session").textContent=session;
 $("rate").textContent=state.consumptionLpm+" L/min";
 $("qr").src=`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(location.origin+location.pathname.replace("board.html","controller.html")+"?session="+session)}`;
 $("qrLink").textContent=location.origin+location.pathname.replace("board.html","controller.html")+"?session="+session;
 const root=$("slots");root.innerHTML="";
 state.slots.forEach(s=>{
  if(!s.inserted){
   root.innerHTML+=`<div class="slot"><div class="num">${s.id}</div><div class="available">Place Tally</div><div class="action"><button onclick="openInsert(${s.id})">INSERT TALLY</button></div></div>`;
   return;
  }
  const p=Math.round(pressure(s)), pct=Math.max(0,Math.min(100,p/3));
  const display=state.displayMode==="elapsed"?`Elapsed: ${fmt((Date.now()-new Date(s.timeIn).getTime())/1000)}`:
    state.displayMode==="ttw"?`TTW: ${Math.floor(ttw(s))} min`:`TOW: ${new Date(Date.now()+ttw(s)*60000).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})}`;
  let alarm=s.alarm?`<div class="alarm ${s.alarmAck?"ack":""}">${s.alarm} · ${s.alarmAck?"ACKNOWLEDGED":"CONFIRM ON BOARD"}</div>`:"";
  let evac=s.evac?`<div class="evac ${s.evac}">${s.evac==="sent"?"EVACUATION SENT":s.evac==="received"?"EVACUATION RECEIVED":"WITHDRAWAL CONFIRMED"}</div>`:"";
  root.innerHTML+=`<div class="slot"><div class="num">${s.id}</div><div class="main">
  <div class="row"><span class="name">${escapeHtml(s.name)}</span><span class="pressure">${p} bar</span></div>
  <div class="team">${escapeHtml(s.team)}</div><div class="bar"><i style="width:${pct}%"></i></div>
  <div class="meta"><span>${display}</span><span>${s.telemetry?"● TELEMETRY":"● LINK LOST"}</span><span>IN: ${new Date(s.timeIn).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})}</span></div>${alarm}${evac}</div>
  <div class="action"><button onclick="evacuate(${s.id})">EVACUATE</button></div></div>`;
 });
 $("log").innerHTML=(state.log||[]).map(e=>`<div class="event"><time>${new Date(e.time).toLocaleTimeString()}</time>${escapeHtml(e.message)}</div>`).join("");
}
function escapeHtml(v){return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[m]))}
function openInsert(id){
 pending=id;$("modal").classList.add("show");
 $("name").value="";$("team").value="ALPHA";$("pressureInput").value=300;
 $("timeIn").value=new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,16);
}
window.closeModal=()=> $("modal").classList.remove("show");
window.insertTally=async()=>{
 const s=state.slots[pending-1];
 s.name=$("name").value.trim()||"Wearer";s.team=$("team").value;s.initialPressure=Number($("pressureInput").value)||0;
 s.timeIn=new Date($("timeIn").value).toISOString();s.inserted=true;s.telemetry=true;s.alarm=null;s.alarmAck=false;s.evac=null;
 log(`Tally ${pending} inserted: ${s.name}, ${s.initialPressure} bar, ${s.team}.`);
 await saveSession(session,state);closeModal();
};
window.evacuate=async id=>{
 const s=state.slots[id-1];if(!s.inserted)return;s.evac="sent";log(`Tally ${id}: evacuation signal SENT.`);await saveSession(session,state);
 setTimeout(async()=>{if(s.evac==="sent"){s.evac="received";log(`Tally ${id}: evacuation signal RECEIVED.`);await saveSession(session,state)}},1200);
 setTimeout(async()=>{if(s.evac==="received"){s.evac="confirmed";log(`Tally ${id}: withdrawal CONFIRMED by wearer.`);await saveSession(session,state)}},2600);
};
window.evacuateAll=async()=>{log("BOARD: EVACUATE ALL initiated.");await saveSession(session,state);state.slots.filter(s=>s.inserted).forEach((s,i)=>setTimeout(()=>evacuate(s.id),i*300))};
window.resetBoard=async()=>{
 state={boardName:"ECB ALPHA",displayMode:"tow",consumptionLpm:50,cylinderVolumeL:9,slots:Array.from({length:6},(_,i)=>({...slots[i],name:"",team:"",initialPressure:0,timeIn:null,inserted:false,alarm:null,alarmAck:false,evac:null,telemetry:false})),log:[]};
 log("Scenario reset. ECB ready.");await saveSession(session,state);
};
window.setDisplay=async mode=>{state.displayMode=mode;await patchSession(session,{displayMode:mode})};

async function start(){
 await connectFirebase();
 if(isNew) await saveSession(session,state);
 else watchSession(session,s=>{if(s){state=s;render()}});
 $("qrLink").onclick=e=>{e.preventDefault();navigator.clipboard?.writeText($("qrLink").textContent)};
 render();
 if(isNew) watchSession(session,s=>{if(s){state=s;render()}});
 setInterval(render,1000);
}
start().catch(e=>{console.error(e);$("error").textContent="Firebase connection failed. Check firebase-config.js and Firebase setup.";});
