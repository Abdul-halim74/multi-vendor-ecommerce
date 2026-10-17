/* Bazaarly admin panel — jQuery 3.7 (frontend demo; changes are kept in this browser only) */
$(function () {
  const page = $('body').data('page');
  const esc = s => $('<div>').text(s ?? '').html();
  const IMG = p => '../' + p;   // admin pages live one folder down

  /* ---------- Local persistence of admin changes ---------- */
  const S = (() => { try { return JSON.parse(localStorage.getItem('bz_admin')) || {}; } catch (e) { return {}; } })();
  S.orders = S.orders || {}; S.vendors = S.vendors || {}; S.products = S.products || {}; S.customers = S.customers || {};
  S.newProducts = S.newProducts || []; S.deleted = S.deleted || []; S.paid = S.paid || {}; S.cats = S.cats || []; S.commission = S.commission || {};
  const save = () => { try { localStorage.setItem('bz_admin', JSON.stringify(S)); } catch (e) { /* storage unavailable */ } };
  // (saved changes were already applied in data.js)

  /* ---------- Shared bits ---------- */
  const COLORS = ['#5B3CC4', '#E5384F', '#12925E', '#2A5DB8', '#E07A00', '#8A3FB8', '#0E7A8A', '#B8325A', '#3B4F86', '#6A6F85'];
  const vColor = id => COLORS[Math.max(0, SELLERS.findIndex(s => s.id === id)) % COLORS.length];
  const initials = n => n.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  const pill = s => `<span class="pill s-${s}">${s}</span>`;
  const fmtDate = d => new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  let tt;
  const toast = msg => {
    let $t = $('.toast'); if (!$t.length) $t = $('<div class="toast" role="status" aria-live="polite"></div>').appendTo('body');
    $t.text(msg).addClass('show'); clearTimeout(tt); tt = setTimeout(() => $t.removeClass('show'), 2600);
  };
  const pendingOrders = () => ORDERS.filter(o => o.status === 'pending').length;
  const pendingVendors = () => SELLERS.filter(s => s.status === 'pending').length;
  $('[data-count="orders"]').text(pendingOrders()).prop('hidden', !pendingOrders());
  $('[data-count="vendors"]').text(pendingVendors()).prop('hidden', !pendingVendors());

  // Mobile sidebar
  $('.menu-toggle').on('click', () => { $('.side').addClass('open'); $('<div class="backdrop"></div>').appendTo('body').on('click', closeSide); });
  const closeSide = () => { $('.side').removeClass('open'); $('.backdrop').remove(); };
  // Global search → orders/products
  $('.tsearch').on('submit', function (e) {
    e.preventDefault();
    const q = $(this).find('input').val().trim();
    if (!q) return;
    location.href = /^bz\d+/i.test(q) ? `orders.html?q=${encodeURIComponent(q)}` : `products.html?q=${encodeURIComponent(q)}`;
  });
  $('.notif').on('click', () => toast(`${pendingOrders()} pending orders · ${pendingVendors()} vendor application(s)`));
  $('#logout').on('click', e => { e.preventDefault(); try { sessionStorage.removeItem('bz_admin_login'); } catch (x) {} location.href = 'login.html'; });

  // Escape closes drawers / modals
  const closeOverlay = () => { $('.drawer, .modal, .backdrop').remove(); };
  $(document).on('keydown', e => { if (e.key === 'Escape') { closeOverlay(); closeSide(); } });
  $(document).on('click', '.x, [data-close]', closeOverlay);

  /* ---------- Generic paginated table ---------- */
  function pager($el, total, pageNo, per, onGo) {
    const pages = Math.max(1, Math.ceil(total / per));
    const from = total ? (pageNo - 1) * per + 1 : 0, to = Math.min(total, pageNo * per);
    let btns = `<button type="button" data-p="${pageNo - 1}" ${pageNo === 1 ? 'disabled' : ''} aria-label="Previous page">‹</button>`;
    for (let i = 1; i <= pages; i++) if (pages <= 7 || i === 1 || i === pages || Math.abs(i - pageNo) <= 1) btns += `<button type="button" data-p="${i}" ${i === pageNo ? 'aria-current="true"' : ''}>${i}</button>`;
      else if (Math.abs(i - pageNo) === 2) btns += '<button type="button" disabled>…</button>';
    btns += `<button type="button" data-p="${pageNo + 1}" ${pageNo === pages ? 'disabled' : ''} aria-label="Next page">›</button>`;
    $el.html(`<span>Showing ${from}–${to} of ${total}</span><div class="pbtns">${btns}</div>`);
    $el.off('click').on('click', 'button[data-p]:not([disabled])', function () { onGo(+$(this).data('p')); });
  }

  // Revenue only counts orders that weren't cancelled or returned
  const counted = o => !['cancelled', 'returned'].includes(o.status);

  /* ================= DASHBOARD ================= */
  if (page === 'dashboard') {
    const oct = ORDERS.filter(o => o.date.startsWith('2026-10'));
    const rev = oct.filter(counted).reduce((a, o) => a + o.total, 0);
    const active = SELLERS.filter(s => s.status === 'active').length;
    $('#kpis').html([
      ['💰', '#EFEAFF', taka(rev), 'Revenue this month', '+12.4%', 'up'],
      ['🧾', '#E3EEFF', oct.length, 'Orders this month', '+8.1%', 'up'],
      ['🏪', '#E3F6EC', `${active}`, `Active vendors · ${pendingVendors()} pending`, '+2', 'up'],
      ['👥', '#FFF4D6', CUSTOMERS.length, 'Customers', '−1.3%', 'down'],
    ].map(([ic, bg, v, l, t, d]) => `<div class="card kpi"><span class="ic" style="background:${bg}" aria-hidden="true">${ic}</span><div><b>${v}</b><small>${l}</small> <span class="trend ${d}">${t}</span></div></div>`).join(''));

    // Sales for the last 14 days
    const days = [...Array(14)].map((_, i) => { const d = new Date('2026-10-17'); d.setDate(d.getDate() - 13 + i); return d.toISOString().slice(0, 10); });
    const byDay = days.map(d => ORDERS.filter(o => o.date === d && counted(o)).reduce((a, o) => a + o.total, 0));
    const cntDay = days.map(d => ORDERS.filter(o => o.date === d).length);
    const dark = matchMedia('(prefers-color-scheme: dark)').matches;
    const grid = dark ? '#2A2D3D' : '#EEF0F6', tick = dark ? '#9EA2B8' : '#6A6F85';
    if (window.Chart) {
      Chart.defaults.font.family = '"DM Sans", system-ui, sans-serif';
      new Chart($('#sales')[0], {
        type: 'bar',
        data: { labels: days.map(d => new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })),
          datasets: [{ type: 'line', label: 'Orders', data: cntDay, yAxisID: 'y1', borderColor: '#FF9F1C', backgroundColor: '#FF9F1C', tension: .35, pointRadius: 3 },
                     { label: 'Revenue (৳)', data: byDay, backgroundColor: '#5B3CC4', borderRadius: 6, maxBarThickness: 26 }] },
        options: { maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
          plugins: { legend: { labels: { color: tick, usePointStyle: true } }, tooltip: { callbacks: { label: c => c.dataset.yAxisID === 'y1' ? ` ${c.raw} orders` : ` ${taka(c.raw)}` } } },
          scales: { x: { grid: { display: false }, ticks: { color: tick } }, y: { grid: { color: grid }, ticks: { color: tick, callback: v => '৳' + (v / 1000) + 'k' } },
                    y1: { position: 'right', grid: { display: false }, ticks: { color: tick, precision: 0 } } } },
      });
      const sts = ['delivered', 'shipped', 'processing', 'pending', 'cancelled', 'returned'];
      new Chart($('#status-chart')[0], {
        type: 'doughnut',
        data: { labels: sts.map(s => s[0].toUpperCase() + s.slice(1)), datasets: [{ data: sts.map(s => ORDERS.filter(o => o.status === s).length),
          backgroundColor: ['#12925E', '#2A5DB8', '#5B3CC4', '#E0A800', '#D93650', '#F08A9C'], borderWidth: 0 }] },
        options: { maintainAspectRatio: false, cutout: '68%', plugins: { legend: { position: 'right', labels: { color: tick, usePointStyle: true, boxWidth: 8 } } } },
      });
    } else {
      $('.chart-box').html('<p class="muted">Charts need an internet connection (Chart.js CDN).</p>');
    }

    const recent = ORDERS.slice(0, 7);
    $('#recent').html(recent.map(o => `<tr class="click" data-id="${o.id}"><td><b>${o.id}</b></td><td>${esc(customerById(o.customer).name)}</td><td>${fmtDate(o.date)}</td><td class="num">${taka(o.total)}</td><td>${pill(o.status)}</td></tr>`).join(''));
    $('#recent').on('click', 'tr', function () { location.href = `orders.html?open=${$(this).data('id')}`; });

    const sold = {};
    ORDERS.filter(counted).forEach(o => o.items.forEach(i => { sold[i.pid] = (sold[i.pid] || 0) + i.qty * i.price; }));
    $('#top').html(Object.entries(sold).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([pid, v]) => {
      const p = productById(pid); if (!p) return '';
      return `<div class="mini-line"><img src="${IMG(p.img)}" alt=""><span class="sp"><b>${esc(p.name)}</b><small>${esc(sellerById(p.seller).name)}</small></span><b>${taka(v)}</b></div>`;
    }).join(''));
    const pend = SELLERS.filter(s => s.status === 'pending');
    $('#pending-v').html(pend.length ? pend.map(s => `<div class="mini-line"><span class="ava" style="background:${vColor(s.id)}">${initials(s.name)}</span><span class="sp"><b>${esc(s.name)}</b><small>${esc(s.city)} · applied ${s.joined}</small></span><a class="btn btn-sm btn-g" href="vendors.html?tab=pending">Review</a></div>`).join('')
      : '<p class="muted">No applications waiting.</p>');
    const low = PRODUCTS.filter(p => p.stock < 10).slice(0, 5);
    $('#low-stock').html(low.map(p => `<div class="mini-line"><img src="${IMG(p.img)}" alt=""><span class="sp"><b>${esc(p.name)}</b><small>${esc(sellerById(p.seller).name)}</small></span>${pill(p.stock ? 'low' : 'out')}<b style="width:2.5rem;text-align:right">${p.stock}</b></div>`).join(''));
  }

  /* ================= ORDERS ================= */
  if (page === 'orders') {
    const params = new URLSearchParams(location.search);
    let tab = 'all', q = params.get('q') || '', pay = '', pg = 1;
    const PER = 10;
    $('#o-q').val(q);
    const TABS = ['all', 'pending', 'processing', 'shipped', 'delivered', 'cancelled', 'returned'];
    function renderTabs() {
      $('#o-tabs').html(TABS.map(t => `<button type="button" role="tab" data-t="${t}" aria-selected="${t === tab}">${t[0].toUpperCase() + t.slice(1)}<span>${t === 'all' ? ORDERS.length : ORDERS.filter(o => o.status === t).length}</span></button>`).join(''));
    }
    const filtered = () => ORDERS.filter(o => (tab === 'all' || o.status === tab) && (!pay || o.payment === pay)
      && (!q || (o.id + ' ' + customerById(o.customer).name + ' ' + o.city).toLowerCase().includes(q.toLowerCase())));
    function render() {
      renderTabs();
      const list = filtered(), rows = list.slice((pg - 1) * PER, pg * PER);
      $('#o-body').html(rows.length ? rows.map(o => {
        const c = customerById(o.customer), vendors = [...new Set(o.items.map(i => i.seller))];
        return `<tr class="click" data-id="${o.id}"><td><b>${o.id}</b></td><td>${fmtDate(o.date)}</td><td>${esc(c.name)}<br><small class="muted">${esc(o.city)}</small></td>
          <td>${o.items.reduce((a, i) => a + i.qty, 0)} item(s)<br><small class="muted">${vendors.length} vendor${vendors.length > 1 ? 's' : ''}</small></td>
          <td>${esc(o.payment)}</td><td class="num">${taka(o.total)}</td><td>${pill(o.status)}</td></tr>`;
      }).join('') : '<tr class="empty-row"><td colspan="7">No orders match these filters.</td></tr>');
      pager($('#o-pager'), list.length, pg, PER, p => { pg = p; render(); });
    }
    $('#o-tabs').on('click', 'button', function () { tab = $(this).data('t'); pg = 1; render(); });
    $('#o-q').on('input', function () { q = this.value; pg = 1; render(); });
    $('#o-pay').on('change', function () { pay = this.value; pg = 1; render(); });
    $('#o-body').on('click', 'tr.click', function () { openOrder($(this).data('id')); });
    $('#o-export').on('click', () => {
      const rows = [['Order', 'Date', 'Customer', 'City', 'Payment', 'Total', 'Status']].concat(filtered().map(o => [o.id, o.date, customerById(o.customer).name, o.city, o.payment, o.total, o.status]));
      const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = 'bazaarly-orders.csv'; a.click();
      toast(`Exported ${rows.length - 1} orders.`);
    });

    const FLOW = ['pending', 'processing', 'shipped', 'delivered'];
    function openOrder(id) {
      const o = ORDERS.find(x => x.id === id); if (!o) return;
      const c = customerById(o.customer);
      const bySeller = {};
      o.items.forEach(i => (bySeller[i.seller] = bySeller[i.seller] || []).push(i));
      const stepIdx = FLOW.indexOf(o.status);
      closeOverlay();
      $('body').append(`<div class="backdrop" data-close></div><aside class="drawer" role="dialog" aria-modal="true" aria-label="Order ${o.id}">
        <div class="drawer-h"><h2>Order ${o.id}</h2>${pill(o.status)}<button class="ibtn x" type="button" aria-label="Close">✕</button></div>
        <div class="drawer-b">
          <dl class="kv"><dt>Customer</dt><dd>${esc(c.name)}</dd><dt>Phone</dt><dd>${c.phone}</dd><dt>City</dt><dd>${esc(o.city)}</dd>
            <dt>Placed</dt><dd>${fmtDate(o.date)}</dd><dt>Payment</dt><dd>${esc(o.payment)}</dd></dl>
          <div><h3 style="font-size:.95rem;margin-bottom:.4rem">Items by vendor</h3>
          ${Object.keys(bySeller).map(sid => `<p class="muted" style="margin-top:.6rem;font-weight:700">${esc(sellerById(sid).name)}</p>` + bySeller[sid].map(i => {
            const p = productById(i.pid);
            return `<div class="mini-line">${p ? `<img src="${IMG(p.img)}" alt="">` : ''}<span class="sp">${esc(p ? p.name : i.pid)}<small>${taka(i.price)} × ${i.qty}</small></span><b>${taka(i.price * i.qty)}</b></div>`;
          }).join('')).join('')}
          <dl class="kv" style="margin-top:.8rem"><dt>Subtotal</dt><dd>${taka(o.subtotal)}</dd><dt>Shipping</dt><dd>${o.shipping ? taka(o.shipping) : 'Free'}</dd><dt><b>Total</b></dt><dd><b>${taka(o.total)}</b></dd></dl></div>
          <div><h3 style="font-size:.95rem;margin-bottom:.6rem">Progress</h3>
          ${['cancelled', 'returned'].includes(o.status) ? `<p>${pill(o.status)} This order was ${o.status}.</p>` :
            `<ol class="timeline">${FLOW.map((s, k) => `<li class="${k <= stepIdx ? 'done' : ''}">${s[0].toUpperCase() + s.slice(1)}<small>${k <= stepIdx ? 'Done' : 'Waiting'}</small></li>`).join('')}</ol>`}</div>
          <label class="field">Update status<select id="d-status">${['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'returned'].map(s => `<option ${s === o.status ? 'selected' : ''}>${s}</option>`).join('')}</select></label>
        </div>
        <div class="drawer-f"><button class="btn btn-g" type="button" id="d-print">Print invoice</button><button class="btn btn-p" type="button" id="d-save">Save status</button></div></aside>`);
      $('.drawer .x').trigger('focus');
      $('#d-save').on('click', () => {
        o.status = $('#d-status').val(); S.orders[o.id] = o.status; save();
        toast(`Order ${o.id} marked ${o.status}.`); closeOverlay(); render();
        $('[data-count="orders"]').text(pendingOrders()).prop('hidden', !pendingOrders());
      });
      $('#d-print').on('click', () => window.print());
    }
    render();
    if (params.get('open')) openOrder(params.get('open'));
  }

  /* ================= PRODUCTS ================= */
  if (page === 'products') {
    const params = new URLSearchParams(location.search);
    let q = params.get('q') || '', cat = params.get('cat') || '', seller = params.get('seller') || '', stock = '', pg = 1;
    const PER = 10;
    $('#p-q').val(q);
    $('#p-cat').append(CATEGORIES.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('')).val(cat);
    $('#p-seller').append(SELLERS.map(s => `<option value="${s.id}">${esc(s.name)}</option>`).join('')).val(seller);
    const list = () => PRODUCTS.filter(p => (!cat || p.cat === cat) && (!seller || p.seller === seller)
      && (!stock || (stock === 'out' ? p.stock === 0 : stock === 'low' ? p.stock > 0 && p.stock < 10 : p.stock >= 10))
      && (!q || (p.name + ' ' + p.brand).toLowerCase().includes(q.toLowerCase())));
    function render() {
      const all = list(), rows = all.slice((pg - 1) * PER, pg * PER);
      $('#p-body').html(rows.length ? rows.map(p => {
        const s = sellerById(p.seller), st = p.stock === 0 ? 'out' : p.stock < 10 ? 'low' : 'in';
        return `<tr data-id="${p.id}"><td><div class="prod-cell"><img src="${IMG(p.img)}" alt=""><span><b title="${esc(p.name)}">${esc(p.name)}</b><small>${esc(p.brand)} · ${esc(catById(p.cat)?.name || p.cat)}</small></span></div></td>
          <td>${esc(s ? s.name : p.seller)}</td><td class="num">${taka(p.price)}${p.old > p.price ? `<br><small class="muted"><s>${taka(p.old)}</s></small>` : ''}</td>
          <td class="num">${p.stock} ${pill(st === 'in' ? 'in' : st)}</td><td class="num">${p.sold.toLocaleString('en-IN')}</td>
          <td><label class="switch" title="Visible in store"><input type="checkbox" class="vis" ${p.status === 'active' ? 'checked' : ''} aria-label="Show ${esc(p.name)} in store"><span></span></label></td>
          <td style="white-space:nowrap"><button class="btn btn-sm btn-g edit" type="button">Edit</button> <button class="btn btn-sm btn-bad del" type="button" aria-label="Delete ${esc(p.name)}">Delete</button></td></tr>`;
      }).join('') : '<tr class="empty-row"><td colspan="7">No products match these filters.</td></tr>');
      pager($('#p-pager'), all.length, pg, PER, p => { pg = p; render(); });
      $('#p-total').text(`${PRODUCTS.length} products · ${PRODUCTS.filter(p => p.status === 'active').length} visible`);
    }
    $('#p-q').on('input', function () { q = this.value; pg = 1; render(); });
    $('#p-cat').on('change', function () { cat = this.value; pg = 1; render(); });
    $('#p-seller').on('change', function () { seller = this.value; pg = 1; render(); });
    $('#p-stock').on('change', function () { stock = this.value; pg = 1; render(); });
    $('#p-body').on('change', '.vis', function () {
      const p = productById($(this).closest('tr').data('id'));
      p.status = this.checked ? 'active' : 'hidden'; S.products[p.id] = { ...(S.products[p.id] || {}), status: p.status }; save();
      toast(`${p.name} is now ${this.checked ? 'visible' : 'hidden'} in the store.`); render();
    }).on('click', '.edit', function () { openForm(productById($(this).closest('tr').data('id'))); })
      .on('click', '.del', function () {
        const p = productById($(this).closest('tr').data('id'));
        if (!confirm(`Delete “${p.name}”? This can’t be undone in the demo.`)) return;
        PRODUCTS.splice(PRODUCTS.indexOf(p), 1); S.deleted.push(p.id); S.newProducts = S.newProducts.filter(x => x.id !== p.id); save();
        toast('Product deleted.'); render();
      });
    $('#p-add').on('click', () => openForm(null));

    function openForm(p) {
      closeOverlay();
      const v = p || { name: '', cat: CATEGORIES[0].id, seller: SELLERS[0].id, brand: '', price: '', old: '', stock: 10 };
      $('body').append(`<div class="backdrop" data-close></div><div class="modal" role="dialog" aria-modal="true" aria-label="${p ? 'Edit' : 'Add'} product"><div class="box">
        <div class="drawer-h"><h2>${p ? 'Edit product' : 'Add product'}</h2><button class="ibtn x" type="button" aria-label="Close">✕</button></div>
        <form id="p-form"><div class="fgrid">
          <label class="field full">Product name<input name="name" required value="${esc(v.name)}"></label>
          <label class="field">Category<select name="cat">${CATEGORIES.map(c => `<option value="${c.id}" ${c.id === v.cat ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></label>
          <label class="field">Vendor<select name="seller">${SELLERS.map(s => `<option value="${s.id}" ${s.id === v.seller ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select></label>
          <label class="field">Brand<input name="brand" value="${esc(v.brand)}"></label>
          <label class="field">Stock<input name="stock" type="number" min="0" required value="${v.stock}"></label>
          <label class="field">Price (৳)<input name="price" type="number" min="1" required value="${v.price}"></label>
          <label class="field">Regular price (৳)<input name="old" type="number" min="0" value="${v.old}"><small>Shown crossed out when higher than price</small></label>
        </div>
        <div style="display:flex;gap:.6rem;justify-content:flex-end"><button class="btn btn-g" type="button" data-close>Cancel</button><button class="btn btn-p" type="submit">${p ? 'Save changes' : 'Add product'}</button></div></form></div></div>`);
      $('#p-form input[name=name]').trigger('focus');
      $('#p-form').on('submit', function (e) {
        e.preventDefault();
        const f = Object.fromEntries(new FormData(this));
        const data = { name: f.name.trim(), cat: f.cat, seller: f.seller, brand: f.brand.trim() || 'Generic', price: +f.price, old: +f.old || +f.price, stock: +f.stock };
        if (p) { Object.assign(p, data); S.products[p.id] = { ...(S.products[p.id] || {}), ...data }; const n = S.newProducts.find(x => x.id === p.id); if (n) Object.assign(n, data); }
        else {
          const np = { id: 'new-' + Date.now(), ...data, rating: 0, reviews: 0, sold: 0, img: 'images/products/daily-planner-notebook-2027.svg', gallery: ['images/products/daily-planner-notebook-2027.svg'],
            flash: false, freeShip: data.price > 1500, cod: true, variant: null, status: 'active', added: '2026-10-17' };
          PRODUCTS.unshift(np); S.newProducts.unshift(np);
        }
        save(); closeOverlay(); toast(p ? 'Product updated.' : 'Product added.'); pg = 1; render();
      });
    }
    render();
  }

  /* ================= VENDORS ================= */
  if (page === 'vendors') {
    const params = new URLSearchParams(location.search);
    let tab = params.get('tab') || 'all', q = '';
    const sales = id => ORDERS.filter(counted).reduce((a, o) => a + o.items.filter(i => i.seller === id).reduce((x, i) => x + i.qty * i.price, 0), 0);
    function render() {
      $('#v-tabs').html(['all', 'active', 'pending', 'suspended'].map(t => `<button type="button" role="tab" data-t="${t}" aria-selected="${t === tab}">${t[0].toUpperCase() + t.slice(1)}<span>${t === 'all' ? SELLERS.length : SELLERS.filter(s => s.status === t).length}</span></button>`).join(''));
      const list = SELLERS.filter(s => (tab === 'all' || s.status === tab) && s.name.toLowerCase().includes(q.toLowerCase()));
      $('#v-grid').html(list.length ? list.map(s => `<article class="card vcard" data-id="${s.id}">
        <div class="top"><span class="ava" style="background:${vColor(s.id)}">${initials(s.name)}</span><div style="flex:1;min-width:0"><b>${esc(s.name)}</b>${s.mall ? ' <span class="pill s-processing">Mall</span>' : ''}<br><small class="muted">${esc(s.city)} · joined ${s.joined}</small></div>${pill(s.status)}</div>
        <div class="stats"><span><b>${s.products}</b><small>Products</small></span><span><b>${taka(sales(s.id))}</b><small>Sales</small></span><span><b>${s.positive}%</b><small>Rating</small></span></div>
        <div class="toggle-row" style="padding:.2rem 0;border:0"><span>Commission</span><span><input class="comm" type="number" min="0" max="50" value="${s.commission}" aria-label="Commission percent for ${esc(s.name)}" style="width:64px;border:1px solid var(--line);border-radius:7px;padding:.25rem .4rem;background:var(--bg)"> %</span></div>
        <div class="acts">${s.status === 'pending' ? `<button class="btn btn-sm btn-ok approve" type="button">Approve</button><button class="btn btn-sm btn-bad reject" type="button">Reject</button>`
          : s.status === 'active' ? `<button class="btn btn-sm btn-bad suspend" type="button">Suspend</button>` : `<button class="btn btn-sm btn-ok approve" type="button">Reactivate</button>`}
          <a class="btn btn-sm btn-g" href="products.html?seller=${s.id}">Products</a><a class="btn btn-sm btn-g" href="../store.html?seller=${s.id}" target="_blank" rel="noopener">View store</a></div></article>`).join('')
        : '<p class="muted">No vendors in this list.</p>');
    }
    const setStatus = (el, st, msg) => {
      const s = sellerById($(el).closest('.vcard').data('id')); s.status = st; S.vendors[s.id] = st; save();
      toast(`${s.name} ${msg}.`); render(); $('[data-count="vendors"]').text(pendingVendors()).prop('hidden', !pendingVendors());
    };
    $('#v-tabs').on('click', 'button', function () { tab = $(this).data('t'); render(); });
    $('#v-q').on('input', function () { q = this.value; render(); });
    $('#v-grid').on('click', '.approve', function () { setStatus(this, 'active', 'is now active'); })
      .on('click', '.suspend', function () { if (confirm('Suspend this vendor? Their products will stop showing in the store.')) setStatus(this, 'suspended', 'was suspended'); })
      .on('click', '.reject', function () { setStatus(this, 'suspended', 'application was rejected'); })
      .on('change', '.comm', function () { const s = sellerById($(this).closest('.vcard').data('id')); s.commission = +this.value; S.commission[s.id] = s.commission; save(); toast(`Commission for ${s.name} set to ${s.commission}%.`); });
    render();
  }

  /* ================= CUSTOMERS ================= */
  if (page === 'customers') {
    let q = '', pg = 1; const PER = 10;
    function render() {
      const list = CUSTOMERS.filter(c => (c.name + ' ' + c.email + ' ' + c.phone + ' ' + c.city).toLowerCase().includes(q.toLowerCase()));
      const rows = list.slice((pg - 1) * PER, pg * PER);
      $('#c-body').html(rows.length ? rows.map(c => `<tr data-id="${c.id}"><td><div class="prod-cell" style="min-width:180px"><span class="ava" style="background:${COLORS[+c.id.slice(1) % COLORS.length]};border-radius:50%">${initials(c.name)}</span><span><b>${esc(c.name)}</b><small>${c.id}</small></span></div></td>
        <td>${esc(c.email)}<br><small class="muted">${c.phone}</small></td><td>${esc(c.city)}</td><td class="num">${c.orders}</td><td class="num">${taka(c.spent)}</td><td>${fmtDate(c.joined)}</td><td>${pill(c.status)}</td>
        <td><button class="btn btn-sm ${c.status === 'active' ? 'btn-bad' : 'btn-g'} blk" type="button">${c.status === 'active' ? 'Block' : 'Unblock'}</button></td></tr>`).join('')
        : '<tr class="empty-row"><td colspan="8">No customers match your search.</td></tr>');
      pager($('#c-pager'), list.length, pg, PER, p => { pg = p; render(); });
    }
    $('#c-q').on('input', function () { q = this.value; pg = 1; render(); });
    $('#c-body').on('click', '.blk', function () {
      const c = customerById($(this).closest('tr').data('id')); c.status = c.status === 'active' ? 'blocked' : 'active'; S.customers[c.id] = c.status; save();
      toast(`${c.name} ${c.status === 'blocked' ? 'blocked' : 'unblocked'}.`); render();
    });
    render();
  }

  /* ================= CATEGORIES ================= */
  if (page === 'categories') {
    function render() {
      const max = Math.max(...CATEGORIES.map(c => PRODUCTS.filter(p => p.cat === c.id).length), 1);
      $('#cat-list').html(CATEGORIES.map(c => { const n = PRODUCTS.filter(p => p.cat === c.id).length;
        return `<div class="cat-row"><span class="ic" aria-hidden="true">${c.icon}</span><span class="nm">${esc(c.name)}<br><small class="muted">/${c.id}</small></span>
          <span class="bar" aria-hidden="true"><i style="width:${n / max * 100}%"></i></span><span style="width:6rem;text-align:right">${n} products</span>
          <a class="btn btn-sm btn-g" href="products.html?cat=${c.id}">View</a></div>`; }).join(''));
    }
    $('#cat-form').on('submit', function (e) {
      e.preventDefault();
      const name = $('#cat-name').val().trim(), icon = $('#cat-icon').val().trim() || '🏷️';
      const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      if (CATEGORIES.find(c => c.id === id)) { toast('A category with that name already exists.'); return; }
      const c = { id, name, icon }; CATEGORIES.push(c); S.cats.push(c); save(); this.reset(); toast(`Category “${name}” added.`); render();
    });
    render();
  }

  /* ================= PAYOUTS ================= */
  if (page === 'payouts') {
    function render() {
      const rows = SELLERS.filter(s => s.status !== 'pending').map(s => {
        const gross = ORDERS.filter(o => o.status === 'delivered').reduce((a, o) => a + o.items.filter(i => i.seller === s.id).reduce((x, i) => x + i.qty * i.price, 0), 0);
        const comm = Math.round(gross * s.commission / 100);
        return { s, gross, comm, net: gross - comm, paid: !!S.paid[s.id] };
      });
      const due = rows.filter(r => !r.paid).reduce((a, r) => a + r.net, 0);
      $('#pay-kpis').html([['Delivered sales', taka(rows.reduce((a, r) => a + r.gross, 0))], ['Commission earned', taka(rows.reduce((a, r) => a + r.comm, 0))], ['Payable to vendors', taka(due)]]
        .map(([l, v]) => `<div class="card kpi"><div><small>${l}</small><b>${v}</b></div></div>`).join(''));
      $('#pay-body').html(rows.map(r => `<tr data-id="${r.s.id}"><td><div class="prod-cell" style="min-width:180px"><span class="ava" style="background:${vColor(r.s.id)}">${initials(r.s.name)}</span><b>${esc(r.s.name)}</b></div></td>
        <td class="num">${taka(r.gross)}</td><td class="num">${r.s.commission}%</td><td class="num">${taka(r.comm)}</td><td class="num"><b>${taka(r.net)}</b></td>
        <td>${pill(r.paid ? 'paid' : 'due')}</td><td>${r.paid ? `<span class="muted">Paid ${S.paid[r.s.id]}</span>` : `<button class="btn btn-sm btn-p pay" type="button" ${r.net ? '' : 'disabled'}>Mark paid</button>`}</td></tr>`).join(''));
    }
    $('#pay-body').on('click', '.pay', function () { const id = $(this).closest('tr').data('id'); S.paid[id] = '17 Oct 2026'; save(); toast(`Payout to ${sellerById(id).name} marked as paid.`); render(); });
    $('#pay-reset').on('click', () => { S.paid = {}; save(); render(); toast('Payout cycle reset.'); });
    render();
  }

  /* ================= SETTINGS ================= */
  if (page === 'settings') {
    let saved; try { saved = JSON.parse(localStorage.getItem('bz_settings')); } catch (e) { saved = null; }
    if (saved) Object.entries(saved).forEach(([k, v]) => { const $f = $(`#settings [name="${k}"]`); $f.is(':checkbox') ? $f.prop('checked', v) : $f.val(v); });
    $('#settings').on('submit', function (e) {
      e.preventDefault();
      const data = {};
      $(this).find('[name]').each(function () { data[this.name] = $(this).is(':checkbox') ? this.checked : this.value; });
      try { localStorage.setItem('bz_settings', JSON.stringify(data)); } catch (x) { /* storage unavailable */ }
      toast('Settings saved.');
    });
    $('#reset-demo').on('click', () => {
      if (!confirm('Reset all admin changes (orders, vendors, products, payouts) back to the demo data?')) return;
      try { localStorage.removeItem('bz_admin'); localStorage.removeItem('bz_settings'); } catch (x) {}
      location.reload();
    });
  }

  /* ================= LOGIN ================= */
  if (page === 'login') {
    $('#login').on('submit', function (e) { e.preventDefault(); try { sessionStorage.setItem('bz_admin_login', '1'); } catch (x) {} location.href = 'index.html'; });
  }
});
