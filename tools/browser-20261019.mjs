import assert from "node:assert/strict";
import {createRequire} from "node:module";
import {mkdir,writeFile} from "node:fs/promises";
import {resolve} from "node:path";
import {colorStep,COLOR_DELTAS} from "../dist/src/challenges.js";
const require=createRequire(resolve("../output/playwright/implement-20261012/package.json"));
const {chromium}=require("playwright");
const base=process.env.SENSE_BASE_URL||"http://127.0.0.1:61668";
assert(["127.0.0.1","hyungminyoon1.github.io"].includes(new URL(base).hostname));
const live=new URL(base).hostname!=="127.0.0.1";
const out=resolve(`output/playwright/sense-20261019/${live?"live":"local"}`);
await mkdir(out,{recursive:true});
const checks=[],errors=[];
const check=(value,label)=>{assert(value,label);checks.push(label);};
const browser=await chromium.launch({executablePath:"C:/Program Files/Google/Chrome/Application/chrome.exe",headless:true,args:["--mute-audio"]});
const context=await browser.newContext({viewport:{width:1440,height:1100},reducedMotion:"reduce"});
const page=await context.newPage();page.setDefaultTimeout(20000);page.on("pageerror",e=>errors.push(e.message));
const click=id=>page.locator("#"+id).click();
const tab=name=>page.locator(`[data-tab="${name}"]`).click();
async function recordsAbsent() {check(await page.evaluate(()=>localStorage.getItem("sense-lab-records-v2")===null),"No automatic detailed storage");}
async function save(kind) {
  await click(kind+"-save");
  check(await page.locator("#"+kind+"-save").isDisabled(),kind+": explicit save succeeds");
  check(await page.evaluate(k=>JSON.parse(localStorage.getItem("sense-lab-records-v2")).runs[k].length===1,kind),kind+": single bounded record");
}
try {
  await page.goto(base+"/sense-lab/");
  check(await page.locator(".topbar").getByText("PACKET JOURNEY").count()===0,"unrelated navigation removed");
  check(await page.locator(".test-guide").count()===6,"six purpose/instruction/result guides");
  await page.locator("#color-mode").selectOption("challenge");
  check((await page.locator("#color-difference").textContent()).includes("ΔL 1.2%"),"hard color begins at 1.2 percent");
  for(let i=0;i<12;i++) {
    const index=await page.locator("#color-grid button").evaluateAll(tiles=>tiles.findIndex(tile=>tiles.filter(t=>t.style.getPropertyValue("--tile")===tile.style.getPropertyValue("--tile")).length===1));
    await page.locator("#color-grid button").nth(index).click(); await click("color-next");
  }
  await recordsAbsent();check((await page.locator("#completion-status").textContent()).startsWith("1/6"),"color completion without save");
  await save("color"); await click("color-restart");
  check(await page.locator("#color-save").isHidden(),"new test discards pending result only");
  console.log("BROWSER color and optional-save PASS");

  await tab("reaction");await click("reaction-zone");await click("reaction-zone");
  check(await page.locator("#reaction-zone").getAttribute("data-phase")==="false-start","early input rejected");
  await click("reaction-zone");check(await page.locator("#reaction-zone").getAttribute("data-phase")==="false-start","repeat cannot restart");
  await click("reaction-restart");await page.locator("#reaction-mode").selectOption("challenge");
  for(let i=0;i<5;i++) {
    await click("reaction-zone");await page.waitForFunction(()=>document.querySelector("#reaction-zone").dataset.phase==="go");
    await page.waitForTimeout(180);await click("reaction-zone");
    await page.waitForFunction(()=>["result","complete"].includes(document.querySelector("#reaction-zone").dataset.phase));
    if(i<4){await click("reaction-next");}
  }
  await save("reaction");console.log("BROWSER reaction PASS");

  await tab("memory");check(await page.locator("#memory-grid button").count()===25,"default memory has 25 unnumbered positions");
  await page.locator("#memory-mode").selectOption("reverse");
  for(let r=0;r<8;r++) {
    await page.evaluate(()=>{
      window.qaSequence=[];window.qaObserver?.disconnect();
      window.qaObserver=new MutationObserver(changes=>{for(const change of changes)if(change.attributeName==="class"&&change.target.classList.contains("lit"))window.qaSequence.push([...document.querySelector("#memory-grid").children].indexOf(change.target));});
      window.qaObserver.observe(document.querySelector("#memory-grid"),{subtree:true,attributes:true,attributeFilter:["class"]});
    });
    await click("memory-start");
    check(await page.locator("#memory-grid button").evaluateAll(tiles=>tiles.every(t=>t.textContent==="")),"memory presentation contains no numeric solution");
    await page.waitForFunction(()=>!document.querySelector("#memory-grid button").disabled);
    const sequence=await page.evaluate(()=>{window.qaObserver.disconnect();return window.qaSequence;});
    assert.equal(sequence.length,6+r);
    for(const cell of sequence.reverse())await page.locator("#memory-grid button").nth(cell).click();
  }
  check((await page.locator("#memory-result").textContent()).includes("최대 13칸"),"actual 6x6 reverse sequence accepted through round eight");
  await save("memory");console.log("BROWSER reverse memory PASS");

  await tab("sound");await page.locator("#hearing-mode").selectOption("challenge");
  for(let i=0;i<18;i++){
    await click("hearing-play");await page.waitForFunction(()=>!document.querySelector('[data-heard="neither"]').disabled);
    await page.locator('[data-heard="neither"]').click();await click("hearing-next");
  }
  check((await page.locator("#hearing-result").textContent()).includes("0/18"),"18 real muted audio trials completed");
  await save("hearing");console.log("BROWSER hearing PASS (muted; not human hearing evidence)");

  await tab("pitch");await page.locator("#pitch-mode").selectOption("challenge");
  await click("pitch-play");await click("pitch-stop");await page.waitForTimeout(1800);
  check(await page.locator("#pitch-up").isDisabled(),"canceled audio cannot unlock an answer");
  for(let i=0;i<12;i++){
    await click("pitch-play");await page.waitForFunction(()=>!document.querySelector("#pitch-up").disabled);
    await click("pitch-up");await click("pitch-next");
  }
  await save("pitch");console.log("BROWSER pitch PASS");

  await tab("temporal");check(await page.locator("#temporal-play").isDisabled(),"light stimulus requires consent");
  await page.locator("#temporal-mode").selectOption("challenge");await page.locator("#temporal-consent").check();
  let answered=0;
  for(let attempt=0;attempt<40&&answered<12;attempt++){
    await page.evaluate(()=>{
      window.qaFirst=null;window.qaOffsets=[];window.qaObserver?.disconnect();
      window.qaObserver=new MutationObserver(changes=>{
        for(const change of changes){if(change.target.classList.contains("shown")&&!window.qaFirst)window.qaFirst=change.target.id.includes("left")?"left":"right";}
        const removed=changes.filter(c=>c.oldValue?.includes("shown")&&!c.target.classList.contains("shown"));
        if(removed.length)window.qaOffsets.push(removed.length);
      });
      window.qaObserver.observe(document.querySelector(".temporal-stage"),{subtree:true,attributes:true,attributeOldValue:true,attributeFilter:["class"]});
    });
    await click("temporal-play");
    await page.waitForFunction(()=>!document.querySelector("#temporal-left").disabled||/불안정|지연이 생겨/.test(document.querySelector("#temporal-feedback").textContent));
    if(await page.locator("#temporal-left").isDisabled())continue;
    const observed=await page.evaluate(()=>({first:window.qaFirst,offsets:window.qaOffsets}));
    check(observed.offsets.every(n=>n===2),"temporal dots disappear together");
    await click("temporal-"+observed.first);await click("temporal-next");answered++;
  }
  assert.equal(answered,12,"stable display needed for twelve actual trials");await save("temporal");
  check((await page.locator("#completion-status").textContent())==="6/6종 체험 완료","all six actual terminal paths counted");
  console.log("BROWSER temporal and six-kind completion PASS");
  const raw=await page.evaluate(()=>localStorage.getItem("sense-lab-records-v2"));
  const gallery=await context.newPage();await gallery.goto(base+"/web-lab/#sense-lab");
  check((await gallery.locator("#dialog-session").textContent()).includes("6/6종 체험 완료"),"separate gallery tab reads six-kind summary");
  await gallery.screenshot({path:out+"/gallery.png"});await gallery.close();await page.bringToFront();
  await page.reload();check(await page.evaluate(before=>localStorage.getItem("sense-lab-records-v2")===before,raw),"saved results survive reload byte-for-byte");
  await click("history-clear-all");check((await page.locator("#completion-status").textContent())==="6/6종 체험 완료","detailed deletion preserves completion");
  await click("completion-clear");await page.reload();check((await page.locator("#completion-status").textContent())==="0/6종 체험 완료","completion reset survives reload");

  for(const width of [1440,390,320]) {
    await page.setViewportSize({width,height:1100});
    for(const name of ["color","reaction","sound","pitch","memory","temporal"]){
      await tab(name);check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${width}px ${name}: no horizontal overflow`);
      await page.screenshot({path:`${out}/${name}-${width}.png`,fullPage:true});
    }
  }
  // Legacy/corruption/denied-storage contexts are intentionally synthetic fixtures.
  let state={level:3,streak:0};const rounds=Array.from({length:12},()=>{const r={correct:true,level:state.level,delta:COLOR_DELTAS[state.level]};state=colorStep(state,true);return r;});
  const legacy=JSON.stringify({version:1,runs:{color:[{id:"00000000-0000-4000-8000-000000000001",completedAt:"2026-10-09T10:00:00.000Z",rounds}],memory:[],reaction:[]}});
  for(const type of ["legacy","corrupt","denied"]){
    const c=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true});const p=await c.newPage();p.on("pageerror",e=>errors.push(e.message));
    await p.addInitScript(({type,legacy})=>{
      if(type==="denied") Object.defineProperty(window,"localStorage",{get(){throw new DOMException("fixture denied","SecurityError");}});
      else if(type==="legacy"&&!sessionStorage.seeded){localStorage.setItem("sense-lab-history-v1",legacy);sessionStorage.seeded="yes";}
      else if(type==="corrupt")localStorage.setItem("sense-lab-records-v2","{invalid");
    },{type,legacy});
    await p.goto(base+"/sense-lab/");
    if(type==="legacy"){
      check(await p.evaluate(old=>localStorage.getItem("sense-lab-history-v1")===old,legacy),"FIXTURE old bytes unchanged on open");
      check((await p.locator("#completion-status").textContent())==="1/6종 체험 완료","FIXTURE legacy achievement imported only");
      await p.locator("#completion-clear").tap();await p.reload();
      check((await p.locator("#completion-status").textContent())==="0/6종 체험 완료","FIXTURE reset not resurrected by old records");
      check(await p.evaluate(old=>localStorage.getItem("sense-lab-history-v1")===old,legacy),"FIXTURE reset preserves old bytes");
    } else {
      for(let i=0;i<12;i++){await p.locator("#color-grid button").first().tap();await p.locator("#color-next").tap();}
      await p.locator("#color-save").tap();check((await p.locator("#color-save-status").textContent()).includes("저장하지 못"),`FIXTURE ${type}: explicit save failure visible`);
      if(type==="corrupt")check(await p.evaluate(()=>localStorage.getItem("sense-lab-records-v2"))==="{invalid","FIXTURE corruption preserved");
    }
    await p.screenshot({path:`${out}/fixture-${type}.png`,fullPage:true});await c.close();
  }
  check(errors.length===0,"no uncaught exceptions");
} catch(error) {
  await page.screenshot({path:out+"/FAIL.png",fullPage:true});throw error;
} finally {
  await writeFile(out+"/report.json",JSON.stringify({live,checks,errors,note:"Real Chromium UI with muted Web Audio; observed rendered stimuli are used by automation, not human performance. Synthetic storage contexts are labelled FIXTURE. No existing visitor profile is used."},null,2));
  await browser.close();
}
console.log(JSON.stringify({live,passed:checks.length,errors}));
