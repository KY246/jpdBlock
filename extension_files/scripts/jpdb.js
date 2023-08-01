// Using chrome instead of browser breaks on Firefox for some reason
if(!window.browser){
  window.browser = chrome;
}


// Set finished to true if the font color for the review color isn't red (there are no due reviews)
// And there aren't any extra reviews.
// Only run this function once per page load
// Also fetch a no-cache version of the main page to see if reviews are really 0 (without this, finished is set to 0 if the page is loaded from the cache from the day before)
let times = 0;
const jpdb = c => {
  if(times == 0){
    times ++;
    
    let rev = document.getElementsByClassName("nav-item")[0].childNodes[1];

    if(rev.style.color != "red" && c[13].length < 2 && !c[16]){
      fetch(`https://jpdb.io/`, {cache: "no-cache"}).then(_ => _.text()).then(html => {
        let parser = new DOMParser();
              
        var doc = parser.parseFromString(html, "text/html");
        
        if(doc.getElementsByClassName("nav-item")[0].childNodes[1].style.color != "red"){
          set("finished", true, () => {});
        }
      });
    }
  }
};

// Script to give points on grading
const grade = c => {
  if(c[1] != lnk.slice(25)){
    let g = [$("grade-1"), $("grade-2"), $("grade-3"), $("grade-4"), $("grade-5")];
    let cutoff = 2;
    if(!g[0]){
      g = [$("grade-p"), $("grade-f")];
      cutoff = 1;
    }
    for(let i = 0; i < g.length; i++){
      g[i].parentNode.onsubmit = e => {
        e.preventDefault();
        
        get(["count", i < cutoff ? "wrong_points" : "right_points", "done_today", "extra_study"], [0, i < cutoff ? 1 : 2, 0, []], _ => {
          let keys = ["count", "last_studied", "done_today"];
          let values = [
            Math.max((+_[0]) + (+_[1]), 0),
            lnk.slice(25), 
            _[2] + 1
          ];
          
          if(c[15] && lnk.indexOf("c=v") >= 0){
            let ans = decodeURI(document.getElementsByClassName("answer-box")[0].childNodes[0].childNodes[2].href).split(/[\#\/]/g).slice(4, 6).join("|");
            
            if(/[一-龯々]/g.test(ans)){
              let num = i < cutoff ? 1.5 : 1;
              if(_[3].indexOf(ans) >= 0){
                num = Math.max(num, _[3][_[3].indexOf(ans) + 1]);
                _[3].splice(_[3].indexOf(ans), 2);
              }
              _[3].push(ans, num);
              
              keys.push("extra_study");
              values.push(_[3]);
            }
          }
          
          set(keys, values, () => {
            g[i].parentNode.submit();
          });
        });
      };
      // g[i].style.display = "none";
    }
  }
};





// Grade new cards
const gradeNew = c => {
  let g = [$("grade-p"), $("grade-f")];
  for(let i = 0; i < g.length; i++){
    g[i].parentNode.onsubmit = e => {
      e.preventDefault();
      
      get(["count", "new_points", "done_today", "new_today", "new_card_stop", "new_card_limit", "new_after"], [0, i < 2 ? 1 : 2, 0, 0, true, 15, -10], _ => {
        if(_[4] && _[3] >= _[5]){
          set(["count", "last_studied", "done_today", "new_today"], [Math.max((+_[0]) + (+_[6]), 0), lnk.slice(25), _[2] + 1, _[3] + 1], () => {
            g[i].parentNode.submit();
          });
        }else{
          set(["count", "last_studied", "done_today", "new_today"], [Math.max((+_[0]) + (+_[1]), 0), lnk.slice(25), _[2] + 1, _[3] + 1], () => {
            g[i].parentNode.submit();
          });
        }
      });
    };
    // g[i].style.display = "none";
  }
};




// Add Extra option to nav bar
const addExtraMenu = num => {
  if($("EXTRA")){
    $("EXTRA").innerHTML = `
      Extra (<span style="color: orange">${num}</span>)
    `;
    return;
  }
  
  let nav_i = document.getElementsByClassName("nav-item")[1];
  let nav = nav_i.parentNode;

  let a = document.createElement("a");
  a.href = "/review#e";
  a.className = "nav-item";
  a.id = "EXTRA";
  a.innerHTML = `
    Extra (<span style="color: orange">${num}</span>)
  `;

  nav.insertBefore(a, nav_i);
};

// Create Extra reviews
// Load data through fetch request to vocab page with example sentences expanded
const extra = c => {
  if(c[13].length < 2){
    window.location.replace("https://jpdb.io/learn");
    return;
  }
  
  let studyL = c[13];
  let index = 2 * (Math.random() * Math.min(studyL.length / 2, 5) | 0);
  
  let vocab = studyL[index].split("|");

  fetch(`https://jpdb.io/vocabulary/${vocab[0]}/${vocab[1]}?expand=e`, {cache: "force-cache"}).then(_ => _.text()).then(html => {
    document.title = "Extra Reviews";
    
    let parser = new DOMParser();
          
    var doc = parser.parseFromString(html, "text/html");

    let hl = [...doc.getElementsByClassName("highlight")];
    for(let i = 0; i < hl.length; i++){
      hl[i].innerHTML = hl[i].innerHTML.replace(/[一-龯々]/g, "◯");
      hl[i].className = "";
      hl[i].style.textDecoration = "underline";
    }
    
    let exs = [...doc.getElementsByClassName("used-in")];
            
    for(let i = 0; i < exs.length; i++){
      if(exs[i].childNodes[0].className == "spelling"){
        exs.splice(i--, 1);
      }else{
        break;
      }
    }

    let nav = document.getElementsByClassName("nav")[0];
    
    nav.classList.add("minimal");

    let nav_i = document.getElementsByClassName("nav-item")[0];
    let menu = document.getElementsByClassName("menu")[0];
    
    nav_i.parentNode.removeChild(nav_i);
    menu.prepend(nav_i);
    
    let con = document.getElementsByClassName("container")[0];
    let pit = doc.getElementsByClassName("subsection-pitch-accent")[0]?.childNodes[1].childNodes[0];
    if(pit){
      pit.style.justifyContent = "center";
      pit.style.flexDirection = "row";
      [...pit.childNodes].forEach(_ => {
        _.style.justifyContent = "center";
        _.style.paddingLeft = "5vw";
        _.style.paddingRight = "5vw";
      });
      pit.style.fontSize = "30px";
      pit.style.marginTop = "15px";
    }
    let phtml = pit ? pit.outerHTML.replace(/<a.*?<\/a>/g, "") : "";

    let reading = doc.getElementsByClassName("v")[0];
    reading.className = "";
    reading.style.textAlign = "center";
    reading.style.fontSize = "30px";
    reading.style.margin = "10px";
    reading.style.marginBottom = "20px";

    let sel = [0, 1, 2];
    if(exs.length <= 3){
      sel = sel.slice(0, exs.length);
    }else if(exs.length < 10){
      let r = Math.random() * exs.length | 0;
      sel = [r, (r + 1) % exs.length, (r + 2) % exs.length];
    }else{
      for(let i = 0; i < 3; i++){
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
    sel = sel.slice(0, 3);

    let str = "<div style=\"width: 42.5vw; position: fixed; left: 5vw;\">";
    
    for(let i = 0; i < sel.length; i++){
      sel[i] = exs[sel[i]];
      let ex = sel[i];

      sel[i].childNodes[0].style.fontSize = "1.4em";
      
      str += ex.innerHTML.replace(/<[a|s].*?>/g, "").replace(/<\/[a|s].*?>/, "") + "<br/>";
    }

    let mean = doc.getElementsByClassName("subsection-meanings")[0].childNodes[1];
    mean.style.width = "42.5vw";
    mean.style.left = "52.5vw";
    mean.style.position = "fixed";
    
    con.innerHTML = `
      <div class="container" style="display: flex; flex-direction: column; align-items: center;">
        <div class="review-button-group">
          <div class="main-row" style="max-width: 17rem;">
            <div class="main column">
              <div class="row row-1">
                <form style="margin-bottom: 0px;" id="extra-submit">
                  <input id="show-answer" type="submit" value="Show answer" class="outline" autofocus="" data-virtual="" data-preload="">
                </form>
              </div>
            </div>
          </div>
        </div>
        <div class="review-hidden">
          <div class="answer-box" style="margin-bottom: 0px;">
            <div class="kind">Extra</div>
            ${phtml}
            ${reading.outerHTML.replace(/[一-龯々]/g, "◯")}
          </div>
        </div>
      </div>
      ${str}</div>
      ${mean.outerHTML.replace(/[一-龯々]/g, "◯")}
    `;

    let _button = $("extra-submit");
    _button.addEventListener("submit", e => {
      e.preventDefault();
      
      extraAnswer(c, vocab, doc, phtml, reading);
    });
    if(document.getElementsByClassName("footer").length){
      document.body.removeChild(document.getElementsByClassName("footer")[0]);
      document.body.removeChild(document.getElementsByClassName("bottom")[0]);
    }
  });
};
// Display answer for extra reviews
const extraAnswer = (c, vocab, doc, phtml, reading) => {
  let con = document.getElementsByClassName("container")[0];
  
  reading.style.margin = "55px";
  reading.style.fontSize = "75px";
  
  con.innerHTML = `
    <div class="container" style="display: flex; flex-direction: column; align-items: center;">
      <div class="review-button-group">
        <div class="main-row">
          <div class="main column">
            <div class="row row-2">
              <form action="/review#a" method="post" class="extra-s">
                <input type="submit" class="outline v1" value="✘ Nothing">
              </form>
              <form action="/review#a" method="post" class="extra-s">
                <input type="submit" class="outline v1" value="✘ Something">
              </form>
            </div>
            <div class="row row-3">
              <form action="/review#a" method="post" class="extra-s">
                <input type="submit" class="outline v3" value="✔ Hard">
              </form>
              <form action="/review#a" method="post" class="extra-s">
                <input type="submit" class="outline v4" value="✔ Okay">
              </form>
              <form action="/review#a" method="post" class="extra-s">
                <input type="submit" class="outline" value="✔ Easy">
              </form>
            </div>
          </div>
        </div>
      </div>
      <div class="review-hidden">
        <div class="answer-box" style="margin-bottom: 0px;">
          <br/>
          ${phtml}
          ${reading.outerHTML}
        </div>
      </div>
    </div>
  `;
  
  let g = document.getElementsByClassName("extra-s");
  g[3].childNodes[1].focus();
  
  for(let i = 0; i < g.length; i++){
    g[i].addEventListener("submit", e => {
      e.preventDefault();
      
      get(["count", i < 2 ? "wrong_extra" : "right_extra", "done_today", "extra_study"], [0, i < 2 ? -1 : 3, 0, []], _ => {
        let keys = ["count", "last_studied", "done_today"];
        let values = [
          Math.max((+_[0]) + (+_[1]), 0),
          lnk.slice(25), 
          _[2] + 1
        ];
        
        let ans = vocab.join("|");
        
        let num = [0.5, 0.2, -0.7, -1, -1.3][i];
        if(_[3].indexOf(ans) >= 0){
          num += _[3][_[3].indexOf(ans) + 1];
          _[3].splice(_[3].indexOf(ans), 2);
        }
        if((num | 0) > 0){
          num = Math.min(num, 3);
          _[3].push(ans, num);
        }
        
        keys.push("extra_study");
        values.push(_[3]);
        
        set(keys, values, () => {
          main();
        });
      });
    });
  }
};





// Inject readings and example vocab onto front of kanji page
const kanji = c => {
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
        
        if(!c[12]){
          str += ex.innerHTML.replace(/<[a|s].*?>/g, "").replace(/<\/[a|s].*?>/, "").replace(new RegExp(kanji, "g"), "○") + "<br/>";
        }else{
          str += ex.innerHTML.replace(/<[a|s].*?>/g, "").replace(/<\/[a|s].*?>/, "").replace(new RegExp(kanji, "g"), "⬤").replace(/[一-龯々]/g, "○") + "<br/>";
        }
      }
    
      document.getElementsByClassName("bugfix")[0].innerHTML += str + "</div>";
    });
  }
};