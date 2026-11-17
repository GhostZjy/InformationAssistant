import { $, $$, bus, cnDate, copyText, debounce, el, monthStr, nowHM, pad2, toast, todayStr, uid } from './core.js';
import { CLAUSES, MEET_MODS, clauseById } from './data.js';
import { data, save } from './store.js';
import { Sheet } from './ui.js';

export function renderMembers(){
  const box=$('#memberList');box.innerHTML='';
  const q=($('#memberSearch').value||'').trim().toLowerCase();
  const list=data.settings.members.filter(m=>!q||(m.name+(m.id||'')).toLowerCase().indexOf(q)>=0);
  $('#memberCount').textContent=data.settings.members.length+' 人';
  if(!data.settings.members.length){box.appendChild(el('div','empty','导入信息助手配置后这里会列出队员档案'));return;}
  if(!list.length){box.appendChild(el('div','empty','没有匹配的队员'));return;}
  list.forEach(m=>{
    const key=m.name+'|'+(m.id||'');if(!data.profiles[key])data.profiles[key]={};const pf=data.profiles[key];
    const sc=memberScores(m.name);
    const card=el('div','member-card');
    const head=el('button','member-head');head.type='button';
    const nm=el('span','member-name',m.name);const id=el('span','member-id',m.id||'');
    const net=el('span','member-net',(sc.net>=0?'+':'')+sc.net+'分');net.style.color=sc.net>=0?'var(--success)':'var(--danger)';
    head.appendChild(nm);head.appendChild(id);head.appendChild(net);
    head.addEventListener('click',()=>card.classList.toggle('open'));
    const body=el('div','member-body');
    body.appendChild(el('div','score-meta','累计奖励 '+sc.rw+' 分 · 处罚 '+sc.pn+' 分(自动从计分板汇总)'));
    const joinF=el('div','field');joinF.style.marginTop='9px';joinF.appendChild(el('label','field-label','入职日期'));
    const joinIn=el('input','input');joinIn.type='date';joinIn.value=pf.joinDate||'';
    joinIn.addEventListener('change',function(){setProfile(key,'joinDate',joinIn.value);});joinF.appendChild(joinIn);body.appendChild(joinF);
    const goodF=el('div','field');goodF.appendChild(el('label','field-label','擅长岗位'));
    const goodIn=el('input','input');goodIn.value=pf.goodAt||'';goodIn.placeholder='如 复检台/手检/厅巡';
    goodIn.addEventListener('input',debounce(function(){setProfile(key,'goodAt',goodIn.value);},300));goodF.appendChild(goodIn);body.appendChild(goodF);
    body.appendChild(el('label','field-label','培训记录'));
    const trainBox=el('div');body.appendChild(trainBox);
    function paintTrain(){trainBox.innerHTML='';const tr=pf.training||[];
      tr.forEach((t,i)=>{const r=el('div','train-row');
        const d=el('input','input');d.type='date';d.value=t.date||'';d.style.flex='none';d.style.width='140px';
        d.addEventListener('change',function(){t.date=d.value;save();});
        const topic=el('input','input');topic.value=t.topic||'';topic.placeholder='培训主题';
        topic.addEventListener('input',debounce(function(){t.topic=topic.value;save();},300));
        const del=el('button','mini-btn danger','删');del.addEventListener('click',function(){tr.splice(i,1);save();paintTrain();});
        r.appendChild(d);r.appendChild(topic);r.appendChild(del);trainBox.appendChild(r);});
      const add=el('button','btn btn-sm','+ 添加培训');add.addEventListener('click',function(){pf.training=pf.training||[];pf.training.push({date:todayStr(),topic:''});setProfileObj(key,pf);paintTrain();});
      trainBox.appendChild(add);}
    paintTrain();
    const fromHist=el('button','btn btn-sm','从历史导入新人培训');fromHist.style.marginTop='6px';
    fromHist.addEventListener('click',function(){
      const found=data.history.filter(h=>/新人培训/.test(h.templateName||'')&&(h.text||'').indexOf(m.name)>=0);
      if(!found.length){toast('历史里没有该队员的新人培训记录');return;}
      pf.training=pf.training||[];let added=0;
      found.forEach(h=>{const dm=(h.text||'').match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);const date=dm?dm[1]+'-'+pad2(dm[2])+'-'+pad2(dm[3]):todayStr(new Date(h.createdAt));
        if(!pf.training.some(t=>t.date===date)){pf.training.push({date,topic:'新人培训'});added++;}});
      setProfileObj(key,pf);paintTrain();toast(added?'已导入 '+added+' 条':'没有新增(已存在)');});
    body.appendChild(fromHist);
    const noteF=el('div','field');noteF.style.marginTop='9px';noteF.appendChild(el('label','field-label','备注'));
    const noteIn=el('textarea','textarea');noteIn.rows=2;noteIn.value=pf.note||'';
    noteIn.addEventListener('input',debounce(function(){setProfile(key,'note',noteIn.value);},300));noteF.appendChild(noteIn);body.appendChild(noteF);
    card.appendChild(head);card.appendChild(body);box.appendChild(card);
  });
}

