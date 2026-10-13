// Run via Playwright CLI in a fresh, muted loopback browser.
async (page) => {
  const checks=[],errors=[],assert=(ok,label)=>{if(!ok)throw new Error(label);checks.push(label);};
  const output="../output/qa-20261013/sense-lab";
  page.on("pageerror",e=>errors.push(e.message));
  await page.setViewportSize({width:1440,height:1000});
  // Ordinary choices, without reading or injecting randomized answers.
  for(let i=0;i<12;i++){await page.locator("#color-grid button").first().click();await page.locator("#color-next").click();}
  assert(await page.locator("#color-result").isVisible(),"Twelve answered color rounds produce a terminal result");
  const retained=await page.evaluate(()=>localStorage.getItem("sense-lab-history-v1"));
  await page.locator("#color-restart").click();
  assert(await page.evaluate(before=>localStorage.getItem("sense-lab-history-v1")===before,retained),"New test preserves the completed device record");
  await page.locator('[data-tab="reaction"]').click();
  await page.locator("#reaction-zone").click();await page.locator("#reaction-zone").click();
  assert(await page.locator("#reaction-zone").getAttribute("data-phase")==="false-start","Early input rejected");
  await page.locator("#reaction-restart").click();
  for(let i=0;i<5;i++){
    await page.locator("#reaction-zone").click();
    await page.waitForFunction(()=>document.querySelector("#reaction-zone").dataset.phase==="go");
    await page.waitForTimeout(180);await page.locator("#reaction-zone").click();
    await page.waitForFunction(()=>["result","complete"].includes(document.querySelector("#reaction-zone").dataset.phase));
    if(i<4)await page.locator("#reaction-next").click();
  }
  assert(await page.locator("#reaction-zone").getAttribute("data-phase")==="complete","Five real browser timed responses settle once");
  await page.locator("#reaction-reading summary").click();
  await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:output+"/desktop.png",fullPage:true});
  for(const width of [390,320]){await page.setViewportSize({width,height:844});await page.evaluate(()=>window.scrollTo(0,0));assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`No overflow at ${width}`);await page.screenshot({path:output+`/mobile-${width}.png`,fullPage:true});}
  await page.locator('[data-tab="temporal"]').click();
  assert(await page.locator("#temporal-play").isDisabled(),"Temporal stimulus requires consent");
  await page.locator("#temporal-consent").check();await page.locator("#temporal-play").click();
  await page.locator("#temporal-stop").click();
  assert(await page.locator("#temporal-score").innerText()==="0","Cancelled temporal trial does not score");
  assert(await page.locator(".temporal-dot.shown").count()===0,"Cancelled dots cleared");
  await page.locator("#temporal-restart").click();
  assert(await page.locator("#temporal-play").isDisabled(),"Restart retains the two-second cooldown");
  await page.locator('[data-tab="pitch"]').click();await page.locator("#pitch-play").click();await page.locator("#pitch-stop").click();
  assert(await page.locator("#pitch-up").isDisabled(),"Cancelled muted pitch playback cannot accept answers");
  await page.locator('[data-tab="sound"]').click();await page.locator("#hearing-play").click();await page.locator("#hearing-stop").click();
  assert(await page.locator('[data-heard="a"]').isDisabled(),"Cancelled muted A/B playback cannot accept answers");
  for(let i=0;i<9;i++){
    await page.locator("#hearing-play").click();
    await page.waitForFunction(()=>!document.querySelector('[data-heard="neither"]').disabled);
    await page.locator('[data-heard="neither"]').click();await page.locator("#hearing-next").click();
  }
  assert(await page.locator("#session-hearing").innerText()==="0/9","Muted scripted nine-round session reaches its actual terminal result");
  await page.locator("#hearing-restart").click();
  assert(await page.locator("#session-hearing").innerText()==="—","Restart clears the prior hearing result in the real browser");
  await page.locator('[data-tab="memory"]').click();await page.locator("#memory-start").click();await page.locator("#memory-stop").click();
  await page.waitForTimeout(600);
  assert(await page.locator("#memory-grid button:enabled").count()===0,"Cancelled sequence does not later enable recall");
  assert(errors.length===0,"No uncaught page errors");
  return {checks,errors,reaction:await page.locator("#reaction-result").innerText(),screenshots:output,limitations:"Scripted response timings, muted audio and viewport emulation; no human/clinical/optical measurement"};
}
