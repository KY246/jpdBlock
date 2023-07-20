const $ = _ => document.getElementById(_);

const day = () => Math.floor((new Date().getTime()) / 8.64e7 - (new Date()).getTimezoneOffset() / 1440);

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
  "punish_percent"
];

get(getList, [0, null, true, 3, day(), 0, 25, 0, 10], c => {
  if(c[4] < day()){
    if(+c[5] >= +c[6] || c[5] == "-"){
      c[4] ++;
    }
    let today = day();
    
    for(let i = c[4]; i < today; i++){
      console.log(i);
      c[0] -= c[7];
      c[0] -= c[0] * c[8] / 100;
    }
    c[0] = Math.max(c[0], 0) | 0;
    c[5] = 0;
    
    set(["count", "last_day", "done_today", "new_today"], [c[0], day(), 0, 0], () => {});
  }
  
  $("count").innerText = c[0];
  $("today").innerText = c[5] == "-" ? "☺" : (c[5] + "/" + c[6]);
});

$("settings").onclick = e => {
  chrome.tabs.create({ url: chrome.runtime.getURL("settings.html") });
}