export function allMods(){return MEET_MODS.concat(data.meetCustom);}

export function renderMeetMembers(){
  const box=$('#meetMembers');box.innerHTML='';
  if(!data.settings.members.length){box.appendChild(el('span','section-note','导入信息助手配置后这里会列出队员'));return;}
  data.settings.members.forEach(m=>{const c=el('button','chip chip-sm',m.name);c.type='button';
    c.setAttribute('aria-pressed',meetSelectedMembers.indexOf(m.name)>=0?'true':'false');
    c.addEventListener('click',function(){const i=meetSelectedMembers.indexOf(m.name);
      if(i>=0)meetSelectedMembers.splice(i,1);else meetSelectedMembers.push(m.name);
      c.setAttribute('aria-pressed',i>=0?'false':'true');});
    box.appendChild(c);});
}

export let meetSelectedMembers=[];

export function renderMods(){
  const box=$('#modList');box.innerHTML='';
  const mods=allMods();
  // 先按已选顺序展示选中的,再展示未选的
  const selected=data.meetSel.map(id=>mods.filter(m=>m.id===id)[0]).filter(Boolean);
  const unselected=mods.filter(m=>data.meetSel.indexOf(m.id)<0);
  function row(m,isSel,idx){
    const r=el('div','mod-row'+(isSel?' on':''));
    const cb=el('input','mod-check');cb.type='checkbox';cb.checked=isSel;cb.setAttribute('aria-label','选择'+m.title);
    cb.addEventListener('change',function(){
      if(cb.checked){if(data.meetSel.indexOf(m.id)<0)data.meetSel.push(m.id);}
      else data.meetSel=data.meetSel.filter(x=>x!==m.id);
      save();renderMods();});
    const body=el('div','mod-body');body.appendChild(el('div','mod-title',m.title));body.appendChild(el('div','mod-text',m.text));
    r.appendChild(cb);r.appendChild(body);
    if(isSel){const acts=el('div','mod-acts');
      const up=el('button','mini-btn','↑');up.disabled=idx===0;up.addEventListener('click',function(){const p=data.meetSel[idx-1];data.meetSel[idx-1]=data.meetSel[idx];data.meetSel[idx]=p;save();renderMods();});
      const dn=el('button','mini-btn','↓');dn.disabled=idx===selected.length-1;dn.addEventListener('click',function(){const n=data.meetSel[idx+1];data.meetSel[idx+1]=data.meetSel[idx];data.meetSel[idx]=n;save();renderMods();});
      acts.appendChild(up);acts.appendChild(dn);
      if(!MEET_MODS.some(x=>x.id===m.id)){const del=el('button','mini-btn danger','删');del.addEventListener('click',function(){data.meetCustom=data.meetCustom.filter(x=>x.id!==m.id);data.meetSel=data.meetSel.filter(x=>x!==m.id);save();renderMods();});acts.appendChild(del);}
      r.appendChild(acts);}
    box.appendChild(r);
  }
  selected.forEach((m,i)=>row(m,true,i));
  if(unselected.length){box.appendChild(el('div','ck-cat','未选用'));unselected.forEach(m=>row(m,false,-1));}
}

