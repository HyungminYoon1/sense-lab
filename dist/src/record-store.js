import { createHistoryStore } from "./history-store.js";
import { RECORD_KEY, RECORD_MAX_SIZE, RECORD_LIMIT, MODES, emptyRecords, validateRecords, validateRecord } from "./record-model.js";

// New explicit saves use a separate key. Reading old records never rewrites them.
export function createRecordStore(provider) {
  const legacyStore=createHistoryStore(provider);
  function read() {
    const legacy=legacyStore.read();
    const base={records:emptyRecords(),legacy:legacy.history,legacyOk:legacy.ok};
    try {
      const raw=provider().getItem(RECORD_KEY);
      if(raw===null) return {...base,ok:true};
      if(typeof raw!=="string" || raw.length>RECORD_MAX_SIZE) return {...base,ok:false,reason:"corrupt"};
      try {return {...base,ok:true,records:validateRecords(JSON.parse(raw))};}
      catch {return {...base,ok:false,reason:"corrupt"};}
    } catch {return {...base,ok:false,reason:"unavailable"};}
  }
  function write(records) {
    try {
      validateRecords(records); const raw=JSON.stringify(records);
      if(raw.length>RECORD_MAX_SIZE) return {ok:false,reason:"size"};
      const storage=provider(); storage.setItem(RECORD_KEY,raw);
      return storage.getItem(RECORD_KEY)===raw?{ok:true}:{ok:false,reason:"unavailable"};
    } catch {return {ok:false,reason:"unavailable"};}
  }
  return {
    read,
    add(kind,run) {
      try {validateRecord(kind,run);} catch {return {ok:false,reason:"invalid"};}
      const current=read(); if(!current.ok) return current;
      if(MODES.some(k=>[...current.records.runs[k],...(current.legacy.runs[k]||[])].some(r=>r.id===run.id))) return {ok:false,reason:"duplicate"};
      current.records.runs[kind]=[...current.records.runs[kind],run].slice(-RECORD_LIMIT);
      return write(current.records);
    },
    remove(kind,id,legacy=false) {
      if(legacy) return legacyStore.remove(kind,id);
      if(!MODES.includes(kind)) return {ok:false,reason:"invalid"};
      const current=read(); if(!current.ok) return current;
      current.records.runs[kind]=current.records.runs[kind].filter(r=>r.id!==id);
      return write(current.records);
    },
    clear() {
      const legacy=legacyStore.clear();
      try {
        const storage=provider(); storage.removeItem(RECORD_KEY);
        return {ok:legacy.ok && storage.getItem(RECORD_KEY)===null,reason:"unavailable"};
      } catch {return {ok:false,reason:"unavailable"};}
    },
  };
}
