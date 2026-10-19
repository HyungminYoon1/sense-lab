import assert from "node:assert/strict";
import {createRequire} from "node:module";
import {resolve} from "node:path";
import {mkdir} from "node:fs/promises";
const require=createRequire(resolve("../output/playwright/implement-20261012/package.json"));
const {chromium}=require("playwright");
const browser=await chromium.launch({executablePath:"C:/Program Files/Google/Chrome/Application/chrome.exe",headless:true,args:["--mute-audio"]});
const failures=[];
const base=process.env.SENSE_BASE_URL||"http://127.0.0.1:61668";
const out=resolve(`output/playwright/sense-20261019/${new URL(base).hostname==="127.0.0.1"?"local":"live"}`);
await mkdir(out,{recursive:true});
try {
  for(const width of [320,390]) {
    const page=await browser.newPage({viewport:{width,height:844},hasTouch:true,isMobile:true});
    await page.goto(base+"/sense-lab/");
    for(const selector of [".wordmark",'[data-panel="color"] .big-index']) {
      const fits=await page.locator(selector).evaluate(el=>getComputedStyle(el).display==="none"||el.getBoundingClientRect().height<=parseFloat(getComputedStyle(el).fontSize)*1.8);
      if(!fits)failures.push(`${width} ${selector} wraps`);
    }
    await page.locator('[data-tab="temporal"]').tap();
    const indexLines=await page.locator('[data-panel="temporal"] .big-index').evaluate(el=>{if(getComputedStyle(el).display==="none")return 0;const r=document.createRange();r.selectNodeContents(el);return r.getClientRects().length;});
    if(indexLines>1)failures.push(`${width} temporal index wraps`);
    await page.screenshot({path:`${out}/layout-temporal-${width}.png`,fullPage:true});
    await page.locator('[data-tab="memory"]').tap();await page.locator("#memory-mode").selectOption("reverse");await page.locator("#memory-start").tap();
    const visible=await page.locator("#memory-grid").evaluate(el=>{const r=el.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight;});
    if(!visible) failures.push(`${width} memory begins outside viewport`);
    await page.screenshot({path:`${out}/layout-memory-start-${width}.png`});
    await page.locator('[data-tab="color"]').tap();await page.close();
  }
  assert.deepEqual(failures,[]);
  console.log("320/390px branding and memory start viewport: PASS");
} finally {await browser.close();}