export function genMeeting(){
  const mods=allMods();
  const picked=data.meetSel.map(id=>mods.filter(m=>m.id===id)[0]).filter(Boolean);
  const extra=$('#meetExtra').value.trim();
  if(!picked.length&&!extra){toast('先勾选积木或填写补充内容');return;}
  const lines=[];picked.forEach((m,i)=>lines.push((i+1)+'、'+m.text));
  if(extra)lines.push((lines.length+1)+'、'+extra);
  const content=lines.join('\n');
  const fmt=$('#meetFormat').value;
  const date=cnDate($('#meetDate').value||todayStr());
  const s=data.settings;const loc=(s.line||'')+(s.station||'');
  let out='';
  if(fmt==='content')out=content;
  else if(fmt==='meeting')out='【班前会议】\n        '+date+nowHM()+'分，'+loc+'安检班长召集召开班前会议，内容如下：\n'+content;
  else out='【驻站培训】\n        '+date+loc+'安检班长利用晚备勤时间组织队员进行培训，培训内容如下：\n'+content;
  if($('#meetShowMembers').checked&&meetSelectedMembers.length)out+='\n参会人员：'+meetSelectedMembers.join('、');
  $('#meetPreview').textContent=out;$('#meetPreview').classList.remove('placeholder');
  $('#meetCount').textContent=out.replace(/\s/g,'').length+' 字';
  data.meetExtra=$('#meetExtra').value;data.meetShowMembers=$('#meetShowMembers').checked;save();
}

export function openAddMod(){
  const b=el('div');
  const t=el('input','input');t.placeholder='积木标题,如 近期漏检通报';t.style.marginBottom='9px';
  const x=el('textarea','textarea');x.placeholder='积木内容(会作为一条编号内容输出)';x.rows=4;
  b.appendChild(t);b.appendChild(x);
  const f=el('div','btn-row');const ok=el('button','btn btn-primary','添加');
  ok.addEventListener('click',function(){const title=t.value.trim(),text=x.value.trim();
    if(!title||!text){toast('标题和内容都要填');return;}
    const m={id:'c'+uid(),title,text};data.meetCustom.push(m);data.meetSel.push(m.id);save();Sheet.close();renderMods();toast('已添加并选用');});
  f.appendChild(ok);Sheet.open({title:'自定义内容积木',bodyNode:b,footNode:f});
}



export function extractSeizure(h){
  const v=h.vals||{};
  let item=v['违禁品']||v['限带品']||'',qty=v['物品数量']||'',person=v['人员']||'',date=v['日期']||'';
  const txt=h.text||'';
  if(!item){const m=txt.match(/确认为(.+?)[x×](\d+)/);if(m){item=m[1].trim();qty=m[2];}}
  else if(!qty){const m=txt.match(/[x×](\d+)/);if(m)qty=m[1];}
  if(!person){const m=txt.match(/复检员(.+?)（/)||txt.match(/复检员(.+?)查出/);if(m)person=m[1].trim();}
  if(!date){const m=txt.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);if(m)date=m[1]+'-'+pad2(m[2])+'-'+pad2(m[3]);}
  if(!date&&h.createdAt)date=todayStr(new Date(h.createdAt));
  return {item:String(item).trim(),qty:parseInt(qty,10)||0,person:String(person).trim(),date,month:date?date.slice(0,7):''};
}

