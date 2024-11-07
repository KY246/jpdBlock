// Using chrome instead of browser breaks on Firefox for some reason
if(!window.browser){
  window.browser = chrome;
}

const $ = _ => document.getElementById(_);

const day = (offset = 0) => Math.floor((new Date().getTime()) / 8.64e7 - (new Date()).getTimezoneOffset() / 1440 - offset / 24);
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
  "time_offset",    // 9
  "finished",       // 10
  "events"          // 11
];

get(getList, [0, null, true, 3, day(), 0, 25, 0, 10, 0, false, []], c => {
  if(c[4] < day(c[9])){
    if(+c[5] >= +c[6] || c[10]){
      c[4] ++;
    }
    let today = day(c[9]);
    
    for(let i = c[4]; i < today; i++){
      console.log(i);
      c[0] -= c[7];
      c[0] -= c[0] * c[8] / 100;
    }
    c[0] = Math.max(c[0], 0) | 0;
    c[5] = 0;
    
    set(["count", "last_day", "done_today", "new_today", "finished"], [c[0], day(c[9]), 0, 0, false], () => {});
  }
  
  $("count").innerText = bigNum(c[0]);
  $("today").innerText = c[10] ? c[5] : (c[5] + "/" + c[6]);
  if(c[10] || (+c[5] >= +c[6])){
    $("today").style.color = "#99ff99";
  }else{
    $("today").style.color = "#ff9999";
  }
  
  
  let ev = c[11];
  let arr = [];
  
  console.log(ev);
  
  let todayE = new Date();
  let todayReal = new Date();
  let dayE = todayE.getDate();
  let monthE = todayE.getMonth();
  let yearE = todayE.getFullYear();
  
  for(let j = 0; j < 2; j++){
    loop_i: for(let i = 0; i < ev.length; i++){
      if(ev[i].day + 1 != dayE || ev[i].month != monthE || ev[i].year != yearE){
        if(ev[i].repeat == 1){
        }else if(ev[i].repeat == 2){
          let dow = new Date(ev[i].year, ev[i].month, ev[i].day + 1).getDay();
          let cdow = todayE.getDay();
          if(dow != cdow){
            continue loop_i;
          }
        }else if(ev[i].repeat == 3){
          if(ev[i].day + 1 != dayE){
            continue loop_i;
          }
        }else{
          continue loop_i;
        }
      }
      
      let endMin = +ev[i].min + (+ev[i].lenmi);
      let endTime = (+ev[i].time + (endMin / 60 | 0) + (+ev[i].lenhr)) % 24;
      
      let dayOf = new Date(yearE, monthE, dayE, ev[i].time, ev[i].min);
      let dayEnd = new Date(dayOf.getTime() + 60000 * (60 * ev[i].lenhr + ev[i].lenmi));
      
      if(todayReal.getTime() < dayOf.getTime() || todayReal.getTime() > dayEnd.getTime() || ev[i].latest == todayE.getDate()){
        continue loop_i;
      }
      
      arr.push([`<div data-index="${i}" data-day="${todayE.getDate()}" class="event" style="border-color: ${ev[i].color}55; color: ${ev[i].color};">
        <span style="border-color: ${ev[i].color};">${ev[i].time}:${("0" + ev[i].min).slice(-2)} - ${endTime}:${("0" + endMin % 60).slice(-2)}</span>
        ${ev[i].title}
        <span style="border-color: ${ev[i].color}; float: right; min-width: 30px; cursor: pointer;" class="conf">✓</span>
      </div>`, dayOf.getTime()]);
    }
    
    todayE.setDate(dayE - 1);
    dayE = todayE.getDate();
    monthE = todayE.getMonth();
    yearE = todayE.getFullYear();
  }
  
  browser.browserAction.setBadgeText({text: arr.length == 0 ? "" : ("" + arr.length)});
  browser.browserAction.setBadgeBackgroundColor({ color: "#801020"});
  
  $("container").innerHTML += arr.sort((a, b) => a[1] - b[1]).map(_ => _[0]).join("");
  
  window.addEventListener("pointerup", e => {
    if(e.target.className == "conf"){
      let reward = +ev[e.target.parentNode.dataset.index].reward;
      ev[e.target.parentNode.dataset.index].latest = e.target.parentNode.dataset.day;
      
      if(ev[e.target.parentNode.dataset.index].repeat == 0){
        ev.splice(e.target.parentNode.dataset.index, 1);
      }
      
      get("count", 0, val => {
        set(["events", "count"], [ev, val[0] + reward], () => {
          location.reload();
        });
      });
    }
  });
});

$("settings").onclick = e => {
  browser.tabs.create({ url: browser.runtime.getURL("settings.html") });
}
$("calendar").onclick = e => {
  browser.tabs.create({ url: browser.runtime.getURL("calendar.html") });
}
