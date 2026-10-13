import assert from "node:assert/strict";
import {createRequire} from "node:module";
import {mkdir,writeFile} from "node:fs/promises";
import {resolve,basename} from "node:path";
const require=createRequire(resolve(process.env.PLAYWRIGHT_PACKAGE||"../output/playwright/implement-20261012/package.json"));
const {chromium}=require("playwright");
const app=basename(process.cwd()),base=process.env.EDGE_BASE_URL||"http://127.0.0.1:59540";
assert.equal(new URL(base).hostname,"127.0.0.1","isolated loopback only");
const out=resolve("output/playwright/edge-20261013");await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||"C:/Program Files/Google/Chrome/Application/chrome.exe",headless:true,args:["--mute-audio"]});
const checks=[],errors=[];
const check=(value,label)=>{assert(value,label);checks.push(label);};
async function click(page,selector,width){const el=page.locator(selector);if(width<500)await el.tap();else await el.click();}
async function settled(page){await page.waitForFunction(()=>!document.querySelector("#run").disabled&&document.querySelector("#result-label").textContent.startsWith("최종"));}
async function finishTrace(page){for(let i=0;i<150&&!await page.locator("#step").isDisabled();i++)await page.locator("#step").click();assert(await page.locator("#step").isDisabled());}
async function choose(page,label){await page.locator("#operation-choices button").filter({has:page.getByText(label,{exact:true})}).click();await finishTrace(page);}
async function mainFlow(page,width){

  await page.locator("#color-grid button").first().focus();await page.keyboard.press("Enter");await click(page,"#color-next",width);
  for(let i=1;i<12;i++){await click(page,"#color-grid button:first-child",width);await click(page,"#color-next",width);}
  check(await page.locator("#color-result").isVisible(),width+": real color terminal");
  const record=await page.evaluate(()=>localStorage.getItem("sense-lab-history-v1"));
  await click(page,"#color-restart",width);
  check(await page.evaluate(raw=>localStorage.getItem("sense-lab-history-v1")===raw,record),width+": reset retains terminal history");
  await click(page,'[data-tab="reaction"]',width);
  await page.locator("#reaction-zone").focus();await page.keyboard.press("Enter");await page.keyboard.press("Enter");
  check(await page.locator("#reaction-zone").getAttribute("data-phase")==="false-start",width+": early keyboard rejected");
  await page.keyboard.press("Enter");check(await page.locator("#reaction-zone").getAttribute("data-phase")==="false-start",width+": repeated input cannot retry");
  await click(page,"#reaction-restart",width);await click(page,"#reaction-zone",width);
  await click(page,'[data-tab="pitch"]',width);await page.waitForTimeout(4500);
  check(await page.locator("#reaction-zone").getAttribute("data-phase")!=="go",width+": switched-away reaction timer canceled");
  await click(page,"#pitch-play",width);await click(page,"#pitch-stop",width);await page.waitForTimeout(1800);
  check(await page.locator("#pitch-up").isDisabled(),width+": late muted audio cannot unlock canceled answer");
  await click(page,'[data-tab="temporal"]',width);
  check(await page.locator("#temporal-play").isDisabled(),width+": no temporal stimulus without consent");
  await click(page,'[data-tab="color"]',width);

}
async function fixtures(browser) {

  const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,reducedMotion:"reduce"});
  const page=await context.newPage();page.on("pageerror",e=>errors.push(e.message));page.setDefaultTimeout(15000);

  try{
    await page.addInitScript(()=>{Object.defineProperty(window,"localStorage",{get(){throw new DOMException("fixture denied","SecurityError");}});});
    await page.goto(base+"/"+app+"/");
    for(let i=0;i<12;i++){await page.locator("#color-grid button").first().tap();await page.locator("#color-next").tap();}
    check(await page.locator("#color-result").isVisible(),"TEST_DOUBLE denied storage does not block color completion");
    check((await page.locator("#history-status").innerText()).length>0,"TEST_DOUBLE denied storage notice");
    await page.screenshot({path:out+"/storage-denied.png",fullPage:true});
  }finally{await context.close();}
}

try{
  for(const width of process.env.EDGE_FIXTURES_ONLY?[]:[1440,390,320]){
    const context=await browser.newContext({viewport:{width,height:1000},hasTouch:width<500,isMobile:width<500,reducedMotion:"reduce"});
    const page=await context.newPage();page.setDefaultTimeout(15000);page.on("pageerror",e=>errors.push(e.message));
    try{
      await page.goto(base+"/"+app+"/");
      await mainFlow(page,width);
      check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),width+": no horizontal overflow");
      await page.screenshot({path:out+"/viewport-"+width+".png",fullPage:true});
    }catch(e){await page.screenshot({path:out+"/FAIL-"+width+".png",fullPage:true});throw e;}finally{await context.close();}
  }
  await fixtures(browser);
  check(errors.length===0,"no uncaught browser exceptions");
}finally{
  await writeFile(out+"/browser.json",JSON.stringify({app,checks,errors,fixtureNote:"Only named injected timing/storage fixtures are TEST_DOUBLE. Main UI uses actual browser input.",remoteCI:"NOT_RUN",live:"NOT_RUN"},null,2));
  await browser.close();
}
console.log(JSON.stringify({app,checks:checks.length,errors}));