export function matchReward(item,qty){
  if(!item)return null;
  if(/工艺子弹|弹壳/.test(item))return null;
  if(/子弹/.test(item)){const t=qty>=10?'R03':qty>=4?'R02':'R01';return clauseById(t);}
  if(/雷管|引爆/.test(item))return clauseById('R04');
  if(/仿真枪|高仿/.test(item))return clauseById('R08');
  if(/爆炸|炸药|炸弹|手雷|地雷|炮弹|硝化|TNT|黑火药|火药/.test(item))return clauseById('R05');
  if(/汽油|硫酸|盐酸|硝酸|腐蚀/.test(item))return clauseById('R07');
  if(/鸡|鸭|鹅|宠物|猫|狗|活体|鼠|鸟/.test(item))return clauseById('R09');
  return null;
}

export function isSeizureTpl(h){return /查危简报/.test(h.templateName||'')||/确认为/.test(h.text||'');}

export function histDate(h){
  if(h.vals&&h.vals['日期'])return String(h.vals['日期']).slice(0,10);
  const m=(h.text||'').match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
  if(m)return m[1]+'-'+pad2(m[2])+'-'+pad2(m[3]);
  return h.createdAt?todayStr(new Date(h.createdAt)):'';
}

export function pendingSuggestions(){
  const out=[];const done={};data.scores.forEach(s=>{if(s.histId)done[s.histId]=1;});
  const dismissed={};data.dismissed.forEach(id=>dismissed[id]=1);
  data.history.forEach(h=>{
    if(!isSeizureTpl(h)||done[h.id]||dismissed[h.id])return;
    const sz=extractSeizure(h);const cl=matchReward(sz.item,sz.qty);
    if(!cl)return;
    out.push({histId:h.id,sz,cl});
  });
  return out;
}

export function renderSuggestions(){
  const box=$('#suggList');box.innerHTML='';
  const sug=pendingSuggestions();
  if(!data.history.length){box.appendChild(el('div','empty','先在右上角「导入配置」导入信息助手配置'));return;}
  if(!sug.length){box.appendChild(el('div','empty','没有可提示的查获(现有历史多为酒精/打火机/刀具/充电宝,无对应奖励条款;已确认或忽略的不再提示)'));return;}
  sug.forEach(s=>{
    const c=el('div','sugg-card');
    c.appendChild(el('div','sugg-top',s.sz.date+' · '+s.sz.person+' · '+s.sz.item+' ×'+s.sz.qty));
    c.appendChild(el('div','sugg-detail','匹配条款:'+s.cl.label+'(区间 '+s.cl.min+'-'+s.cl.max+' 分,默认取下限,可改)'));
    const acts=el('div','sugg-acts');
    const pts=el('input','input sugg-pts');pts.type='number';pts.min='0';pts.value=String(s.cl.min);pts.setAttribute('aria-label','分值');
    const ok=el('button','btn btn-sm btn-primary','计入');
    ok.addEventListener('click',function(){const p=parseInt(pts.value,10);if(!(p>=0)){toast('分值需要是非负数字');return;}
      data.scores.push({id:uid(),date:s.sz.date||todayStr(),person:s.sz.person||'未署名',role:'安检员',clauseId:s.cl.id,kind:'奖励',points:p,note:s.sz.item+'×'+s.sz.qty,source:'历史',histId:s.histId});
      save();renderScore();renderSuggestions();toast('已计入 '+p+' 分');});
    const skip=el('button','btn btn-sm','忽略');skip.addEventListener('click',function(){data.dismissed.push(s.histId);save();renderSuggestions();});
    acts.appendChild(pts);acts.appendChild(ok);acts.appendChild(skip);c.appendChild(acts);box.appendChild(c);
  });
}



export function renderScoreFilter(){
  const sel=$('#scorePerson');const cur=sel.value;sel.innerHTML='';sel.appendChild(el('option','','全部人员'));
  data.settings.members.forEach(m=>{const o=el('option','',m.name);o.value=m.name;sel.appendChild(o);});
  sel.value=cur;
}

