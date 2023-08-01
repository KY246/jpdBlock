// Using chrome instead of browser breaks on Firefox for some reason
if(!window.browser){
  window.browser = chrome;
}

// current URL
let lnk = location.href;

// Get days from Jan 1 1970 Local time with offset included
const day = (offset = 0) => Math.floor((new Date().getTime()) / 8.64e7 - (new Date()).getTimezoneOffset() / 1440 - offset / 24);

// Get page favicon
const favicon = (u = lnk, s = 64) => {
  /*
  // Firefox no like :(
  const url = new URL(browser.runtime.getURL("/_favicon/"));
  url.searchParams.set("pageUrl", u);
  url.searchParams.set("size", s);
  return url.toString();
  */
  return lnk.split("/").slice(0, 3).join("/") + "/favicon.ico";
}

// Convert number to kanji form (up to 9999)
const toKanji = (val, min = true) => {
  let nums = "一二三四五六七八九"
  let digits = "十百千万"

  let sval = val + "";

  let s = "";
  for(let i = 0; i < sval.length; i++){
    if(sval[i] != 0){
      if(sval[i] != 1 || i == sval.length - 1){
        s += nums[sval[i] - 1];
      }
      s += ((i < sval.length - 1) ? digits[sval.length - 2 - i] : "");
    }
  }
  if(s.indexOf("undefined") != -1){
    return val + (min ? "分" : "");
  }
  return s + (min ? "分" : "");
};

/*
// Log changes to storage
browser.storage.onChanged.addListener((changes, namespace) => {
  for (let [key, { oldValue, newValue }] of Object.entries(changes)) {
    console.log(
      `Storage key "${key}" in namespace "${namespace}" changed.`,
      `Old value was "${oldValue}", new value is "${newValue}".`
    );
  }
});
*/

// Literally the only good thing about jQuery
const $ = id => document.getElementById(id);

// Set to storage
// set([key1, key2, ...keys], [value1, value2, ...values], function_to_run)
// set(key1, value1, function_to_run)
const set = (key, value, after) => {
  let info = {};
  if(typeof key == "object"){
    for(let i = 0; i < key.length; i++){
      info[key[i]] = value[i];
    }
  }else{
    info[key] = value;
  }
  
  browser.storage.local.set(info).then(() => {
    if(after){
      after(value);
    }
  });
};

// Get from storage
// set([key1, key2, ...keys], [default_value1, default_value2, ...default_values], function_to_run)
// set(key1, default_value1, function_to_run)
const get = (key, value, after) => {
  if(typeof key != "object"){
    key = [key];
    value = [value];
  }
  browser.storage.local.get(key).then(result => {
    let res = [];
    for(let i = 0; i < key.length; i++){
      if(result[key[i]] === undefined){
        result[key[i]] = value[i];
        set(key[i], value[i]);
      }
      res.push(result[key[i]]);
    }
    
    after(res);
  });
}

// List of keys to get from storage
let getList = [
  "count",          // 0
  "last_studied",   // 1
  "kanji_readings", // 2
  "vocab_amount",   // 3
  "last_day",       // 4
  "done_today",     // 5
  "min",            // 6
  "punish_points",  // 7
  "punish_percent", // 8
  "sites",          // 9
  "time_left",      // 10
  "loc",            // 11
  "hide_others",    // 12
  "extra_study",    // 13
  "time_offset",    // 14
  "extra_enabled",  // 15
  "finished",       // 16
];

// Main function to run
const main = () => {
  get(getList, [0, null, true, 3, day(), 0, 25, 0, 10, [], [], "lt", true, [], 0, false, -1, false], run);
}
main();

