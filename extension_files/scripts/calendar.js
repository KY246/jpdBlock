// Using chrome instead of browser breaks on Firefox for some reason
if(!window.browser){
  window.browser = chrome;
}

const $ = _ => document.getElementById(_);

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
      if(result[key[i]] === undefined || result[key[i]] === null){
        result[key[i]] = value[i];
        set(key[i], value[i]);
      }
      res.push(result[key[i]]);
    }
    after(res);
  });
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

let get_list = [
  "events"
];

const cal = $("calendar");
const mon = $("now");

// https://bobbyhadz.com/blog/javascript-get-number-of-days-in-month
const getDays = (month, year) => new Date(year, month + 1, 0).getDate();
const getStart = (month, year) => new Date(year, month, 1).getDay();

let today = new Date();
let month = +(location.search.split('&')[0]?.split('=')[1] ?? today.getMonth());
let year = +(location.search.split('&')[1]?.split('=')[1] ?? today.getFullYear());

let _;

const setCalendar = () => {
  let numInMonth = getDays(month, year);
  let startDay = getStart(month, year);
  
  mon.innerHTML = `
    <span class="btn">&lt;</span>
    ${toKanji(month + 1, 0)}月 (${year})
    <span class="btn">&gt;</span>`;
  
  cal.innerHTML = "";
  
  for(let i = 0; i < 7; i++){
    cal.innerHTML += `<div class="head">${"日月火水木金土"[i]}</div>`;
  }
  for(let i = 0; i < startDay; i++){
    cal.innerHTML += `<div class="grey">/</div>`;
  }
  
  for(let i = 0; i < numInMonth; i++){
    let arr = [];
    loop_j: for(let j = 0; j < _[0].length; j++){
      if(_[0][j].day != i || _[0][j].month != month || _[0][j].year != year){
        if(_[0][j].repeat == 1){
        }else if(_[0][j].repeat == 2){
          let dow = new Date(_[0][j].year, _[0][j].month, _[0][j].day + 1).getDay();
          let cdow = (startDay + i) % 7;
          if(dow != cdow){
            continue loop_j;
          }
        }else if(_[0][j].repeat == 3){
          if(_[0][j].day != i){
            continue loop_j;
          }
        }else{
          continue loop_j;
        }
      }
      arr.push([`<div data-index="${j}" class="event" style="border-color: ${_[0][j].color}55; color: ${_[0][j].color};">
        ${_[0][j].title}
        <span style="border-color: ${_[0][j].color};">${_[0][j].time}:${("0" + _[0][j].min).slice(-2)}</span>
      </div>`, (+_[0][j].time) + (_[0][j].min / 60)]);
    }
    cal.innerHTML += `<div>
      <span style="margin-left: 7px;">${i + 1}</span>
      <span class="btn" style="float: right; margin-right: 5px; display: inline-block; color: #fff; border: 1px solid #999;">+</span>
      <br style="clear: both;"/>
      ${arr.sort((a, b) => a[1] - b[1]).map(_ => _[0]).join("")}
    </div>`;
  }
  for(let i = (numInMonth + startDay) % 7; i < 7 && i > 0; i++){
    cal.innerHTML += `<div class="grey">/</div>`;
  }
};

get(get_list, [[]], c => {
  _ = c;
  
  console.log(_);
  
  setCalendar(_);
});

window.addEventListener("pointerup", e => {
  if(e.target.className == "btn"){
    if(e.target.innerText == "<"){
      month --;
      if(month < 0){
        year --;
        month += 12;
      }
      setCalendar();
    }else if(e.target.innerText == ">"){
      month ++;
      if(month > 11){
        year ++;
        month -= 12;
      }
      setCalendar();
    }else if(e.target.innerText == "+"){
      $("set").style.top = "10vh";
      $("blur").style.filter = "blur(5px)";
      $("blur").style.webkitFilter = "blur(5px)";
      $("day").value = +e.target.parentNode.innerText.split(/\s/g)[0];
      $("month").value = month;
      $("year").value = year;
      
      $("name").value = "Event #" + (_[0].length + 1);
      
      $("set").dataset.index = _[0].length;
    }else if(e.target.innerText == "X"){
      $("set").style.top = "110vh";
      $("blur").style.filter = "none";
      $("blur").style.webkitFilter = "none";
    }else if(e.target.innerText == "Save"){
      let ev = {};
      ev.title = $("name").value;
      ev.day = $("day").value - 1;
      ev.month = $("month").value;
      ev.year = $("year").value;
      ev.time = $("time").value;
      ev.min = $("min").value;
      ev.lenhr = Math.min($("lenhr").value, 23);
      ev.lenmi = Math.min($("lenmi").value, 59);
      ev.repeat = $("repeat").checked * $("repeat_amount").value;
      ev.reward = $("reward").checked * $("reward_points").value;
      //ev.punish = $("punish").checked * $("punish_points").value;
      ev.color = $("color").value;
      
      let index = $("set").dataset.index;
      
      if(ev.title.replace(/\s/g, "") != ""){
        _[0][index] = ev;
      }else{
        _[0].splice(index, 1);
      }
      
      let write = {};
      for(let i = 0; i < get_list.length; i++){
        write[get_list[i]] = _[i];
      }
      
      browser.storage.local.set(write, _ => {
        location.href = location.href.split("?")[0] + `?month=${month}&year=${year}`;
      });
    }
  }else if(e.target.className == "event" || e.target.parentNode?.className == "event"){
    let index = _[0].length;
    if(e.target.className == "event"){
      index = e.target.dataset.index;
    }else{
      index = e.target.parentNode.dataset.index;
    }
    
    $("set").style.top = "10vh";
    $("blur").style.filter = "blur(5px)";
    $("blur").style.webkitFilter = "blur(5px)";
    
    $("name").value = _[0][index].title;
    $("day").value = +_[0][index].day + 1;
    $("month").value = _[0][index].month;
    $("year").value = _[0][index].year;
    $("time").value = _[0][index].time;
    $("min").value = _[0][index].min;
    $("lenhr").value = _[0][index].lenhr;
    $("lenmi").value = _[0][index].lenmi;
    $("repeat").checked = _[0][index].repeat > 0;
    $("repeat_amount").value = _[0][index].repeat > 0 ? _[0][index].repeat : 1;
    $("reward").checked = _[0][index].reward > 0;
    $("reward_points").value = _[0][index].reward;
    //$("punish").checked = _[0][index].punish > 0;
    //$("punish_points").value = _[0][index].punish;
    $("color").value = _[0][index].color;
    $("color").style.color = _[0][index].color;
    
    $("set").dataset.index = index;
  }
});

let time_away;
document.addEventListener("visibilitychange", e => {
  if(document.visibilityState == "visible") {
    let dif = new Date() - time_away;
    
    if(dif > 5 * 60 * 1000 || $("set").style.top != "10vh"){
      location.reload();
    }
  }else{
    time_away = new Date();
  }
});

$("name").addEventListener("focus", e => {
  event.target.setSelectionRange(0, event.target.value.length)
});
$("color").addEventListener("input", e => {
  event.target.style.color = event.target.value;
});