export function renderScore(){
  renderScoreFilter();
  const month=$('#scoreMonth').value||monthStr();
  const person=$('#scorePerson').value;
  const inMonth=data.scores.filter(s=>(s.date||'').slice(0,7)===month);
  let rw=0,pn=0;inMonth.forEach(s=>{if(s.kind==='奖励')rw+=s.points;else pn+=s.points;});
  $('#stReward').textContent=rw;$('#stPunish').textContent=pn;$('#stNet').textContent=rw-pn;
  const box=$('#scoreList');box.innerHTML='';
  const shown=inMonth.filter(s=>!person||s.person===person).slice().sort((a,b)=>(b.date||'').localeCompare(a.date||''));
  if(!shown.length){box.appendChild(el('div','empty','本月暂无计分记录,点右上「手动录一条」或在上方确认历史提示'));return;}
  shown.forEach(s=>{
    const cl=clauseById(s.clauseId);
    const r=el('div','score-row');const m=el('div','score-main');
    const top=el('div','score-top');
    top.appendChild(el('span','score-person',s.person));
    top.appendChild(el('span','tag '+(s.kind==='奖励'?'reward':'punish'),s.kind));
    if(s.source==='历史')top.appendChild(el('span','tag info','历史'));
    m.appendChild(top);
    m.appendChild(el('div','score-clause',cl?cl.label:(s.note||'自定义')));
    m.appendChild(el('div','score-meta',s.date+(s.role&&s.role!=='安检员'?' · '+s.role:'')+(s.note&&cl?' · '+s.note:'')));
    const pts=el('div','score-pts '+(s.kind==='奖励'?'reward':'punish'),(s.kind==='奖励'?'+':'-')+s.points);
    const del=el('button','mini-btn danger','删');del.addEventListener('click',function(){Sheet.confirm({title:'删除这条计分?',message:s.person+' '+s.kind+' '+s.points+' 分',okText:'删除',danger:true,
      onOk:function(){data.scores=data.scores.filter(x=>x.id!==s.id);save();renderScore();renderSuggestions();}});});
    r.appendChild(m);r.appendChild(pts);r.appendChild(del);box.appendChild(r);
  });
}

