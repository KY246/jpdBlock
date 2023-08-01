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
      if(result[key[i]] === undefined){
        result[key[i]] = value[i];
        set(key[i], value[i]);
      }
      res.push(result[key[i]]);
    }
    
    after(res);
  });
}

function makeSites(sites, last = false){
  let cont = $("container");
  for(let i = last ? sites.length - 1 : 0; i < sites.length; i++){
    let site = sites[i];
    let div = document.createElement("div");
    let str = `
      <p class="br"></p>
      <br/>
      <span style="width: 35vw; padding: 0px, margin: 0px; display: inline-block;">
        <input type="text" id="link${i}" value="${site[0]}" style="width: 33vw;"></input>
        <br/>
        <input type="checkbox" id="regex${i}" ${site[1] ? "checked" : ""}/>
        <span>
          Use regex
          <span class="tab"></span>
          <select id="reg_type${i}">
            <option value="g" ${site[2] == "g" ? "selected" : ""}>/g</option>
            <option value="gi" ${site[2] == "gi" ? "selected" : ""}>/gi</option>
            <option value="gu" ${site[2] == "gu" ? "selected" : ""}>/gu</option>
            <option value="giu" ${site[2] == "giu" ? "selected" : ""}>/giu</option>
            <option value="gv" ${site[2] == "gv" ? "selected" : ""}>/gv</option>
            <option value="giv" ${site[2] == "giv" ? "selected" : ""}>/giv</option>
          </select>
        </span>
        <span class="info">?
          <div>Advanced URL matching. Use JavaScript rules for regex.</div>
        </span>
      </span>
    `;
    for(let j = 0; j < 3; j++){
      str += `
        <span style="width: 10vw; padding: 0px, margin: 0px; display: inline-block;">
          <input type="number" id="mins${j}_${i}" value="${site[3 + 2 * j]}" style="width: 7vw;" min="0"></input>
          分
          <input type="number" id="cost${j}_${i}" value="${site[4 + 2 * j]}" style="width: 7vw;" min="0"></input>
          点
        </span>
      `;
    }
    str += `
      <br/>
      <input type="checkbox" id="onload${i}" ${site[9] ? "checked" : ""}/>
      <span>Only block on page load</span>
    `;
    div.innerHTML = str;
    cont.appendChild(div);
  }
}

let get_list = [
  "sites",            // 0
  "wrong_points",     // 1
  "right_points",     // 2
  "new_points",       // 3
  "new_card_stop",    // 4
  "new_card_limit",   // 5
  "kanji_readings",   // 6
  "vocab_amount",     // 7
  "min",              // 8
  "punish_points",    // 9
  "punish_percent",   // 10
  "loc",              // 11
  "time_left",        // 12
  "hide_others",      // 13
  "time_offset",      // 14
  "new_after",        // 15
  "extra_enabled",    // 16
  "wrong_extra",      // 17
  "right_extra"       // 18
];

get(get_list, [[], -2, 2, 1, true, 15, true, 3, 25, 0, 10, "lt", [], true, 0, -10, false, -1, 3], _ => {
  let sites = _[0];
  
  $("wrong_points").value = _[1] || 0;
  $("right_points").value = _[2] || 0;
  $("new_points").value = _[3] || 0;
  $("new_card_stop").checked = _[4];
  $("new_card_limit").value = _[5] || 0;
  $("kanji_readings").checked = _[6];
  $("kanji_vocab").checked = _[7] > 0;
  $("vocab_amount").value = _[7] || 0;
  $("min").value = _[8] || 0;
  $("punish_num").checked = _[9] > 0;
  $("pun_num").value = _[9] || 0;
  $("punish_per").checked = _[10] > 0;
  $("pun_per").value = _[10] || 0;
  $("loc").value = _[11] || 0;
  $("hide_others").checked = _[13];
  $("offset").value = _[14] || 0;
  $("new_after").value = _[15] || 0;
  $("extra_enabled").checked = _[16] || 0;
  $("wrong_extra").value = _[17] || 0;
  $("right_extra").value = _[18] || 0;
  
  
  console.log(_);
  
  makeSites(sites);
  $("add").onclick = e => {
    let times = [5, 15, 10, 30, 15, 45];
    if(sites.length){
      let st = sites.length - 1;
      
      times = [
        $(`mins0_` + st).value || 0,
        $(`cost0_` + st).value || 0,
        $(`mins1_` + st).value || 0,
        $(`cost1_` + st).value || 0,
        $(`mins2_` + st).value || 0,
        $(`cost2_` + st).value || 0
      ];
    }
    
    sites.push([
      "example.com",
      false,
      "gi",
      ...times,
      false
    ]);
    _[12].push(1);
    
    makeSites(sites, true);
  };
  
  $("submit").onclick = e => {
    _[1] = $("wrong_points").value;
    _[2] = $("right_points").value;
    _[3] = $("new_points").value;
    _[4] = $("new_card_stop").checked;
    _[5] = $("new_card_limit").value;
    _[6] = $("kanji_readings").checked;
    _[7] = $("kanji_vocab").checked ? $("vocab_amount").value : 0;
    _[8] = $("min").value;
    _[9] = $("punish_num").checked ? $("pun_num").value : 0;
    _[10] = $("punish_per").checked ? $("pun_per").value : 0;
    _[11] = $("loc").value;
    _[13] = $("hide_others").checked;
    _[14] = +($("offset").value);
    _[15] = $("new_after").value;
    _[16] = $("extra_enabled").checked;
    _[17] = $("wrong_extra").value;
    _[18] = $("right_extra").value;
    
    let len = $("container").childNodes.length;

    for(let i = 0; i < len; i++){
      if(!sites[i]) sites[i] = [];
      sites[i][0] = $("link" + i).value;
      sites[i][1] = $("regex" + i).checked;
      sites[i][2] = $("reg_type" + i).value;
      sites[i][9] = $("onload" + i).checked;
      for(let j = 0; j < 3; j++){
        sites[i][3 + 2 * j] = $(`mins${j}_` + i).value;
        sites[i][4 + 2 * j] = $(`cost${j}_` + i).value;
      }
    }
    
    for(let i = len - 1; i >= 0; i--){
      if(sites[i][0].replace(/\s/g, "") == ""){
        sites.splice(i, 1);
        _[12].splice(i, 1);
      }
    }
    
    _[0] = sites;
    
    let write = {};
    for(let i = 0; i < get_list.length; i++){
      write[get_list[i]] = _[i];
    }
    
    browser.storage.local.set(write, _ => {
      window.location.reload();
    });
  };
});