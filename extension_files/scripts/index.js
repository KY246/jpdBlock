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
  
  chrome.storage.local.set(info).then(() => {
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
  chrome.storage.local.get(key).then(result => {
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
  "count",
  "last_studied",
  "kanji_readings",
  "vocab_amount",
  "last_day",
  "done_today",
  "min",
  "punish_points",
  "punish_percent",
  "time_offset",
  "finished"
];

get(getList, [0, null, true, 3, day(), 0, 25, 0, 10, 0, false], c => {
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
});

$("settings").onclick = e => {
  chrome.tabs.create({ url: chrome.runtime.getURL("settings.html") });
}