export function openAddScore(){
  const b=el('div');
  const kindRow=el('div','chip-group');kindRow.style.marginBottom='10px';
  let kind='奖励';
  const kR=el('button','chip','奖励');kR.setAttribute('aria-pressed','true');
  const kP=el('button','chip','处罚');kP.setAttribute('aria-pressed','false');
  function setKind(k){kind=k;kR.setAttribute('aria-pressed',k==='奖励'?'true':'false');kP.setAttribute('aria-pressed',k==='处罚'?'true':'false');fillClauses();}
  kR.addEventListener('click',()=>setKind('奖励'));kP.addEventListener('click',()=>setKind('处罚'));
  kindRow.appendChild(kR);kindRow.appendChild(kP);b.appendChild(kindRow);
  const clSel=el('select','select');clSel.style.marginBottom='9px';
  function fillClauses(){clSel.innerHTML='';CLAUSES.filter(c=>c.kind===kind).forEach(c=>{const o=el('option','',c.label+' ('+(c.min===c.max?c.min:c.min+'-'+c.max)+'分)');o.value=c.id;clSel.appendChild(o);});
    const custom=el('option','','自定义条款…');custom.value='__custom';clSel.appendChild(custom);prefill();}
  const customText=el('input','input');customText.placeholder='自定义条款说明';customText.style.marginBottom='9px';customText.hidden=true;
  const personSel=el('select','select');personSel.style.marginBottom='9px';
  personSel.appendChild(el('option','','选择队员'));data.settings.members.forEach(m=>{const o=el('option','',m.name+(m.id?'（'+m.id+'）':''));o.value=m.name;personSel.appendChild(o);});
  const freePerson=el('input','input');freePerson.placeholder='或手输姓名(名单外)';freePerson.style.marginBottom='9px';
  const dateIn=el('input','input');dateIn.type='date';dateIn.value=todayStr();dateIn.style.marginBottom='9px';
  const ptsIn=el('input','input');ptsIn.type='number';ptsIn.min='0';ptsIn.style.marginBottom='9px';ptsIn.setAttribute('aria-label','分值');
  const noteIn=el('input','input');noteIn.placeholder='备注(选填)';noteIn.style.marginBottom='9px';
  function prefill(){const c=clauseById(clSel.value);customText.hidden=clSel.value!=='__custom';ptsIn.value=c?String(c.min):'';}
  clSel.addEventListener('change',prefill);
  b.appendChild(clSel);b.appendChild(customText);b.appendChild(personSel);b.appendChild(freePerson);b.appendChild(dateIn);b.appendChild(ptsIn);b.appendChild(noteIn);
  fillClauses();
  const f=el('div','btn-row');const ok=el('button','btn btn-primary','计入');
  ok.addEventListener('click',function(){
    const person=freePerson.value.trim()||personSel.value;
    if(!person){toast('选择或输入姓名');return;}
    const p=parseInt(ptsIn.value,10);if(!(p>=0)){toast('分值需要是非负数字');return;}
    const cid=clSel.value;const note=cid==='__custom'?customText.value.trim():noteIn.value.trim();
    if(cid==='__custom'&&!note){toast('自定义条款要填说明');return;}
    data.scores.push({id:uid(),date:dateIn.value||todayStr(),person,role:'安检员',clauseId:cid==='__custom'?'':cid,kind,points:p,note,source:'手动',histId:''});
    save();Sheet.close();renderScore();toast('已计入');});
  f.appendChild(ok);Sheet.open({title:'手动录奖惩',bodyNode:b,footNode:f});
}



export function memberScores(name){let rw=0,pn=0;data.scores.forEach(s=>{if(s.person===name){if(s.kind==='奖励')rw+=s.points;else pn+=s.points;}});return {rw,pn,net:rw-pn};}

export function setProfileObj(key,pf){data.profiles[key]=pf;save();}

export function setProfile(key,field,val){const pf=data.profiles[key]||{};pf[field]=val;data.profiles[key]=pf;save();}



export function genReport(){
  const month=$('#reportMonth').value||monthStr();
  const s=data.settings;const loc=(s.line||'')+(s.station||'');
  const hist=data.history.filter(h=>histDate(h).slice(0,7)===month);
  const byTpl={};hist.forEach(h=>{const n=h.templateName||'其他';byTpl[n]=(byTpl[n]||0)+1;});
  const items={};hist.filter(isSeizureTpl).forEach(h=>{const sz=extractSeizure(h);if(sz.item)items[sz.item]=(items[sz.item]||0)+(sz.qty||1);});
  const scores=data.scores.filter(x=>(x.date||'').slice(0,7)===month);
  let rw=0,pn=0;scores.forEach(x=>{if(x.kind==='奖励')rw+=x.points;else pn+=x.points;});
  const trainCount=hist.filter(h=>/培训|班前会议/.test(h.templateName||'')).length;
  const manual=data.reportManual[month]||{};
  const bags=$('#rpBags').value,mach=$('#rpMachines').value,faults=$('#rpFaults').value,comp=$('#rpComplaints').value,plan=$('#rpPlan').value.trim();
  data.reportManual[month]={bags,mach,faults,comp,plan};save();
  const L=[];
  L.push('【'+(+month.slice(5,7))+'月工作月报】'+loc);
  L.push('');
  L.push('一、上报与查获');
  L.push('本月上报共 '+hist.length+' 条。'+Object.keys(byTpl).map(k=>k+' '+byTpl[k]+' 条').join('，')+'。');
  const itemKeys=Object.keys(items);
  L.push(itemKeys.length?'查获物品:'+itemKeys.map(k=>k+' '+items[k]+' 件').join('，')+'。':'本月无查获物品记录。');
  L.push('');
  L.push('二、设备与勤务');
  L.push('总过包数:'+(bags||'待填')+';总过机数:'+(mach||'待填')+';设备故障:'+(faults||'待填')+' 次;有效投诉:'+(comp||'待填')+' 次。');
  L.push('');
  L.push('三、培训');
  L.push('本月开展培训/班前会议共 '+trainCount+' 场。');
  L.push('');
  L.push('四、奖惩');
  L.push('本月奖励 '+rw+' 分,处罚 '+pn+' 分,净 '+(rw-pn)+' 分,共 '+scores.length+' 条记录(每1分按1加班工时计)。');
  const byPerson={};scores.forEach(x=>{byPerson[x.person]=(byPerson[x.person]||0)+(x.kind==='奖励'?x.points:-x.points);});
  const pk=Object.keys(byPerson).sort((a,b)=>byPerson[b]-byPerson[a]);
  if(pk.length)L.push('按人净分:'+pk.map(k=>k+' '+(byPerson[k]>=0?'+':'')+byPerson[k]).join('，')+'。');
  if(plan){L.push('');L.push('五、下月计划/说明');L.push(plan);}
  const out=L.join('\n');
  $('#reportPreview').textContent=out;$('#reportCount').textContent=out.replace(/\s/g,'').length+' 字';
}



