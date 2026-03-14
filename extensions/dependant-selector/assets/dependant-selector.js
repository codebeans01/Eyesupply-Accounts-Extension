(function(){"use strict";
const c=window.__DependantConfig; if(!c)return;
const cid=c.customerId, loggedIn=c.loggedIn, pb=(c.proxyBase||"/apps/eyesupply").replace(/\/$/,""), i18n=c.i18n||{};
let currentDeps = [], selectedId = "";
const labels={
  label:i18n.label||"Add / Select Your Dependant",
  placeholder:i18n.placeholder||"— Select a saved dependant —",
  addNew:i18n.addNew||"Add New Dependant",
  firstName:i18n.firstName||"First Name",
  lastName:i18n.lastName||"Last Name",
  save:i18n.save||"Save & Select",
  cancel:i18n.cancel||"Cancel",
  saving:i18n.saving||"Saving…",
  saved:i18n.saved||"Saved!",
  errRequired:i18n.errRequired||"Please enter both first and last name.",
  errSave:i18n.errSave||"Could not save. Please try again.",
  loginRequired:i18n.loginRequired||"Please log in to select or add a dependant."
};
const $id=(i)=>document.getElementById(i);
function getSel(){ const f=$id("dep-hidden-fn"), l=$id("dep-hidden-ln"); return (f&&f.value&&l&&l.value)?{fn:f.value,ln:l.value}:null; }
const of=window.fetch; window.fetch=function(){
  const a=arguments, u=a[0];
  if(u&&typeof u==="string"&&u.indexOf("/cart/add")>-1){
    const d=getSel(), o=a[1];
    if(d&&o&&o.body){
      try{
        if(typeof o.body==="string"){
          const b=JSON.parse(o.body); if(!b.properties)b.properties={};
          b.properties["Dependant First Name"]=d.fn; b.properties["Dependant Last Name"]=d.ln;
          o.body=JSON.stringify(b);
        }else if(o.body instanceof FormData || o.body instanceof URLSearchParams){
          o.body.append("properties[Dependant First Name]",d.fn); o.body.append("properties[Dependant Last Name]",d.ln);
        }
      }catch(e){}
    }
  }
  return of.apply(window,a);
};
const oxo=window.XMLHttpRequest.prototype.open; window.XMLHttpRequest.prototype.open=function(m,u){this._u=u;return oxo.apply(this,arguments);};
const oxs=window.XMLHttpRequest.prototype.send; window.XMLHttpRequest.prototype.send=function(b){
  if(this._u&&this._u.indexOf("/cart/add")>-1){
    const d=getSel();
    if(d){
      if(typeof b==="string"){
        try{
          const j=JSON.parse(b); if(!j.properties)j.properties={};
          j.properties["Dependant First Name"]=d.fn; j.properties["Dependant Last Name"]=d.ln;
          b=JSON.stringify(j);
        }catch(e){ if(b.indexOf("=")>-1)b+="&properties[Dependant%20First%20Name]="+encodeURIComponent(d.fn)+"&properties[Dependant%20Last%20Name]="+encodeURIComponent(d.ln); }
      }else if(b instanceof FormData) { b.append("properties[Dependant First Name]",d.fn); b.append("properties[Dependant Last Name]",d.ln); }
    }
  }
  return oxs.call(this,b);
};
async function syncCart(){
  try{
    const cd=await of("/cart.js?t="+Date.now()).then(r=>r.json()); if(!cd||!cd.items)return;
    document.querySelectorAll('.cart-item, .cart-drawer__item, [data-cart-item], .c-cart-item').forEach((el,i)=>{
      const it=cd.items[i];
      if(it&&it.properties&&it.properties["Dependant First Name"]&&!el.querySelector('.dep-cart-label')){
        const dc=el.querySelector('.cart-item__details, .cart-item__info, [data-cart-item-details], .c-cart-item__details')||el;
        const l=document.createElement("div"); l.className='dep-cart-label'; l.style.fontSize='0.9em'; l.style.marginTop='4px';
        l.innerHTML='<strong>Dependant:</strong> '+it.properties["Dependant First Name"]+' '+it.properties["Dependant Last Name"];
        dc.appendChild(l);
      }
    });
  }catch(e){}
}
let st=null; const co=new MutationObserver(()=>{clearTimeout(st); st=setTimeout(syncCart,500);});
co.observe(document.body,{childList:true,subtree:true});
async function fDeps(){ try{ const r=await of(pb+"/api/dependant?customerId="+encodeURIComponent(cid)); if(!r.ok)return[]; const d=await r.json(); return Array.isArray(d)?d.reverse():[]; }catch(e){return[];} }
async function sDep(f,l){ const r=await of(pb+"/api/dependant",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({firstName:f,lastName:l,customerId:cid})}); if(!r.ok)throw new Error(r.status); const d=await r.json(); if(d.error)throw d.error; return d; }
function cModal(){
  if($id("dep-modal-overlay"))return;
  const o=document.createElement("div"); o.id="dep-modal-overlay"; o.className="dep-modal-overlay";
  const m=document.createElement("div"); m.className="dep-modal";
  m.innerHTML=`<div class="dep-modal__header"><h3 class="dep-modal__title">${labels.addNew}</h3><button class="dep-modal__close" id="dep-modal-close" type="button">&times;</button></div><div class="dep-modal__body"><div id="dep-modal-rows" class="dep-modal__rows"></div><button type="button" id="dep-modal-add-row" class="dep-btn dep-btn--ghost">Add Another</button><div id="dep-modal-error" class="dep-error" style="display:none"></div></div><div class="dep-modal__footer"><button type="button" id="dep-modal-save" class="dep-btn dep-btn--primary">${labels.save}</button><button type="button" id="dep-modal-cancel" class="dep-btn dep-btn--ghost">${labels.cancel}</button></div>`;
  o.appendChild(m); document.body.appendChild(o);
  const close=()=>{o.classList.remove("dep-modal-overlay--visible"); setTimeout(()=>o.remove(),200);};
  const add=()=>{ const c=$id("dep-modal-rows"), r=document.createElement("div"); r.className="dep-modal__row"; const rem=c.children.length>0; r.innerHTML=`<div class="dep-modal__row-fields"><input class="dep-input dep-modal-fn" placeholder="${labels.firstName}"/><input class="dep-input dep-modal-ln" placeholder="${labels.lastName}"/></div>${rem?'<button type="button" class="dep-modal__row-remove">&times;</button>':''}`; c.appendChild(r); if(rem)r.querySelector(".dep-modal__row-remove").onclick=()=>r.remove(); r.querySelector(".dep-modal-fn").focus(); };
  add(); $id("dep-modal-close").onclick=close; $id("dep-modal-cancel").onclick=close; o.onclick=(e)=>{if(e.target===o)close();}; $id("dep-modal-add-row").onclick=add;
  $id("dep-modal-save").onclick=async()=>{
    const rs=document.querySelectorAll("#dep-modal-rows .dep-modal__row"), err=$id("dep-modal-error"), btn=$id("dep-modal-save"), es=[]; let he=false;
    rs.forEach(r=>{ const f=r.querySelector(".dep-modal-fn").value.trim(), l=r.querySelector(".dep-modal-ln").value.trim(); if(!f||!l){he=true;r.classList.add("dep-modal__row--error");}else{r.classList.remove("dep-modal__row--error");es.push({f,l});} });
    if(he||es.length===0){err.textContent=labels.errRequired; err.style.display="block"; return;}
    err.style.display="none"; btn.disabled=true; btn.textContent=labels.saving;
    let s=0; const nds=[];
    for(const e of es){ try{ const r=await sDep(e.f,e.l); nds.push(r); s++; }catch(ex){} }
    btn.disabled=false; btn.textContent=labels.save;
    if(s>0){ const sel=$id("dep-select"); if(sel){ nds.forEach(d=>{ const opt=document.createElement("option"); opt.value=d.id; opt.textContent=d.full_name; sel.appendChild(opt); if(!window.__depMap)window.__depMap={}; window.__depMap[d.id]=d; }); const l=nds[nds.length-1]; sel.value=l.id; selectedId=l.id; $id("dep-hidden-fn").value=l.first_name; $id("dep-hidden-ln").value=l.last_name; } close(); }
    else { err.textContent=labels.errSave; err.style.display="block"; }
  };
  requestAnimationFrame(()=>o.classList.add("dep-modal-overlay--visible"));
}
function renderW(deps=[]){
  if($id("dep-widget"))return;
  const w=document.createElement("div"); w.id="dep-widget"; w.className="dep-widget";
  if(!loggedIn) w.innerHTML=`<div class="dep-login-msg">${labels.loginRequired}</div>`;
  else {
    let opts=`<option value="" disabled ${!selectedId?'selected':''}>${labels.placeholder}</option>`;
    deps.forEach(d=>opts+=`<option value="${d.id}" ${selectedId==d.id?'selected':''}>${d.full_name}</option>`);
    w.innerHTML=`<div class="dep-fieldset"><label class="dep-legend">${labels.label}</label><div class="dep-select-row"><select id="dep-select" class="dep-select">${opts}</select><button type="button" id="dep-add-new-btn" class="dep-btn dep-btn--add-new">+ ${labels.addNew}</button></div><input type="hidden" id="dep-hidden-fn" name="properties[Dependant First Name]"/><input type="hidden" id="dep-hidden-ln" name="properties[Dependant Last Name]"/></div>`;
  }
  const inj=()=>{
    const r=$id("dep-block-root"); if(r){r.appendChild(w);return true;}
    const f=document.querySelector('form[action*="/cart/add"], product-form form, .product-form form');
    if(f){ const s=f.querySelector('button[type="submit"], [name="add"], .product-form__submit'); if(s)s.parentNode.insertBefore(w,s); else f.appendChild(w); return true; }
    return false;
  };
  if(inj() && loggedIn) updList(deps);
}
function updList(deps){
  const s=$id("dep-select"), b=$id("dep-add-new-btn"); if(!s||!b)return;
  const m={}; deps.forEach(d=>m[d.id]=d); window.__depMap=m;
  const update=()=>{ const d=m[s.value]||{first_name:"",last_name:""}; $id("dep-hidden-fn").value=d.first_name; $id("dep-hidden-ln").value=d.last_name; selectedId=s.value; };
  s.onchange=update; b.onclick=cModal; if(selectedId)update();
}
function updOpts(deps){
  const s=$id("dep-select"); if(!s)return;
  const v=selectedId||s.value; let o=`<option value="" disabled ${!v?'selected':''}>${labels.placeholder}</option>`;
  deps.forEach(d=>o+=`<option value="${d.id}" ${v==d.id?'selected':''}>${d.full_name}</option>`);
  s.innerHTML=o; updList(deps);
}
let rTimeout=null;
async function init(){
  renderW(currentDeps);
  const o=new MutationObserver(()=>{ clearTimeout(rTimeout); rTimeout=setTimeout(()=> { if(!$id("dep-widget"))renderW(currentDeps); },300); });
  o.observe(document.body,{childList:true,subtree:true});
  if(loggedIn&&cid){ try{ const d=await fDeps(); if(d.length>0){ currentDeps=d; updOpts(d); } }catch(e){} }
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init); else init();
})();
