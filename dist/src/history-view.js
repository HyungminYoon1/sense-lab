import { summarizeRun, HISTORY_KEY } from "./history.js";
import { createRecordStore } from "./record-store.js";
import { MODES, RECORD_KEY, validateRecord, isComplete } from "./record-model.js";
import { createCompletionStore, COMPLETION_KEY } from "./completion.js";
import { memoryProfile } from "./challenges.js";

export function setupHistory(provider=()=>window.localStorage) {
  const store=createRecordStore(provider), completion=createCompletionStore(provider), pending=new Map();
  const $=id=>document.getElementById(id);
  const labels={color:"색감",reaction:"반응",hearing:"고주파 청취",pitch:"음높이",memory:"순서 기억",temporal:"시간 순서"};
  const notice=message=>{$("history-status").textContent=message;};
  function condition(kind,run,legacy) {
    if(legacy) return kind==="memory"?`이전 방식 · ${run.pace} ms/칸`:"이전 기록";
    return kind==="memory"?`${memoryProfile(run.mode).label} · ${run.pace} ms/칸`:run.mode==="challenge"?"심화":"기본";
  }
  function summary(kind,run) {
    if(kind==="reaction") {
      const s=summarizeRun("reaction",{id:run.id,completedAt:run.completedAt,rounds:run.rounds});
      return `${s.count}/5 정상 · 중앙값 ${s.median??"—"} ms · MAD ${s.mad??"—"} ms · 범위 ${s.best??"—"}–${s.worst??"—"} ms`;
    }
    const hits=run.rounds.filter(r=>r.correct);
    const tail=kind==="memory"?` · 최대 ${Math.max(0,...hits.map(r=>r.length))}칸`:kind==="color"?` · 최소 ΔL ${hits.length?Math.min(...hits.map(r=>r.delta))+"%":"—"}`:
      kind==="pitch"?` · 최소 ${hits.length?Math.min(...hits.map(r=>r.cents))+"센트":"—"}`:kind==="temporal"?` · 최소 ${hits.length?Math.min(...hits.map(r=>r.ms))+" ms":"—"}`:"";
    return `${hits.length}/${run.rounds.length} ${kind==="hearing"?"구간 일치":"정답"}${tail}`;
  }
  function roundText(kind,r,i) {
    if(kind==="reaction") return `${i+1}회 · `+({valid:`${r.elapsed} ms`,early:"신호 전 입력",excluded:"입력 제외",cancelled:"중단"})[r.outcome];
    const detail=kind==="color"?`단계 ${r.level+1} · ΔL ${r.delta}%`:kind==="memory"?`${r.length}칸`:
      kind==="hearing"?`${r.frequency/1000} kHz · ${r.heard==="neither"?"안 들림":r.heard.toUpperCase()}`:kind==="pitch"?`${r.cents}센트`:`${r.ms} ms · ${r.frames}프레임`;
    return `${i+1}회 · ${r.correct?"정답":"오답"} · ${detail}`;
  }
  function renderCompletion() {
    const state=completion.read();
    $("completion-status").textContent=state.ok?`${Object.keys(state.value.tests).length}/6종 체험 완료`:"완료 표시를 읽을 수 없습니다. 저장 공간 설정을 확인하거나 완료 표시를 초기화하세요.";
  }
  function render() {
    const data=store.read();
    for(const kind of MODES) {
      const rows=[...(data.legacy.runs[kind]||[]).map(run=>({run,legacy:true})),...data.records.runs[kind].map(run=>({run,legacy:false}))];
      rows.sort((a,b)=>b.run.completedAt.localeCompare(a.run.completedAt));
      $(kind+"-trend").textContent=rows.length?`${rows.length}개 저장 기록 · 같은 난이도와 기기에서 비교하세요.`:"저장한 결과가 없습니다. 테스트를 마친 뒤 원하는 결과만 저장할 수 있습니다.";
      $(kind+"-saved").replaceChildren(...rows.map(({run,legacy})=>{
        const card=document.createElement("div"), details=document.createElement("details"), title=document.createElement("summary"), list=document.createElement("ol"), remove=document.createElement("button");
        card.className="saved-run"; list.className="saved-rounds";
        const date=new Date(run.completedAt).toLocaleString("ko-KR",{dateStyle:"short",timeStyle:"short"});
        title.textContent=`${date} · ${condition(kind,run,legacy)} · ${summary(kind,run)}`;
        list.append(...run.rounds.map((r,i)=>Object.assign(document.createElement("li"),{textContent:roundText(kind,r,i)})));
        details.append(title,list); remove.className="small-button outline"; remove.textContent="이 기록 삭제";
        remove.setAttribute("aria-label",`${labels[kind]} ${date} 기록 삭제`);
        remove.addEventListener("click",()=>{
          const result=store.remove(kind,run.id,legacy);
          if(!result.ok) {notice("기록을 삭제하지 못했습니다. 원본은 확인 없이 덮어쓰지 않습니다.");return;}
          render(); notice("기록을 삭제했습니다. 체험 완료 표시는 유지됩니다."); $(kind+"-records-title").focus({preventScroll:true});
        });
        card.append(details,remove); return card;
      }));
    }
    if(!data.ok || !data.legacyOk) notice("일부 저장 기록을 읽을 수 없습니다. 읽을 수 있는 기록만 표시하며 원본은 보존합니다.");
    renderCompletion();
  }
  for(const kind of MODES) $(kind+"-save").addEventListener("click",()=>{
    const run=pending.get(kind); if(!run) return;
    const result=store.add(kind,run);
    if(!result.ok) {$(kind+"-save-status").textContent="저장하지 못했습니다. 저장 공간을 확인한 뒤 다시 시도하세요.";return;}
    pending.delete(kind); $(kind+"-save").disabled=true; $(kind+"-save-status").textContent="이 브라우저에 저장했습니다."; render();
  });
  const initial=store.read(), imported=completion.bootstrap(initial);
  render();
  if(!imported.ok || imported.synced===false) notice("완료 표시를 갱신하지 못했습니다. 테스트와 상세 기록 저장은 따로 사용할 수 있습니다.");
  $("history-clear-all").addEventListener("click",()=>{
    const result=store.clear(); render();
    notice(result.ok?"저장 기록을 삭제했습니다. 체험 완료 표시는 유지됩니다.":"일부 기록을 삭제하지 못했습니다. 다시 시도하세요.");
  });
  $("completion-clear").addEventListener("click",()=>{
    const result=completion.clear(); renderCompletion();
    notice(!result.ok?"완료 표시를 초기화하지 못했습니다.":result.synced?"완료 표시를 초기화했습니다. 저장 기록은 유지됩니다.":"완료 표시를 초기화했지만 WEB LAB 요약 갱신은 실패했습니다. 다시 시도하세요.");
  });
  window.addEventListener("storage",event=>{if([HISTORY_KEY,RECORD_KEY,COMPLETION_KEY,null].includes(event.key)) render();});
  return {
    reset(kind) {pending.delete(kind); $(kind+"-save").hidden=true; $(kind+"-save").disabled=false; $(kind+"-save-status").textContent="";},
    offer(kind,rounds,options={}) {
      try {
        const run={id:crypto.randomUUID(),completedAt:new Date().toISOString(),mode:options.mode||"standard",rounds:rounds.map(r=>({...r}))};
        if(kind==="memory") run.pace=options.pace;
        validateRecord(kind,run); pending.set(kind,run);
        $(kind+"-save").hidden=false; $(kind+"-save").disabled=false;
        $(kind+"-save-status").textContent="상세 결과는 아직 저장하지 않았습니다.";
        if(isComplete(kind,run)) {
          const result=completion.mark(kind,run.completedAt); renderCompletion();
          if(!result.ok || !result.synced) notice("테스트는 완료했습니다. 완료 표시를 저장하거나 WEB LAB에 반영하지 못했습니다.");
        }
      } catch {notice("이번 결과를 기록 형식으로 확인하지 못했습니다. 화면의 결과는 확인할 수 있습니다.");}
    },
  };
}
