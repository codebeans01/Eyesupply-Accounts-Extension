(function(){"use strict";
  console.log("[Dependant] Script loaded");

  var c = window.__DependantConfig;
  if (!c || c.proxyBase === undefined) {
    console.warn("[Dependant] __DependantConfig not found. App Embed may not be enabled.");
    return;
  }

  var cid = c.customerId, L = c.loggedIn, B = c.proxyBase.replace(/\/$/,""), i = c.i18n || {};
  i.label = i.label || "Add / Select Your Dependant";
  i.placeholder = i.placeholder || "— Select a saved dependant —";
  i.addNew = i.addNew || "Add New Dependant";
  i.firstName = i.firstName || "First Name";
  i.lastName = i.lastName || "Last Name";
  i.save = i.save || "Save & Select";
  i.cancel = i.cancel || "Cancel";
  i.saving = i.saving || "Saving…";
  i.saved = i.saved || "Saved!";
  i.errRequired = i.errRequired || "Please enter both first and last name.";
  i.errSave = i.errSave || "Could not save. Please try again.";
  i.loginRequired = i.loginRequired || "Please log in to select or add a dependant.";

  function $id(id) { return document.getElementById(id); }
  function getD() {
    var f = $id("dep-hidden-fn"), l = $id("dep-hidden-ln");
    return (f && f.value && l && l.value) ? { fn: f.value, ln: l.value } : null;
  }

  // --- Intercept fetch for /cart/add ---
  var of = window.fetch;
  window.fetch = function() {
    var a = arguments, u = a[0];
    if (u && typeof u === "string" && u.indexOf("/cart/add") > -1) {
      var d = getD(), o = a[1];
      if (d && o && o.body) {
        try {
          if (typeof o.body === "string") {
            var b = JSON.parse(o.body);
            if (!b.properties) b.properties = {};
            b.properties["Dependant First Name"] = d.fn;
            b.properties["Dependant Last Name"] = d.ln;
            o.body = JSON.stringify(b);
          } else if (o.body instanceof FormData) {
            o.body.append("properties[Dependant First Name]", d.fn);
            o.body.append("properties[Dependant Last Name]", d.ln);
          } else if (o.body instanceof URLSearchParams) {
            o.body.append("properties[Dependant First Name]", d.fn);
            o.body.append("properties[Dependant Last Name]", d.ln);
          }
        } catch(e) {}
      }
    }
    return of.apply(window, a);
  };

  // --- Intercept XHR for /cart/add ---
  var ox = window.XMLHttpRequest.prototype.open;
  window.XMLHttpRequest.prototype.open = function(m,u) { this._u = u; return ox.apply(this,arguments); };
  var os = window.XMLHttpRequest.prototype.send;
  window.XMLHttpRequest.prototype.send = function(b) {
    if (this._u && this._u.indexOf("/cart/add") > -1) {
      var d = getD();
      if (d) {
        if (typeof b === "string") {
          try {
            var j = JSON.parse(b);
            if (!j.properties) j.properties = {};
            j.properties["Dependant First Name"] = d.fn;
            j.properties["Dependant Last Name"] = d.ln;
            b = JSON.stringify(j);
          } catch(e) {
            if (b.indexOf("=") > -1) b += "&properties[Dependant%20First%20Name]=" + encodeURIComponent(d.fn) + "&properties[Dependant%20Last%20Name]=" + encodeURIComponent(d.ln);
          }
        } else if (b instanceof FormData) {
          b.append("properties[Dependant First Name]", d.fn);
          b.append("properties[Dependant Last Name]", d.ln);
        }
      }
    }
    return os.call(this, b);
  };

  // --- Cart label sync ---
  async function sync() {
    try {
      var c = await of("/cart.js?t=" + Date.now()).then(function(r){ return r.json(); });
      if (!c || !c.items) return;
      var r = document.querySelectorAll('.cart-item, .cart-drawer__item, [data-cart-item], .c-cart-item');
      r.forEach(function(el, idx) {
        var it = c.items[idx];
        if (it && it.properties && it.properties["Dependant First Name"] && !el.querySelector('.dep-cart-label')) {
          var t = el.querySelector('.cart-item__details, .cart-item__info, [data-cart-item-details], .c-cart-item__details') || el;
          var d = document.createElement("div");
          d.className = 'dep-cart-label';
          d.innerHTML = '<span>Dependant:</span> ' + it.properties["Dependant First Name"] + ' ' + it.properties["Dependant Last Name"];
          t.appendChild(d);
        }
      });
    } catch(e) {}
  }
  var tm = null, cartOb = new MutationObserver(function(){ clearTimeout(tm); tm = setTimeout(sync, 300); });
  cartOb.observe(document.body, { childList: true, subtree: true });

  // --- API calls ---
  async function fDeps() {
    try {
      var r = await of(B + "/api/dependant?customerId=" + encodeURIComponent(cid)).then(function(res) {
        if (!res.ok) return [];
        return res.json();
      });
      return Array.isArray(r) ? r.reverse() : [];
    } catch (e) {
      console.error("[Dependant] Failed to fetch dependants:", e);
      return [];
    }
  }

  async function sDep(f, l) {
    var r = await of(B + "/api/dependant", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ firstName: f, lastName: l, customerId: cid })
    }).then(function(res) {
      if (!res.ok) throw new Error("Server error: " + res.status);
      return res.json();
    });
    if (r.error) throw new Error(r.error);
    return r;
  }

  // ========================
  // MODAL — Add New Dependant
  // ========================
  var rowCounter = 0;

  function createModal() {
    // Overlay
    var overlay = document.createElement("div");
    overlay.id = "dep-modal-overlay";
    overlay.className = "dep-modal-overlay";

    // Modal
    var modal = document.createElement("div");
    modal.className = "dep-modal";

    // Header
    modal.innerHTML =
      '<div class="dep-modal__header">' +
        '<h3 class="dep-modal__title">' + i.addNew + '</h3>' +
        '<button class="dep-modal__close" id="dep-modal-close" type="button" aria-label="Close">&times;</button>' +
      '</div>' +
      '<div class="dep-modal__body">' +
        '<div id="dep-modal-rows" class="dep-modal__rows"></div>' +
        '<button type="button" id="dep-modal-add-row" class="dep-btn dep-btn--ghost dep-btn--add-row">' +
          '<span class="dep-btn__icon">+</span> Add Another Dependant' +
        '</button>' +
        '<div id="dep-modal-error" class="dep-error" style="display:none"></div>' +
      '</div>' +
      '<div class="dep-modal__footer">' +
        '<button type="button" id="dep-modal-save" class="dep-btn dep-btn--primary">' + i.save + '</button>' +
        '<button type="button" id="dep-modal-cancel" class="dep-btn dep-btn--ghost">' + i.cancel + '</button>' +
      '</div>';

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // Add first row
    addRow();

    // Events
    $id("dep-modal-close").onclick = closeModal;
    $id("dep-modal-cancel").onclick = closeModal;
    overlay.addEventListener("click", function(e) {
      if (e.target === overlay) closeModal();
    });
    $id("dep-modal-add-row").onclick = function() { addRow(); };
    $id("dep-modal-save").onclick = saveAll;

    // ESC key
    document.addEventListener("keydown", function handler(e) {
      if (e.key === "Escape") {
        closeModal();
        document.removeEventListener("keydown", handler);
      }
    });

    // Animate in
    requestAnimationFrame(function() {
      overlay.classList.add("dep-modal-overlay--visible");
    });
  }

  function addRow() {
    rowCounter++;
    var container = $id("dep-modal-rows");
    if (!container) return;

    var row = document.createElement("div");
    row.className = "dep-modal__row";
    row.dataset.rowId = rowCounter;

    var canRemove = container.children.length > 0;

    row.innerHTML =
      '<div class="dep-modal__row-fields">' +
        '<div class="dep-field">' +
          '<label class="dep-label">' + i.firstName + '</label>' +
          '<input class="dep-input dep-modal-fn" placeholder="' + i.firstName + '" />' +
        '</div>' +
        '<div class="dep-field">' +
          '<label class="dep-label">' + i.lastName + '</label>' +
          '<input class="dep-input dep-modal-ln" placeholder="' + i.lastName + '" />' +
        '</div>' +
      '</div>' +
      (canRemove
        ? '<button type="button" class="dep-modal__row-remove" aria-label="Remove row">&times;</button>'
        : '');

    container.appendChild(row);

    // Remove button handler
    var removeBtn = row.querySelector(".dep-modal__row-remove");
    if (removeBtn) {
      removeBtn.onclick = function() {
        row.classList.add("dep-modal__row--removing");
        setTimeout(function() { row.remove(); }, 200);
      };
    }

    // Focus first input of new row
    row.querySelector(".dep-modal-fn").focus();
  }

  function closeModal() {
    var overlay = $id("dep-modal-overlay");
    if (!overlay) return;
    overlay.classList.remove("dep-modal-overlay--visible");
    setTimeout(function() { overlay.remove(); }, 200);
    rowCounter = 0;
  }

  async function saveAll() {
    var rows = document.querySelectorAll("#dep-modal-rows .dep-modal__row");
    var errorEl = $id("dep-modal-error");
    var saveBtn = $id("dep-modal-save");

    // Collect entries
    var entries = [];
    var hasError = false;
    rows.forEach(function(row) {
      var fn = row.querySelector(".dep-modal-fn").value.trim();
      var ln = row.querySelector(".dep-modal-ln").value.trim();
      if (!fn || !ln) {
        hasError = true;
        row.classList.add("dep-modal__row--error");
      } else {
        row.classList.remove("dep-modal__row--error");
        entries.push({ fn: fn, ln: ln });
      }
    });

    if (hasError || entries.length === 0) {
      errorEl.textContent = i.errRequired;
      errorEl.style.display = "block";
      return;
    }

    errorEl.style.display = "none";
    saveBtn.disabled = true;
    saveBtn.textContent = i.saving;

    var savedCount = 0;
    var failedCount = 0;
    var newDeps = [];

    for (var idx = 0; idx < entries.length; idx++) {
      try {
        var dep = await sDep(entries[idx].fn, entries[idx].ln);
        newDeps.push(dep);
        savedCount++;
      } catch(e) {
        failedCount++;
        console.error("[Dependant] Failed to save:", entries[idx], e);
      }
    }

    saveBtn.disabled = false;
    saveBtn.textContent = i.save;

    if (failedCount > 0) {
      errorEl.textContent = failedCount + " dependant(s) could not be saved. Please try again.";
      errorEl.style.display = "block";
    }

    if (savedCount > 0) {
      // Add new options to the select
      var sl = $id("dep-select");
      if (sl) {
        newDeps.forEach(function(dep) {
          var opt = document.createElement("option");
          opt.value = dep.id;
          opt.textContent = dep.full_name;
          // Insert before the last option or at end
          sl.appendChild(opt);
          // Update internal map
          if (window.__depMap) window.__depMap[dep.id] = dep;
        });

        // Auto-select the last saved one
        var last = newDeps[newDeps.length - 1];
        sl.value = last.id;
        $id("dep-hidden-fn").value = last.first_name;
        $id("dep-hidden-ln").value = last.last_name;
      }

      closeModal();
    }
  }

  // --- Build Widget HTML ---
  function buildWidget(deps) {
    // Select WITHOUT "Add New" as an option
    var s = '<select id="dep-select" class="dep-select">' +
      '<option value="" disabled selected>' + i.placeholder + '</option>';
    deps.forEach(function(d) {
      s += '<option value="' + d.id + '">' + d.full_name + '</option>';
    });
    s += '</select>';

    // "Add New" button — separate from select
    var addBtn = '<button type="button" id="dep-add-new-btn" class="dep-btn dep-btn--add-new">' +
      '<span class="dep-btn__icon">+</span> ' + i.addNew +
    '</button>';

    var h = '<input type="hidden" id="dep-hidden-fn" name="properties[Dependant First Name]"/>' +
      '<input type="hidden" id="dep-hidden-ln" name="properties[Dependant Last Name]"/>';

    var w = document.createElement("div");
    w.id = "dep-widget";
    w.className = "dep-widget";

    if (!L) {
      w.innerHTML = '<div class="dep-login-msg">' + i.loginRequired + '</div>';
      return w;
    }

    w.innerHTML =
      '<div class="dep-fieldset">' +
        '<label class="dep-legend">' + i.label + '</label>' +
        '<div class="dep-select-row">' + s + addBtn + '</div>' +
        h +
      '</div>';
    return w;
  }

  // --- Wire up events ---
  function wire(deps) {
    var m = {};
    deps.forEach(function(d) { m[d.id] = d; });
    window.__depMap = m; // expose for modal to update

    var sl = $id("dep-select");
    if (!sl) return;

    sl.addEventListener("change", function() {
      var v = sl.value;
      var d = m[v] || { first_name: "", last_name: "" };
      $id("dep-hidden-fn").value = d.first_name;
      $id("dep-hidden-ln").value = d.last_name;
    });

    // "Add New" button opens modal
    var addBtn = $id("dep-add-new-btn");
    if (addBtn) {
      addBtn.onclick = function() { createModal(); };
    }
  }

  // --- Find Product Form ---
  function find() {
    var selectors = [
      'form[action*="/cart/add"]',
      'product-form form',
      '.product-form form',
      '.product-form',
      'form.product-form',
      '[data-product-form]',
      '.shopify-product-form',
      '#product-form',
      '#AddToCartForm',
      'form[method="post"][action*="cart"]'
    ];
    for (var idx = 0; idx < selectors.length; idx++) {
      var f = document.querySelector(selectors[idx]);
      if (f) {
        console.log("[Dependant] Form found via:", selectors[idx]);
        return f;
      }
    }
    return null;
  }

  // --- Inject Widget ---
  function inject(deps) {
    if ($id("dep-widget")) return;

    // 1. App Block root
    var blockRoot = $id("dep-block-root");
    if (blockRoot) {
      var w = buildWidget(deps);
      blockRoot.appendChild(w);
      if (L) wire(deps);
      console.log("[Dependant] Injected into App Block root");
      return;
    }

    // 2. Auto-detect
    var f = find();
    if (!f) {
      console.warn("[Dependant] Product form not found");
      return;
    }
    var w = buildWidget(deps);
    if (!w) return;

    var b = f.querySelector(
      'button[type="submit"], [name="add"], .product-form__submit, ' +
      '#AddToCart, .add-to-cart, .shopify-payment-button, .btn--add-to-cart, ' +
      'button.button, [data-add-to-cart]'
    );
    if (b) {
      b.parentNode.insertBefore(w, b);
    } else {
      f.appendChild(w);
    }
    if (L) wire(deps);
    console.log("[Dependant] Injected into product form");
  }

  // --- Init ---
  async function init() {
    try {
      console.log("[Dependant] Init starting...");
      var d = [];
      if (L && cid) {
        d = await fDeps();
        console.log("[Dependant] Fetched", d.length, "dependants");
      }
      inject(d);

      // Watch for dynamic form loading
      var attempts = 0;
      var observer = new MutationObserver(function() {
        if ($id("dep-widget") || attempts++ > 60) { observer.disconnect(); return; }
        if (find() || $id("dep-block-root")) { observer.disconnect(); inject(d); }
      });
      observer.observe(document.body, { childList: true, subtree: true });

      // Retry fallbacks
      setTimeout(function() { if (!$id("dep-widget")) inject(d); }, 1000);
      setTimeout(function() { if (!$id("dep-widget")) inject(d); }, 3000);

      sync();
    } catch(e) {
      console.error("[Dependant] Init error:", e);
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
