(function(){"use strict";
  var c=window.__DependantConfig;if(!c||c.proxyBase===undefined)return;
  var cid=c.customerId,L=c.loggedIn,B=c.proxyBase.replace(/\/$/,""),i=c.i18n||{};
  i.label=i.label||"Add / Select Your Dependant";i.placeholder=i.placeholder||"— Select a saved dependant —";i.addNew=i.addNew||"Add New Dependant";i.firstName=i.firstName||"First Name";i.lastName=i.lastName||"Last Name";i.save=i.save||"Save & Select";i.cancel=i.cancel||"Cancel";i.saving=i.saving||"Saving…";i.saved=i.saved||"Saved!";i.errRequired=i.errRequired||"Please enter both first and last name.";i.errSave=i.errSave||"Could not save. Please try again.";i.loginRequired=i.loginRequired||"Please log in to select or add a dependant.";
  function $id(id){return document.getElementById(id);}
  function getD(){var f=$id("dep-hidden-fn"),l=$id("dep-hidden-ln");return (f&&f.value&&l&&l.value)?{fn:f.value,ln:l.value}:null;}
  var of=window.fetch;window.fetch=function(){
    var a=arguments,u=a[0];if(u&&typeof u==="string"&&u.indexOf("/cart/add")>-1){
      var d=getD(),o=a[1];if(d&&o&&o.body){try{
          if(typeof o.body==="string"){var b=JSON.parse(o.body);if(!b.properties)b.properties={};b.properties["Dependant First Name"]=d.fn;b.properties["Dependant Last Name"]=d.ln;o.body=JSON.stringify(b);}
          else if(o.body instanceof FormData){o.body.append("properties[Dependant First Name]",d.fn);o.body.append("properties[Dependant Last Name]",d.ln);}
          else if(o.body instanceof URLSearchParams){o.body.append("properties[Dependant First Name]",d.fn);o.body.append("properties[Dependant Last Name]",d.ln);}
        }catch(e){}}}
    return of.apply(window,a);
  };
  var ox=window.XMLHttpRequest.prototype.open;window.XMLHttpRequest.prototype.open=function(m,u){this._u=u;return ox.apply(this,arguments);};
  var os=window.XMLHttpRequest.prototype.send;window.XMLHttpRequest.prototype.send=function(b){
    if(this._u&&this._u.indexOf("/cart/add")>-1){var d=getD();if(d){
        if(typeof b==="string"){try{var j=JSON.parse(b);if(!j.properties)j.properties={};j.properties["Dependant First Name"]=d.fn;j.properties["Dependant Last Name"]=d.ln;b=JSON.stringify(j);}catch(e){if(b.indexOf("=")>-1)b+="&properties[Dependant%20First%20Name]="+encodeURIComponent(d.fn)+"&properties[Dependant%20Last%20Name]="+encodeURIComponent(d.ln);}}
        else if(b instanceof FormData){b.append("properties[Dependant First Name]",d.fn);b.append("properties[Dependant Last Name]",d.ln);}}}
    return os.call(this,b);
  };
  async function sync(){try{var c=await of("/cart.js?t="+Date.now()).then(function(r){return r.json()});if(!c||!c.items)return;
      var r=document.querySelectorAll('.cart-item, .cart-drawer__item, [data-cart-item], .c-cart-item');
      r.forEach(function(el,i){var it=c.items[i];if(it&&it.properties&&it.properties["Dependant First Name"]&&!el.querySelector('.dep-cart-label')){
          var t=el.querySelector('.cart-item__details, .cart-item__info, [data-cart-item-details], .c-cart-item__details')||el;
          var d=document.createElement("div");d.className='dep-cart-label';d.style="font-size:0.8em;color:#666;margin:4px 0;display:block;font-weight:500;";
          d.innerHTML='<span style="color:#000">Dependant:</span> '+it.properties["Dependant First Name"]+' '+it.properties["Dependant Last Name"];t.appendChild(d);}});}catch(e){}}
  var tm=null,ob=new MutationObserver(function(){clearTimeout(tm);tm=setTimeout(sync,300);});ob.observe(document.body,{childList:true,subtree:true});
  async function fDeps(){var r=await of(B+"/api/dependant?customerId="+encodeURIComponent(cid)).then(function(res){return res.json()});return r||[];}
  async function sDep(f,l){var r=await of(B+"/api/dependant",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({firstName:f,lastName:l,customerId:cid})}).then(function(res){return res.json()});if(r.error)throw new Error(r.error);return r;}
  function buildWidget(deps){
    var s = '<select id="dep-select" class="dep-select"><option value="" disabled selected>' + i.placeholder + '</option>';
    deps.forEach(function(d){
      s += '<option value="' + d.id + '">' + d.full_name + '</option>';
    });
    s += '<option value="__add_new__">+ ' + i.addNew + '</option></select>';

    var f = '<div id="dep-new-form" class="dep-new-form" style="display:none;">'
      + '<div class="dep-row">'
      +   '<div class="dep-field"><label class="dep-label">' + i.firstName + '</label><input id="dep-first" class="dep-input" placeholder="' + i.firstName + '"/></div>'
      +   '<div class="dep-field"><label class="dep-label">' + i.lastName + '</label><input id="dep-last" class="dep-input" placeholder="' + i.lastName + '"/></div>'
      + '</div>'
      + '<div id="dep-error" class="dep-error" style="display:none"></div>'
      + '<div class="dep-actions">'
      +   '<button id="dep-save-btn" class="dep-btn dep-btn--primary" type="button">' + i.save + '</button>'
      +   '<button id="dep-cancel-btn" class="dep-btn dep-btn--ghost" type="button">' + i.cancel + '</button>'
      + '</div></div>';

    var h = '<input type="hidden" id="dep-hidden-fn" name="properties[Dependant First Name]"/>'
      + '<input type="hidden" id="dep-hidden-ln" name="properties[Dependant Last Name]"/>';

    var w = document.createElement("div");
    w.id = "dep-widget";
    w.className = "dep-widget";

    if(!L){
      console.log("[Dependant] Not logged in, showing message");
      w.innerHTML = '<div class="dep-login-msg">' + i.loginRequired + '</div>';
      return w;
    }

    w.innerHTML = '<div class="dep-fieldset"><label class="dep-legend">' + i.label + '</label>' + s + f + h + '</div>';
    return w;
  }
  function wire(deps){
    var m={};deps.forEach(function(d){m[d.id]=d;});var sl=$id("dep-select");if(!sl)return;
    sl.addEventListener("change",function(){var v=sl.value;if(v==="__add_new__"){$id("dep-new-form").style.display="block";$id("dep-first").focus();$id("dep-hidden-fn").value="";$id("dep-hidden-ln").value="";}
      else{$id("dep-new-form").style.display="none";var d=m[v]||{first_name:"",last_name:""};$id("dep-hidden-fn").value=d.first_name;$id("dep-hidden-ln").value=d.last_name;}});
    $id("dep-save-btn").onclick=async function(){var f=$id("dep-first").value.trim(),l=$id("dep-last").value.trim();if(!f||!l){$id("dep-error").textContent=i.errRequired;$id("dep-error").style.display="block";return;}
      this.disabled=true;try{var e=await sDep(f,l),o=document.createElement("option");o.value=e.id;o.textContent=e.full_name;sl.insertBefore(o,sl.querySelector('[value="__add_new__"]'));
        m[e.id]=e;sl.value=e.id;$id("dep-hidden-fn").value=e.first_name;$id("dep-hidden-ln").value=e.last_name;$id("dep-new-form").style.display="none";$id("dep-first").value="";$id("dep-last").value="";
      }catch(err){$id("dep-error").textContent=i.errSave;$id("dep-error").style.display="block";}finally{this.disabled=false;}};
    $id("dep-cancel-btn").onclick=function(){$id("dep-new-form").style.display="none";sl.value="";$id("dep-hidden-fn").value="";$id("dep-hidden-ln").value="";};}
  function find(){
    const selectors = [
      'form[action="/cart/add"]',
      'form[action$="/cart/add"]',
      '.product-form',
      '[data-product-form]',
      'form[action="/cart/add"]:not([data-type="add-to-cart-form"])', // Specific for some themes
      '.shopify-product-form'
    ];
    for (const selector of selectors) {
      const f = document.querySelector(selector);
      if (f) return f;
    }
    return null;
  }
  function inject(deps){
    // 1. Check for the new Liquid Block root FIRST
    var blockRoot = $id("dep-block-root");
    if(blockRoot) {
      if(blockRoot.querySelector('#dep-widget')) return; // Avoid double injection
      var w = buildWidget(deps);
      blockRoot.appendChild(w);
      if(L) wire(deps);
      console.log("[Dependant] Injected into Block root");
      return;
    }

    // 2. Fallback to automatic injection into product form
    if($id("dep-widget")) return;
    var f = find();
    if(!f){
      console.warn("[Dependant] Product form not found yet");
      return;
    }
    var w = buildWidget(deps);
    if(!w) return;
    
    // Look for various submit button signatures
    var b = f.querySelector('[type="submit"], [name="add"], .product-form__submit, #AddToCart, .add-to-cart, .shopify-payment-button');
    if(b) f.insertBefore(w, b);
    else f.appendChild(w);

    if(L) wire(deps);
    console.log("[Dependant] Injected into Form (Automatic Fallback)");
  }
  async function init(){
    try {
      console.log("[Dependant] Init starting...");
      var d = [];
      if (L && cid) {
        try {
          d = await fDeps();
        } catch (e) {
          console.error("[Dependant] Failed to fetch dependants:", e);
        }
      }
      inject(d);

      var t = 0;
      var o = new MutationObserver(function() {
        if (find() || t++ > 50) {
          if (find()) {
            o.disconnect();
            inject(d);
          }
        }
      });
      o.observe(document.body, { childList: true, subtree: true });
      sync();
    } catch(e) {
      console.error("[Dependant] Init error:", e);
    }
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();
