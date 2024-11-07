// Using chrome instead of browser breaks on Firefox for some reason
var browser = browser ?? chrome;
/*
browser.tabs.onActivated.addListener(activeInfo => {
  browser.tabs.get(activeInfo.tabId, tab => {
    if((tab.url+"").match(/youtube.com\/watch\?v=/g)){
      browser.tabs.update(tab.id, {url: "https://www.youtube.com/embed/" + tab.url.split("=")[1].split("&")[0]});
    }
  });
});
browser.tabs.onUpdated.addListener(tabId => {
  browser.tabs.get(tabId, tab => {
    if((tab.url+"").match(/youtube.com\/watch\?v=/g)){
      browser.tabs.update(tab.id, {url: "https://www.youtube.com/embed/" + tab.url.split("=")[1].split("&")[0]});
    }
  });
});
*/
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
};


browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.fetch){
    fetch(request.fetch).then(_ => _.text()).then(_ => {
      sendResponse({response: _});
    });
    return true;
  }
});


browser.runtime.onInstalled.addListener(() => {
  browser.contextMenus.create({
    id: "0",
    title: "Search %s on jpdb.io",
    contexts:["selection"]
  });
});


browser.contextMenus.onClicked.addListener(
  function(info, tab) {
    browser.windows.create({
      'url': "https://jpdb.io/search?q=" + info.selectionText,
      height: 600,
      width: 550,
      left: 0,
      top: 0,
      type: "popup"
    }, function(win) {});
    /*fetch("https://jpdb.io/search?q=" + info.selectionText)
    .then(_ => _.text())
    .then(_ => {
      console.log(_)
    });*/
  }
)

const DELAY = 1;
browser.runtime.onInstalled.addListener(() => {
  chrome.alarms.clearAll();
  browser.alarms.create('alarm', {
    delayInMinutes: DELAY,
    periodInMinutes: DELAY
  });
});

const run = () => {
  get(["events"], [[]], _ => {
    let ev = _[0];
    
    let arr = 0;
    
    let todayE = new Date();
    let todayReal = new Date();
    let dayE = todayE.getDate();
    let monthE = todayE.getMonth();
    let yearE = todayE.getFullYear();
    
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
      
      let ago = new Date(todayReal.getTime() - DELAY * 60000);
      
      if(ago.getTime() < dayOf.getTime()){
        browser.notifications.create({
          type: "basic",
          iconUrl: "../icon.png",
          title: ev[i].title,
          message: "Event"
        }, () => {});
      }
      
      arr ++;
      
      todayE.setDate(dayE - 1);
      dayE = todayE.getDate();
      monthE = todayE.getMonth();
      yearE = todayE.getFullYear();
    }
    
    browser.action.setBadgeText({text: arr == 0 ? "" : ("" + arr)});
    browser.action.setBadgeBackgroundColor({ color: "#801020"});
  });
}

run();

browser.alarms.onAlarm.addListener(run);



