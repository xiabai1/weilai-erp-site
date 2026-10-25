// 蔚来智居 ERP 产品官网
(function () {
  // ── 站点配置：上线前只改这里 ──
  var CONFIG = {
    // 试用申请提交接口：留空则仅在本机暂存（localStorage），接入后填 POST 地址（JSON）
    formEndpoint: '',
    // 客服电话：页面上所有电话展示都取这里
    phone: '17783935500'
  };

  var note = document.getElementById('trial-note');
  if (note && CONFIG.phone) {
    note.innerHTML = '也可直接致电 <strong>' + CONFIG.phone + '</strong>';
  }

  var yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // 导航滚动加深投影
  var nav = document.getElementById('nav');
  var onScroll = function () {
    nav.classList.toggle('scrolled', window.scrollY > 8);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // 滚动显现（不依赖 IntersectionObserver，保证内容必定显示）
  var revealEls = Array.prototype.slice.call(document.querySelectorAll('.reveal'));
  revealEls.forEach(function (el, i) {
    el.style.transitionDelay = (i % 4) * 60 + 'ms';
  });
  var showReveals = function () {
    var limit = window.innerHeight * 0.94;
    revealEls = revealEls.filter(function (el) {
      if (el.getBoundingClientRect().top < limit) {
        el.classList.add('in');
        return false;
      }
      return true;
    });
  };
  window.addEventListener('scroll', showReveals, { passive: true });
  window.addEventListener('resize', showReveals);
  window.addEventListener('load', showReveals);
  showReveals();

  // 试用表单：优先提交到 CONFIG.formEndpoint；无论是否接入，都先在本机暂存一份，线索不丢
  var form = document.getElementById('trial-form');
  var LEADS_KEY = 'njwz_trial_leads';
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var data = Object.fromEntries(new FormData(form).entries());
      data.ts = new Date().toISOString();

      try {
        var leads = JSON.parse(localStorage.getItem(LEADS_KEY) || '[]');
        leads.push(data);
        localStorage.setItem(LEADS_KEY, JSON.stringify(leads));
      } catch (err) { /* 存储不可用时跳过，不影响提交 */ }

      var savedNote = '<strong>' + data.name + '</strong>，已记录你的申请意向。提交通道接入中，请直接致电页面上的电话。';
      var doneNote = '<strong>' + data.name + '</strong>，已收到你的申请，我们会尽快联系你安排演示。';

      if (!CONFIG.formEndpoint) {
        note.innerHTML = savedNote;
        form.reset();
        return;
      }
      fetch(CONFIG.formEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      }).then(function (res) {
        note.innerHTML = res.ok ? doneNote : savedNote;
        form.reset();
      }).catch(function () {
        note.innerHTML = savedNote;
        form.reset();
      });
    });
  }

  // 下载下拉（挂在触发按钮下方，点空白处/滚动/Esc 关闭）
  var menu = document.getElementById('download-menu');
  var closeTimer = null;
  var openMenu = function (trigger) {
    clearTimeout(closeTimer);
    var r = trigger.getBoundingClientRect();
    menu.hidden = false;
    var w = menu.offsetWidth;
    var left = Math.min(Math.max(12, r.left + r.width / 2 - w / 2), window.innerWidth - w - 12);
    menu.style.left = left + 'px';
    menu.style.top = r.bottom + 10 + 'px';
    void menu.offsetHeight; menu.classList.add('open');
  };
  var closeMenu = function () {
    if (menu.hidden) return;
    clearTimeout(closeTimer);
    menu.classList.remove('open');
    closeTimer = setTimeout(function () {
      if (!menu.classList.contains('open')) menu.hidden = true;
    }, 180);
  };
  document.querySelectorAll('[data-download]').forEach(function (el) {
    el.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      if (!menu.hidden) { closeMenu(); return; }
      openMenu(el);
      // 从手机菜单里触发时,同步收起菜单(触发器的 stopPropagation 会挡住面板的冒泡监听)
      setMobile(false);
    });
  });
  // 移动端菜单（≤860px 出现；链接点击/空白处/Esc 关闭）
  var menuBtn = document.getElementById('menu-btn');
  var mobileMenu = document.getElementById('mobile-menu');
  var setMobile = function (open) {
    if (!menuBtn || !mobileMenu) return;
    if (open === !mobileMenu.hidden && open === menuBtn.classList.contains('open')) return;
    if (open) {
      mobileMenu.hidden = false;
      void mobileMenu.offsetHeight;
      mobileMenu.classList.add('open');
    } else {
      mobileMenu.classList.remove('open');
      setTimeout(function () { if (!mobileMenu.classList.contains('open')) mobileMenu.hidden = true; }, 180);
    }
    menuBtn.classList.toggle('open', open);
    menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    menuBtn.setAttribute('aria-label', open ? '关闭菜单' : '打开菜单');
  };
  if (menuBtn && mobileMenu) {
    menuBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      setMobile(mobileMenu.hidden);
    });
    mobileMenu.addEventListener('click', function (e) {
      if (e.target.closest('a')) setMobile(false);
    });
    document.addEventListener('click', function (e) {
      if (!mobileMenu.hidden && !e.target.closest('#mobile-menu') && !e.target.closest('#menu-btn')) setMobile(false);
    });
  }

  document.addEventListener('click', function (e) {
    if (!menu.hidden && !e.target.closest('#download-menu')) closeMenu();
  });
  window.addEventListener('scroll', closeMenu, { passive: true, capture: true });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { closeMenu(); setMobile(false); }
  });

  // 旧版 Canvas 海面仅作为 sea.js 加载失败时的降级画面。
  var seaCanvas = document.getElementById('sea-canvas');
  if (!window.SeaSceneHandled && seaCanvas && seaCanvas.getContext) {
    var sctx = seaCanvas.getContext('2d');
    var seaW = 0, seaH = 0;
    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var stars = [];
    for (var si = 0; si < 70; si++) {
      stars.push({
        x: Math.random(), y: Math.random() * 0.42,
        r: Math.random() * 1.1 + 0.3,
        a: Math.random() * 0.35 + 0.08,
        tw: Math.random() * 6.28
      });
    }
    var seaResize = function () {
      var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      seaW = seaCanvas.clientWidth;
      seaH = seaCanvas.clientHeight;
      seaCanvas.width = Math.round(seaW * dpr);
      seaCanvas.height = Math.round(seaH * dpr);
      sctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (reduceMotion) drawSea(0);
    };
    var drawSea = function (t) {
      var hz = seaH * 0.56;
      var sky = sctx.createLinearGradient(0, 0, 0, hz);
      sky.addColorStop(0, '#040b1e');
      sky.addColorStop(0.6, '#0a1f44');
      sky.addColorStop(0.88, '#16386b');
      sky.addColorStop(1, '#1e4d82');
      sctx.fillStyle = sky;
      sctx.fillRect(0, 0, seaW, hz + 1);
      for (var k = 0; k < stars.length; k++) {
        var st = stars[k];
        sctx.globalAlpha = st.a * (0.7 + 0.3 * Math.sin(t * 0.6 + st.tw));
        sctx.fillStyle = '#dce9ff';
        sctx.fillRect(st.x * seaW, st.y * seaH, st.r, st.r);
      }
      sctx.globalAlpha = 1;
      var glow = sctx.createRadialGradient(seaW * 0.5, hz, 0, seaW * 0.5, hz, seaW * 0.42);
      glow.addColorStop(0, 'rgba(255, 152, 92, 0.34)');
      glow.addColorStop(0.35, 'rgba(255, 110, 118, 0.12)');
      glow.addColorStop(1, 'rgba(255, 110, 118, 0)');
      sctx.fillStyle = glow;
      sctx.fillRect(0, 0, seaW, hz);
      var seaGrad = sctx.createLinearGradient(0, hz, 0, seaH);
      seaGrad.addColorStop(0, '#175089');
      seaGrad.addColorStop(0.22, '#0e3766');
      seaGrad.addColorStop(1, '#030e26');
      sctx.fillStyle = seaGrad;
      sctx.fillRect(0, hz, seaW, seaH - hz);
      var haze = sctx.createLinearGradient(0, hz - 16, 0, hz + 26);
      haze.addColorStop(0, 'rgba(160, 195, 240, 0)');
      haze.addColorStop(0.5, 'rgba(185, 205, 245, 0.22)');
      haze.addColorStop(1, 'rgba(160, 195, 240, 0)');
      sctx.fillStyle = haze;
      sctx.fillRect(0, hz - 16, seaW, 42);
      for (var i = 0; i < 52; i++) {
        var p = i / 52;
        var y = hz + 4 + Math.pow(p, 1.7) * (seaH - hz - 8);
        var wob = Math.sin(t * 1.3 + i * 1.73) * 0.6 + Math.sin(t * 2.17 + i * 0.83) * 0.4;
        var cx = seaW * 0.5 + wob * (8 + p * 70);
        var half = (18 + p * seaW * 0.2) * (0.55 + 0.45 * Math.sin(t * 1.9 + i * 2.63));
        var a = Math.max(0.02, 0.2 * (1 - p * 0.6));
        sctx.fillStyle = 'rgba(' + (255 - Math.round(120 * p)) + ',' + (185 - Math.round(85 * p)) + ',' + (150 + Math.round(70 * p)) + ',' + a.toFixed(3) + ')';
        sctx.fillRect(cx - half, y, half * 2, 1.4 + p * 2.6);
      }
      for (var wR = 0; wR < 24; wR++) {
        var q = wR / 24;
        var baseY = hz + 12 + Math.pow(q, 1.55) * (seaH - hz - 20);
        var amp = 1.5 + q * 10;
        var speed = 14 + q * 60;
        sctx.beginPath();
        sctx.moveTo(-2, seaH + 60);
        for (var x = 0; x <= seaW + 10; x += 10) {
          var yy = baseY
            + Math.sin(x / (120 - q * 70) + t * speed * 0.016 + wR * 2.1) * amp
            + Math.sin(x / (43 - q * 24) - t * speed * 0.023 + wR) * amp * 0.45;
          sctx.lineTo(x, yy);
        }
        sctx.lineTo(seaW + 2, seaH + 60);
        sctx.closePath();
        sctx.fillStyle = 'rgba(2, 10, 28, ' + (0.08 + q * 0.52).toFixed(3) + ')';
        sctx.fill();
      }
    };
    var seaStart = performance.now();
    var seaLoop = function (now) {
      drawSea((now - seaStart) / 1000);
      if (!reduceMotion) requestAnimationFrame(seaLoop);
    };
    seaResize();
    window.addEventListener('resize', seaResize);
    if (reduceMotion) {
      drawSea(0);
    } else {
      requestAnimationFrame(seaLoop);
    }
  }
})();