// Function to run after fetching storage keys from main
function run(c){
  //console.log(c);
  
  // If today isn't the last day points were earned,
  //    Punish user if they haven't done enough the day before, or missed more than 1 day
  //    Set reviews done today and new lessons done today to 0,
  //    Set last day to today
  //    Set "reviews went to 0 today" to false
  if(c[4] < day(c[14])){
    if(+c[5] >= +c[6] || c[16]){
      c[4] ++;
    }
    
    let today = day(c[14]);
    
    for(let i = c[4]; i < today; i++){
      c[0] -= c[7];
      c[0] -= c[0] * c[8] / 100;
    }
    
    c[0] = Math.max(c[0], 0) | 0;
    
    set(["count", "last_day", "done_today", "new_today", "finished"], [c[0], day(c[14]), 0, 0, false], () => {});
  }
  
  
  if(lnk.indexOf("jpdb.io") >= 0){
    // For jpdb.io URLs
    
    // If extra reviews are enabled, add the extra option to the nav bar
    if(c[15]){
      addExtraMenu(c[13].length / 2);
    }
    
    // Run global jpdb functions
    jpdb(c);
    
    if(lnk.indexOf("https:\/\/jpdb.io\/review?c") >= 0){
      // Inject point system script for reviews
      grade(c);
    }else if(lnk.indexOf("https:\/\/jpdb.io\/review") >= 0){
      // For review links without ?c (which is used when the answer is shown)
      
      if(lnk.indexOf("https:\/\/jpdb.io\/review#e") >= 0){
        // If link has #e (extra), inject script to create extra reviews
        extra(c);
        
        return;
      }else if($("grade-p")){
        // Inject script for grading new cards if dom element with id grade-p exists
        gradeNew(c);
        
        return;
      }else if(document.getElementsByClassName("kind")[0]?.innerText == "Kanji"){
        // Inject script for displaying readings and vocab words for kanji cards
        
        kanji(c);
      }
      
      // Wait until user clicks button to reveal answer
      wait(c);
    }
  }else if(location.href.indexOf("jpdb.io") == -1){
    // For non jpdb links
    
    // See if URL matches one on block list
    let matchId = -1;
    l1:for(let i = 0; i < c[9].length; i++){
      if(c[9][i][1]){
        let regex = new RegExp(c[9][i][0], c[9][i][2]);
        
        if(regex.test(location.href)){
          matchId = i;
          break l1;
        }
      }else{
        if(location.href.indexOf(c[9][i][0]) != -1){
          matchId = i;
          break l1;
        }
      }
    }
    
    // Stop running function if no matches are found
    if(matchId == -1){
      return;
    }
    
    // If no date for site expiration is set, make it 1/1/1970 0:00:00.001
    if(!c[10][matchId]){
      c[10][matchId] = 1;
    }
    
    // If site expired, create popup for buying time
    if(c[10][matchId] < (new Date()).getTime()){
      // convert large numbers to shortened numbers (up to 9999999999999999)
      // ie. 5632482 -> 563.2万
      const bigNum = num => {
        let len = ("" + num).length;
        let exp = num.toExponential(3).split("e")[0].replace(/\./g, "").replace(/0$/g, "");
        if(num < 1e4){
          num = num | 0;
        }else if(num < 1e8){
          num = (exp.slice(0, len - 4) + "." + exp.slice(len - 4)).replace(/\.$/g, "") + "万";
        }else if(num < 1e12){
          num = (exp.slice(0, len - 8) + "." + exp.slice(len - 8)).replace(/\.$/g, "") + "億";
        }else if(num < 1e16){
          num = (exp.slice(0, len - 12) + "." + exp.slice(len - 12)).replace(/\.$/g, "") + "兆";
        }else{
          num = num.toExponential(3);
        }
        return num;
      };
      
      // Pause any running youtube videos (when time expires during viewing)
      document.querySelectorAll('.html5-main-video').forEach(vid => vid.pause());
      
      // Create actual div which hides content
      let hider = document.createElement("div");
      hider.id = "jpdb_hider";
      hider.style = `
        background-color: #181818;
        color: #bbb;
        font-size: min(5vh, 5vw);
        text-align: center;
        
        margin: 0px;
        padding: 0px;
        border: none;
        border-radius: 0px;
        
        padding-top: 50px;
        
        overflow: auto;
        
        width: 100vw;
        height: 100vh;
        top: 0px;
        left: 0px;
        position: fixed;
        z-index: 9999999999;
      `;
      // prices
      let prc = [c[9][matchId][4], c[9][matchId][6], c[9][matchId][8]];
      // minutes
      let mins = [c[9][matchId][3], c[9][matchId][5], c[9][matchId][7]];
      hider.innerHTML = `
        <div style="background: none; color: #bbb; font-size: min(6vh, 6vw); text-align: center; margin: 0px; padding: 30px; padding-top: 20px; border: 1px solid #f00; border-radius: 10px; display: inline-block; box-shadow: none; width: auto;">
          <img style="height: min(10vh, 10vw); vertical-align:middle; filter:blur(1px);" src="${favicon()}"/>
          <span style="line-height: 6vh; vertical-align:middle">${lnk.split("/")[2]}</span>
        </div>
        <br/><br/>
        <div style="background: none; color: #2b6ddf; font-size: 5vh; text-align: center; margin: 0px; padding: 30px; padding-top: 5px; padding-bottom: 5px; border: 1px solid #2b6ddf; border-radius: 10px; display: inline-block; box-shadow: none; width: auto;">
          <span style="font-size: min(3vh, 3vw);"><b>現在</b></span>
          <span id="jpdb_count" style="font-size: min(8vh, wvw); display: block;">${bigNum(c[0])}</span>
          <span style="font-size: min(3vh, 3vw);"><b>点</b></span>
        </div>
        <br/><br/>
        <div id="jpdb_buy_0" style="background: none; color: #bbb; text-align: center; margin: 10px; padding: 30px; padding-top: 5px; padding-bottom: 5px; border: 1px solid #${c[0] >= prc[0] ? "f00; cursor: pointer" : "bbb"}; border-radius: 10px; display: inline-block; box-shadow: none; width: auto;">
          <span style="font-size: min(3vh, 3vw);"><b>${toKanji(mins[0])}</b></span>
          <span style="font-size: min(8vh, 8vw); display: block;">${prc[0]}</span>
        </div>
        <div id="jpdb_buy_1" style="background: none; color: #bbb; text-align: center; margin: 10px; padding: 30px; padding-top: 5px; padding-bottom: 5px; border: 1px solid #${c[0] >= prc[1] ? "f00; cursor: pointer" : "bbb"}; border-radius: 10px; display: inline-block; box-shadow: none; width: auto;">
          <span style="font-size: min(3vh, 3vw);"><b>${toKanji(mins[1])}</b></span>
          <span style="font-size: min(8vh, 8vw); display: block;">${prc[1]}</span>
        </div>
        <div id="jpdb_buy_2" style="background: none; color: #bbb; text-align: center; margin: 10px; padding: 30px; padding-top: 5px; padding-bottom: 5px; border: 1px solid #${c[0] >= prc[2] ? "f00; cursor: pointer" : "bbb"}; border-radius: 10px; display: inline-block; box-shadow: none; width: auto;">
          <span style="font-size: min(3vh, 3vw);"><b>${toKanji(mins[2])}</b></span>
          <span style="font-size: min(8vh, 8vw); display: block;">${prc[2]}</span>
        </div>
      `;
      
      // Disable scrolling
      let ovf = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      
      // Append hider
      document.body.appendChild(hider);
      
      let g = [$("jpdb_buy_0"), $("jpdb_buy_1"), $("jpdb_buy_2")];
      
      // Some webpages reenable scrolling
      let scrll = e => {
        if($("jpdb_hider")){
          document.body.style.overflow = "hidden";
        }
      };
      window.addEventListener("scroll", scrll);
      
      // See if time was bought on another tab on page focus and adjust accordingly
      let focs = e => {
        get(["count", "time_left"], [0, []], nv => {
          c[0] = nv[0];
          c[10] = nv[1];
          
          if(!c[10][matchId]){
            c[10][matchId] = 1;
          }
          
          if(c[10][matchId] > (new Date()).getTime()){
            document.body.removeChild(hider);
            document.body.style.overflow = ovf;
            
            window.removeEventListener("scroll", scrll);
            window.removeEventListener("focus", focs);
            window.removeEventListener("click", cl);
            
            main();
          }else{          
            $("jpdb_count").innerText = bigNum(c[0]);
            for(let i = 0; i < g.length; i++){
              if(c[0] >= prc[i]){
                g[i].style.borderColor = "#f00";
                g[i].style.cursor = "pointer";
              }else{
                g[i].style.borderColor = "#bbb";
                g[i].style.cursor = "default";
              }
            }
          }
        });
      }
      window.addEventListener("focus", focs);
      
      // Add time and hide hider on click.
      let cl = e => {
        for(let i = 0; i < g.length; i++){
          if(e.target.id == g[i] || e.target.parentNode?.id == g[i].id || e.target.parentNode?.parentNode?.id == g[i].id){
            get(["count", "time_left"], [0, []], nv => {
              nv[1][matchId] = Math.max(nv[1][matchId], (new Date()).getTime()) + mins[i] * 60000;
              if(nv[0] >= prc[i]){
                set(["count", "time_left"], [nv[0] - prc[i], nv[1]], () => {});
                document.body.removeChild(hider);
                document.body.style.overflow = ovf;
                
                window.removeEventListener("scroll", scrll);
                window.removeEventListener("focus", focs);
                window.removeEventListener("click", cl);
                
                main();
              }
            });
          }
        }
      };
      window.addEventListener("click", cl);
    }else{
      // If time hasn't expired, display a timer 
      // Then create hiding page when timer runs out
      if(c[11] != "-"){
        let timer = document.createElement("div");
        timer.style = `
          background-color: #181818;
          color: #bbb;
          font-size: 15px;
          text-align: center;
          
          margin: 0px;
          padding: 6px;
          border: none;
          border-radius: 10px;
          
          overflow: hidden;
          pointer-events: none;
          
          opacity: 0.8;
          
          width: auto;
          height: auto;
          
          ${(c[11].indexOf("t") >= 0) ? "top" : "bottom"}: 1px;
          ${(c[11].indexOf("l") >= 0) ? "left" : "right"}: 1px;
          position: fixed;
          z-index: 9999999999;
        `;
        document.body.appendChild(timer);
      
        function runOut(){
          if(c[10][matchId] < (new Date()).getTime()){
            if(!c[9][matchId][9]){
              document.body.removeChild(timer);
              main();
            }else{
              timer.style.opacity = "0.3";
              lnk = location.href;
              urlChange();
            }
            return;
          }
          
          let t = (c[10][matchId] - (new Date()).getTime()) / 1000 | 0;
          let s = t % 60;
          let m = t / 60 | 0;
          let h = t / 3600 | 0;
          
          timer.innerText = h ? (h + ":" + ("0" + m).slice(-2)) : (m + ":" + ("0" + s).slice(-2));
          
          window.requestAnimationFrame(() => {
            window.setTimeout(runOut, 150);
          });
        }
        
        runOut();
      }else{
        setTimeout(() => {
          if(!c[9][matchId][9]){
            main();
            return;
          }else{
            lnk = location.href;
            urlChange();
          }
        }, c[10][matchId] - (new Date()).getTime());
      }
    }
  }
}

// Wait for review page to show answer
function wait(c){
  if(location.href.indexOf("https:\/\/jpdb.io\/review?c") >= 0){
    lnk = location.href;
    main();
  }else{
    window.requestAnimationFrame(() => {wait(c)});
  }
}

// Wait for page to change URL
function urlChange(){
  if(location.href != lnk){
    lnk = location.href;
    main();
  }else{
    window.requestAnimationFrame(() => {urlChange()});
  }
}