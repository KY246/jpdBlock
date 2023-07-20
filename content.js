let lnk = location.href;

const day = () => Math.floor((new Date().getTime()) / 8.64e7 - (new Date()).getTimezoneOffset() / 1440);

const favicon = (u = lnk, s = 64) => {
  const url = new URL(chrome.runtime.getURL("/_favicon/"));
  url.searchParams.set("pageUrl", u);
  url.searchParams.set("size", s);
  return url.toString();
}

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

chrome.storage.onChanged.addListener((changes, namespace) => {
  for (let [key, { oldValue, newValue }] of Object.entries(changes)) {
    console.log(
      `Storage key "${key}" in namespace "${namespace}" changed.`,
      `Old value was "${oldValue}", new value is "${newValue}".`
    );
  }
});

const $ = id => document.getElementById(id);

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
  "sites",
  "time_left",
  "loc"
];

const main = () => {
  get(getList, [0, null, true, 3, day(), 0, 25, 0, 10, [], [], "lt"], run);
}

main();

function run(c){
  console.log(c);
  
  if(c[4] < day()){
    if(+c[5] >= +c[6] || c[5] == "-"){
      c[4] ++;
    }
    
    let today = day();
    
    for(let i = c[4]; i < today; i++){
      c[0] -= c[7];
      c[0] -= c[0] * c[8] / 100;
    }
    
    c[0] = Math.max(c[0], 0) | 0;
    
    set(["count", "last_day", "done_today", "new_today"], [c[0], day(), 0, 0], () => {});
  }
  
  if(lnk.indexOf("https:\/\/jpdb.io\/review?c") >= 0){
    if(c[1] != lnk.slice(25)){
      let g = [$("grade-1"), $("grade-2"), $("grade-3"), $("grade-4"), $("grade-5")];
      for(let i = 0; i < g.length; i++){
        g[i].parentNode.onsubmit = e => {
          e.preventDefault();
          
          get(["count", i < 2 ? "wrong_points" : "right_points", "done_today"], [0, i < 2 ? 1 : 2, 0], _ => {
            if(document.getElementsByClassName("nav-item")[0].childNodes[1].style.color != "red"){
              _[2] = "-";
            }
            
            set(["count", "last_studied", "done_today"], [Math.max((+_[0]) + (+_[1]), 0), lnk.slice(25), (_[2] == "-") ? _[2] : (_[2] + 1)], () => {
              g[i].parentNode.submit();
            });
          });
        };
        // g[i].style.display = "none";
      }
    }
  }else if(lnk.indexOf("https:\/\/jpdb.io\/review") >= 0){
    if($("grade-p")){
      let g = [$("grade-p"), $("grade-f")];
      for(let i = 0; i < g.length; i++){
        g[i].parentNode.onsubmit = e => {
          e.preventDefault();
          
          get(["count", "new_points", "done_today", "new_today", "new_card_stop", "new_card_limit"], [0, i < 2 ? 1 : 2, 0, 0, true, 10], _ => {
            console.log(_);
            
            if(document.getElementsByClassName("nav-item")[0].childNodes[1].style.color != "red"){
              _[2] = "-";
            }
            
            if(_[4] && _[3] >= _[5]){
              g[i].parentNode.submit();
              return;
            }
            
            set(["count", "last_studied", "done_today", "new_today"], [Math.max((+_[0]) + (+_[1]), 0), lnk.slice(25), (_[2] == "-") ? _[2] : (_[2] + 1), _[3] + 1], () => {
              g[i].parentNode.submit();
            });
          });
        };
        // g[i].style.display = "none";
      }
    }else if(document.getElementsByClassName("kind")[0]?.innerText == "Kanji"){
      let kanji = document.getElementById("show-answer").parentNode.childNodes[0].value.split(",")[1];
      
      if(c[2] || c[3]){
        fetch(`https://jpdb.io/kanji/${kanji}?expand=v`, {cache: "force-cache"}).then(_ => _.text()).then(html => {
          //https://stackoverflow.com/questions/36631762/returning-html-with-fetch
          let parser = new DOMParser();
        
          var doc = parser.parseFromString(html, "text/html");
          
          let exs = [...doc.getElementsByClassName("used-in")];
          
          for(let i = 0; i < exs.length; i++){
            if(exs[i].childNodes[0].className == "spelling"){
              exs.splice(i--, 1);
            }else{
              break;
            }
          }

          let sel = [];
          if(c[3]){
            sel = [0, 1, 2];
            if(exs.length <= c[3]){
              sel = sel.slice(0, exs.length);
            }else if(exs.length < 10){
              let r = Math.random() * exs.length | 0;
              sel = [r, (r + 1) % exs.length, (r + 2) % exs.length];
            }else{
              for(let i = 0; i < c[3]; i++){
                let r = Math.random() * exs.length | 0;
            
                for(let j = 0; j < i; j++){
                  if(sel[j] == r){
                    i --;
                    continue;
                  }
                }
                
                sel[i] = r;
              }
            }
            sel = sel.slice(0, c[3]);
          }
        
          let str = "<div style=\"width: 70vw; position: fixed; left: 15vw;\">";
          
          if(c[2]){
            let read = doc.getElementsByClassName("kanji-reading-list-common")[0].innerText.split(/\(\d+\%\)/g).slice(0, -1).join("、 ");
            
            str += `<span class="jp" style="font-size: 1.4em; text-align: center; width: 100%; display: block;">` + read + "</span><br/>";
          }
          for(let i = 0; i < sel.length; i++){
            sel[i] = exs[sel[i]];
            let ex = sel[i];
        
            sel[i].childNodes[0].style.fontSize = "1.4em";
            
            str += ex.innerHTML.replace(/<[a|s].*?>/g, "").replace(/<\/[a|s].*?>/, "").replace(new RegExp(kanji, "g"), "〇") + "<br/>";
          }
        
          document.getElementsByClassName("bugfix")[0].innerHTML += str + "</div>";
        });
      }
    }
    wait(c);
  }else if(location.href.indexOf("jpdb.io") == -1){
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
    if(matchId == -1){
      return;
    }
    
    if(!c[10][matchId]){
      c[10][matchId] = 1;
    }
    if(c[10][matchId] < (new Date()).getTime()){
      document.querySelectorAll('.html5-main-video').forEach(vid => vid.pause());
      
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
      let prc = [c[9][matchId][4], c[9][matchId][6], c[9][matchId][8]];
      let mins = [c[9][matchId][3], c[9][matchId][5], c[9][matchId][7]];
      hider.innerHTML = `
        <div style="background: none; color: #bbb; font-size: min(6vh, 6vw); text-align: center; margin: 0px; padding: 30px; padding-top: 20px; border: 1px solid #f00; border-radius: 10px; display: inline-block; box-shadow: none; width: auto;">
          <img style="height: min(10vh, 10vw); vertical-align:middle; filter:blur(1px);" src="${favicon()}"/>
          <span style="line-height: 6vh; vertical-align:middle">${lnk.split("/")[2]}</span>
        </div>
        <br/><br/>
        <div style="background: none; color: #2b6ddf; font-size: 5vh; text-align: center; margin: 0px; padding: 30px; padding-top: 5px; padding-bottom: 5px; border: 1px solid #2b6ddf; border-radius: 10px; display: inline-block; box-shadow: none; width: auto;">
          <span style="font-size: min(3vh, 3vw);"><b>現在</b></span>
          <span id="jpdb_count" style="font-size: min(8vh, wvw); display: block;">${c[0]}</span>
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
      
      let ovf = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      
      document.body.appendChild(hider);
      
      let g = [$("jpdb_buy_0"), $("jpdb_buy_1"), $("jpdb_buy_2")];
      
      let scrll = e => {
        if($("jpdb_hider")){
          document.body.style.overflow = "hidden";
        }
      };
      window.addEventListener("scroll", scrll);
      let focs = e => {
        get(["count"], [0], nv => {
          c[0] = nv[0];
          $("jpdb_count").innerText = c[0];
          for(let i = 0; i < g.length; i++){
            if(c[0] >= prc[i]){
              g[i].style.borderColor = "#f00";
              g[i].style.cursor = "pointer";
            }else{
              g[i].style.borderColor = "#bbb";
              g[i].style.cursor = "default";
            }
          }
        });
      }
      window.addEventListener("focus", focs);
      
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
            document.body.removeChild(timer);
            main();
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
        setTimeout(() => {
          main();
          return;
        }, c[10][matchId] - (new Date()).getTime())
      }
    }
  }
}

function wait(c){
  if(location.href.indexOf("https:\/\/jpdb.io\/review?c") >= 0){
    lnk = location.href;
    main();
  }else{
    window.requestAnimationFrame(() => {wait(c)});
  }
}