export function renderCheck(){
  const box=$('#ckList');box.innerHTML='';
  const items=data.checklist;
  const done=items.filter(i=>i.done).length;
  $('#ckProgress').textContent=done+' / '+items.length;
  $('#ckFill').style.width=(items.length?Math.round(done/items.length*100):0)+'%';
  $('#ckOnlyMiss').setAttribute('aria-pressed',data.ckOnlyMiss?'true':'false');
  const cats=[];items.forEach(i=>{if(cats.indexOf(i.cat)<0)cats.push(i.cat);});
  const onlyMiss=data.ckOnlyMiss;
  let shownAny=false;
  cats.forEach(cat=>{
    const list=items.filter(i=>i.cat===cat&&(!onlyMiss||!i.done));
    if(!list.length)return;
    shownAny=true;
    box.appendChild(el('div','ck-cat',cat));
    list.forEach(i=>{
      const r=el('div','ck-item'+(i.done?' done':'')+(!i.done&&onlyMiss?' miss':''));
      const cb=el('input','ck-check');cb.type='checkbox';cb.checked=i.done;cb.setAttribute('aria-label',i.text);
      cb.addEventListener('change',function(){i.done=cb.checked;i.doneAt=cb.checked?todayStr()+' '+nowHM():'';save();renderCheck();});
      const tx=el('div','ck-text',i.text);
      const del=el('button','mini-btn danger','删');del.addEventListener('click',function(){data.checklist=data.checklist.filter(x=>x.id!==i.id);save();renderCheck();});
      r.appendChild(cb);r.appendChild(tx);r.appendChild(del);box.appendChild(r);
    });
  });
  if(!shownAny)box.appendChild(el('div','empty',onlyMiss?'全部已完成,没有未完成项':'清单为空,点右上「添加条目」'));
}

export function openAddCk(){
  const b=el('div');
  const cat=el('input','input');cat.placeholder='分类,如 设备/人员/台账';cat.style.marginBottom='9px';cat.value='其他';
  const tx=el('textarea','textarea');tx.placeholder='检查条目内容';tx.rows=2;
  b.appendChild(cat);b.appendChild(tx);
  const f=el('div','btn-row');const ok=el('button','btn btn-primary','添加');
  ok.addEventListener('click',function(){const text=tx.value.trim();if(!text){toast('填条目内容');return;}
    data.checklist.push({id:uid(),cat:cat.value.trim()||'其他',text,done:false,doneAt:''});save();Sheet.close();renderCheck();});
  f.appendChild(ok);Sheet.open({title:'添加检查条目',bodyNode:b,footNode:f});
}



