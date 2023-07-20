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
    div.innerHTML = str;
    cont.appendChild(div);
  }
}

let get_list = [
  "sites",
  "wrong_points",
  "right_points",
  "new_points",
  "new_card_stop",
  "new_card_limit",
  "kanji_readings",
  "vocab_amount",
  "min",
  "punish_points",
  "punish_percent",
  "loc",
  "time_left"
];

get(get_list, [[], 1, 2, 1, true, 10, true, 3, 25, 0, 10, "tl", []], _ => {
  let sites = _[0];
  
  $("wrong_points").value = _[1];
  $("right_points").value = _[2];
  $("new_points").value = _[3];
  $("new_card_stop").checked = _[4];
  $("new_card_limit").value = _[5];
  $("kanji_readings").checked = _[6];
  $("kanji_vocab").checked = _[7] > 0;
  $("vocab_amount").value = _[7];
  $("min").value = _[8];
  $("punish_num").checked = _[9] > 0;
  $("pun_num").value = _[9];
  $("punish_per").checked = _[10] > 0;
  $("pun_per").value = _[10];
  $("loc").value = _[11];
  
  makeSites(sites);
  $("add").onclick = e => {
    let times = [5, 15, 10, 30, 15, 45];
    if(sites.length){
      let st = sites.length - 1;
      
      times = [
        $(`mins0_` + st).value,
        $(`cost0_` + st).value,
        $(`mins1_` + st).value,
        $(`cost1_` + st).value,
        $(`mins2_` + st).value,
        $(`cost2_` + st).value
      ];
    }
    
    sites.push([
      "example.com",
      false,
      "gi",
      ...times
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
    
    let len = $("container").childNodes.length;

    for(let i = 0; i < len; i++){
      if(!sites[i]) sites[i] = [];
      sites[i][0] = $("link" + i).value;
      sites[i][1] = $("regex" + i).checked;
      sites[i][2] = $("reg_type" + i).value;
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
    
    chrome.storage.local.set(write, _ => {
      window.location.reload();
    });
  };
});