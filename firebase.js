import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";
import { getDatabase, ref, set, update, onValue } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-database.js";
import { firebaseConfig } from "./firebase-config.js";

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);

export async function connectFirebase(){
  await signInAnonymously(auth);
}
export function sessionRef(id){ return ref(db, "sessions/"+id); }
export function sessionStateRef(id){ return ref(db, "sessions/"+id+"/state"); }
export async function saveSession(id, state){ await set(sessionStateRef(id), state); }
export async function patchSession(id, patch){ await update(sessionStateRef(id), patch); }
export function watchSession(id, cb){ return onValue(sessionStateRef(id), snap => cb(snap.val())); }

export function randomSession(){
  const chars="ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s="";
  crypto.getRandomValues(new Uint8Array(8)).forEach(v=>s+=chars[v%chars.length]);
  return s;
}