export let teamSub = 'meeting';
export function renderTeam() {
  if (teamSub === 'meeting') { renderMeetMembers(); renderMods(); }
  else if (teamSub === 'score') { renderScoreFilter(); renderScore(); renderSuggestions(); }
  else if (teamSub === 'profile') { renderMembers(); }
  else if (teamSub === 'check') { renderCheck(); }
}
export function switchTeamSub(name) {
  teamSub = name;
  $$('.team-sub').forEach(p => p.classList.toggle('active', p.id === 'team-' + name));
  $$('.team-subtab').forEach(t => t.setAttribute('aria-selected', t.dataset.sub === name ? 'true' : 'false'));
  renderTeam();
}

export function bindTeam(){
  $$('.team-subtab').forEach(t=>t.addEventListener('click',()=>switchTeamSub(t.dataset.sub)));
  $('#btnAddMod').addEventListener('click',openAddMod);
  $('#btnGenMeet').addEventListener('click',genMeeting);
  $('#btnCopyMeet').addEventListener('click',async function(){const t=$('#meetPreview').textContent;if(!t||t.indexOf('勾选积木')===0){toast('先生成内容');return;}toast(await copyText(t)?'已复制':'复制失败,请长按手动复制');});
  $('#meetDate').value=todayStr();
  $('#meetExtra').value=data.meetExtra||'';
  $('#meetShowMembers').checked=!!data.meetShowMembers;
  $('#btnRescan').addEventListener('click',function(){renderSuggestions();toast('已重新扫描');});
  $('#btnAddScore').addEventListener('click',openAddScore);
  $('#scoreMonth').value=monthStr();
  $('#scoreMonth').addEventListener('change',renderScore);
  $('#scorePerson').addEventListener('change',renderScore);
  $('#memberSearch').addEventListener('input',debounce(renderMembers,200));
  $('#reportMonth').value=monthStr();
  $('#btnGenReport').addEventListener('click',genReport);
  $('#btnCopyReport').addEventListener('click',async function(){const t=$('#reportPreview').textContent;if(!t||t.indexOf('选择月份')===0){toast('先生成草稿');return;}toast(await copyText(t)?'已复制':'复制失败,请长按手动复制');});
  const rpMap={rpBags:'bags',rpMachines:'mach',rpFaults:'faults',rpComplaints:'comp'};
  Object.keys(rpMap).forEach(id=>$('#'+id).addEventListener('input',debounce(function(){const m=$('#reportMonth').value||monthStr();const o=data.reportManual[m]||{};o[rpMap[id]]=$('#'+id).value;data.reportManual[m]=o;save();},300)));
  $('#rpPlan').addEventListener('input',debounce(function(){const m=$('#reportMonth').value||monthStr();const o=data.reportManual[m]||{};o.plan=$('#rpPlan').value;data.reportManual[m]=o;save();},300));
  $('#reportMonth').addEventListener('change',function(){const m=$('#reportMonth').value;const o=data.reportManual[m]||{};
    $('#rpBags').value=o.bags||'';$('#rpMachines').value=o.mach||'';$('#rpFaults').value=o.faults||'';$('#rpComplaints').value=o.comp||'';$('#rpPlan').value=o.plan||'';});
  $('#btnAddCk').addEventListener('click',openAddCk);
  $('#ckOnlyMiss').addEventListener('click',function(){data.ckOnlyMiss=!data.ckOnlyMiss;save();renderCheck();});
  $('#ckReset').addEventListener('click',function(){Sheet.confirm({title:'重置全部勾选?',message:'所有条目恢复为未完成,用于新一轮迎检。条目本身保留。',okText:'重置',danger:true,
    onOk:function(){data.checklist.forEach(i=>{i.done=false;i.doneAt='';});save();renderCheck();toast('已重置');}});});
}
