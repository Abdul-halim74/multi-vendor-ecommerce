/* Bazaarly storefront — jQuery 3.7 */
$(function () {
  const params = new URLSearchParams(location.search);
  const esc = s => $('<div>').text(s ?? '').html();
  const page = $('body').data('page');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const live = PRODUCTS.filter(isLive);

  /* ---------- Storage helpers (cart, user, orders) ---------- */
  const store = {
    get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } },
  };
  const getCart = () => store.get('bz_cart', []);
  const setCart = c => { store.set('bz_cart', c); updateBadge(); };
  function addToCart(pid, qty = 1, variant = '') {
    const cart = getCart();
    const line = cart.find(l => l.pid === pid && l.variant === variant);
    if (line) line.qty = Math.min(line.qty + qty, 10); else cart.push({ pid, qty, variant, checked: true });
    setCart(cart);
  }
  function updateBadge() {
    const n = getCart().reduce((a, l) => a + l.qty, 0);
    $('.cart-badge').text(n).prop('hidden', n === 0);
  }
  updateBadge();

  let toastTimer;
  function toast(html) {
    let $t = $('.toast');
    if (!$t.length) $t = $('<div class="toast" role="status" aria-live="polite"></div>').appendTo('body');
    $t.html(html).addClass('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => $t.removeClass('show'), 2800);
  }

  /* ---------- Shared UI ---------- */
  const stars = r => '★★★★★'.slice(0, Math.round(r)) + '☆☆☆☆☆'.slice(0, 5 - Math.round(r));
  const COLORS = ['#5B3CC4', '#E5384F', '#12925E', '#2A5DB8', '#E07A00', '#8A3FB8', '#0E7A8A', '#B8325A', '#3B4F86', '#6A6F85'];
  const sellerColor = id => COLORS[SELLERS.findIndex(s => s.id === id) % COLORS.length];
  const initials = n => n.split(' ').map(w => w[0]).slice(0, 2).join('');

  function card(p, opts = {}) {
    const s = sellerById(p.seller), d = discount(p);
    const flashBar = opts.flash ? `<div class="bar" title="${p.sold} sold"><i style="width:${Math.min(95, 20 + (p.sold % 70))}%"></i></div><span class="meta">${p.sold.toLocaleString('en-IN')} sold</span>` : '';
    return `<article class="card">
      <a href="product.html?id=${p.id}" class="thumb">
        <img src="${p.img}" alt="" loading="lazy">
        ${s && s.mall ? '<span class="tag tag-mall">Mall</span>' : ''}
      </a>
      <button class="quick-add" type="button" data-pid="${p.id}" aria-label="Add ${esc(p.name)} to cart">+</button>
      <a href="product.html?id=${p.id}" class="info">
        <span class="name">${esc(p.name)}</span>
        <span class="price">${taka(p.price)}</span>
        ${d ? `<span><span class="old">${taka(p.old)}</span><span class="off">-${d}%</span></span>` : ''}
        ${flashBar || `<span class="meta"><span class="stars" aria-label="${p.rating} out of 5">${stars(p.rating)}</span>(${p.reviews})${p.freeShip ? ' · <span class="chip-free">Free delivery</span>' : ''}</span>`}
      </a>
    </article>`;
  }
  $(document).on('click', '.quick-add', function () {
    const p = productById($(this).data('pid'));
    if (p.variant) { location.href = `product.html?id=${p.id}`; return; }
    if (!p.stock) { toast('This item is out of stock.'); return; }
    addToCart(p.id);
    toast(`Added to cart. <a href="cart.html">View cart</a>`);
  });

  // Category select + nav
  $('.search select').append(CATEGORIES.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join(''));
  $('.catnav .wrap').html(`<a href="products.html">All</a>` + CATEGORIES.map(c =>
    `<a href="products.html?cat=${c.id}" class="${params.get('cat') === c.id ? 'on' : ''}">${esc(c.name)}</a>`).join(''));

  /* ---------- Header search with live suggestions ---------- */
  const $search = $('.search'), $q = $search.find('input'), $sug = $search.find('.suggest');
  $q.val(params.get('q') || '');
  if (params.get('cat')) $search.find('select').val(params.get('cat'));
  let sugIdx = -1;
  $q.on('input focus', function () {
    const t = this.value.trim().toLowerCase();
    if (t.length < 2) { $sug.prop('hidden', true); return; }
    const hits = live.filter(p => (p.name + ' ' + p.brand + ' ' + catById(p.cat).name).toLowerCase().includes(t)).slice(0, 6);
    sugIdx = -1;
    $sug.html(hits.length ? hits.map(p => `<li><a href="product.html?id=${p.id}"><img src="${p.img}" alt=""><span>${esc(p.name)}<small>${esc(catById(p.cat).name)}</small></span><span class="price">${taka(p.price)}</span></a></li>`).join('')
      + `<li><a href="products.html?q=${encodeURIComponent(this.value)}"><span>See all results for “<b>${esc(this.value)}</b>”</span></a></li>`
      : `<li><a href="products.html?q=${encodeURIComponent(this.value)}"><span>No quick match. Search all products for “${esc(this.value)}”</span></a></li>`).prop('hidden', false);
  }).on('keydown', function (e) {
    const $a = $sug.find('a');
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      sugIdx = (sugIdx + (e.key === 'ArrowDown' ? 1 : -1) + $a.length) % $a.length;
      $a.removeClass('on').eq(sugIdx).addClass('on');
    }
    if (e.key === 'Enter' && sugIdx >= 0) { e.preventDefault(); location.href = $a.eq(sugIdx).attr('href'); }
    if (e.key === 'Escape') $sug.prop('hidden', true);
  });
  $(document).on('click', e => { if (!$(e.target).closest('.search').length) $sug.prop('hidden', true); });
  $search.on('submit', function (e) {
    e.preventDefault();
    const u = new URLSearchParams();
    if ($q.val().trim()) u.set('q', $q.val().trim());
    if ($search.find('select').val()) u.set('cat', $search.find('select').val());
    location.href = 'products.html' + (u.toString() ? '?' + u : '');
  });

  /* ================= HOME ================= */
  if (page === 'home') {
    // Hero slider
    const $sl = $('.slider'), $slides = $sl.find('.slides'), $dots = $sl.find('.sl-dots');
    BANNERS.forEach((b, k) => {
      $slides.append(`<a class="slide" href="${b.url}" aria-label="${esc(b.alt)}"><img src="${b.img}" alt="${esc(b.alt)}" ${k ? 'loading="lazy"' : ''}></a>`);
      $dots.append(`<button type="button" aria-label="Banner ${k + 1}"></button>`);
    });
    const $s = $slides.children(), $d = $dots.children();
    let i = 0, t;
    const go = n => {
      i = (n + $s.length) % $s.length;
      $s.removeClass('on').attr({ 'aria-hidden': true, tabindex: -1 }).eq(i).addClass('on').attr({ 'aria-hidden': false, tabindex: 0 });
      $d.removeAttr('aria-current').eq(i).attr('aria-current', 'true');
      clearTimeout(t); if (!reduce) t = setTimeout(() => go(i + 1), 4500);
    };
    $d.on('click', function () { go($(this).index()); });
    $sl.find('.sl-prev').on('click', () => go(i - 1));
    $sl.find('.sl-next').on('click', () => go(i + 1));
    $sl.on('mouseenter', () => clearTimeout(t)).on('mouseleave', () => go(i));
    let x0 = null;
    $sl.on('touchstart', e => { x0 = e.originalEvent.touches[0].clientX; })
       .on('touchend', e => { if (x0 === null) return; const dx = e.originalEvent.changedTouches[0].clientX - x0; if (Math.abs(dx) > 40) go(i + (dx < 0 ? 1 : -1)); x0 = null; });
    go(0);

    $('.cat-side').html(CATEGORIES.map(c => `<li><a href="products.html?cat=${c.id}"><span aria-hidden="true">${c.icon}</span>${esc(c.name)}</a></li>`).join(''));

    // Flash sale countdown — ends at the next midnight
    const end = new Date(); end.setHours(24, 0, 0, 0);
    const tick = () => {
      const s = Math.max(0, Math.floor((end - Date.now()) / 1000));
      const [h, m, sec] = [Math.floor(s / 3600), Math.floor(s % 3600 / 60), s % 60].map(v => String(v).padStart(2, '0'));
      $('.timer').html(`Ending in <span>${h}</span>:<span>${m}</span>:<span>${sec}</span>`);
    };
    tick(); setInterval(tick, 1000);
    $('#flash-grid').html(live.filter(p => p.flash).slice(0, 6).map(p => card(p, { flash: true })).join(''));

    $('#cats').html(CATEGORIES.map(c => `<a href="products.html?cat=${c.id}"><span class="ic" aria-hidden="true">${c.icon}</span>${esc(c.name)}</a>`).join(''));
    $('#malls').html(SELLERS.filter(s => s.mall && s.status === 'active').map(s => `<a class="mall" href="store.html?seller=${s.id}">
      <span class="avatar" style="background:${sellerColor(s.id)}">${initials(s.name)}</span>
      <span><b>${esc(s.name)}</b><small>${s.positive}% positive · ${s.products} products</small></span></a>`).join(''));

    // Just for you with "load more"
    const jfy = live.slice().sort((a, b) => b.sold - a.sold);
    let shown = 0;
    const more = () => {
      $('#jfy').append(jfy.slice(shown, shown + 18).map(p => card(p)).join(''));
      shown += 18;
      $('#load-more').prop('hidden', shown >= jfy.length);
    };
    $('#load-more').on('click', more);
    more();
  }

  /* ================= LISTING ================= */
  if (page === 'listing') {
    const st = {
      q: params.get('q') || '', cat: params.get('cat') || '', seller: params.get('seller') || '',
      min: '', max: '', rating: 0, brands: [], free: false, mall: false, sort: 'best',
    };
    const base = () => live.filter(p => (!st.cat || p.cat === st.cat) && (!st.seller || p.seller === st.seller)
      && (!st.q || (p.name + ' ' + p.brand + ' ' + catById(p.cat).name).toLowerCase().includes(st.q.toLowerCase())));
    const brands = [...new Set(base().map(p => p.brand))].sort();
    $('#f-cats').html(`<label><input type="radio" name="cat" value="" ${!st.cat ? 'checked' : ''}> All categories</label>` +
      CATEGORIES.map(c => `<label><input type="radio" name="cat" value="${c.id}" ${st.cat === c.id ? 'checked' : ''}> ${esc(c.name)}</label>`).join(''));
    $('#f-brands').html(brands.map(b => `<label><input type="checkbox" value="${esc(b)}"> ${esc(b)}</label>`).join('') || '<span class="muted">No brands</span>');

    function render() {
      let list = base().filter(p => (!st.min || p.price >= +st.min) && (!st.max || p.price <= +st.max) && p.rating >= st.rating
        && (!st.brands.length || st.brands.includes(p.brand)) && (!st.free || p.freeShip) && (!st.mall || sellerById(p.seller).mall));
      const sorters = { best: (a, b) => b.sold - a.sold, low: (a, b) => a.price - b.price, high: (a, b) => b.price - a.price, rating: (a, b) => b.rating - a.rating, new: (a, b) => b.added.localeCompare(a.added) };
      list.sort(sorters[st.sort]);
      const title = st.q ? `Results for “${esc(st.q)}”` : st.cat ? esc(catById(st.cat).name) : st.seller ? esc(sellerById(st.seller).name) : 'All products';
      $('.toolbar h1').html(title);
      $('.crumbs .here').html(title);
      $('.toolbar .count').text(`${list.length} item${list.length === 1 ? '' : 's'}`);
      $('#results').html(list.length ? `<div class="grid">${list.map(p => card(p)).join('')}</div>`
        : `<div class="empty"><p>No products match these filters.</p><button class="btn btn-brand" type="button" id="reset">Clear all filters</button></div>`);
      const u = new URLSearchParams();
      ['q', 'cat', 'seller'].forEach(k => st[k] && u.set(k, st[k]));
      history.replaceState(null, '', location.pathname + (u.toString() ? '?' + u : ''));
    }
    $('#f-cats').on('change', 'input', function () { st.cat = this.value; render(); });
    $('#f-brands').on('change', 'input', () => { st.brands = $('#f-brands input:checked').map((_, el) => el.value).get(); render(); });
    $('#f-min, #f-max').on('input', () => { st.min = $('#f-min').val(); st.max = $('#f-max').val(); render(); });
    $('#f-rating').on('change', 'input', function () { st.rating = +this.value; render(); });
    $('#f-free').on('change', function () { st.free = this.checked; render(); });
    $('#f-mall').on('change', function () { st.mall = this.checked; render(); });
    $('#sort').on('change', function () { st.sort = this.value; render(); });
    $(document).on('click', '#reset', () => {
      Object.assign(st, { q: '', cat: '', seller: '', min: '', max: '', rating: 0, brands: [], free: false, mall: false });
      $('.filters input[type=checkbox]').prop('checked', false); $('#f-min, #f-max').val('');
      $('#f-cats input[value=""], #f-rating input[value="0"]').prop('checked', true); $q.val(''); render();
    });
    $('.filter-btn').on('click', () => { $('.filters').addClass('open'); $('<div class="overlay"></div>').appendTo('body').on('click', closeF); });
    const closeF = () => { $('.filters').removeClass('open'); $('.overlay').remove(); };
    $('.close-filters').on('click', closeF);
    render();
  }

  /* ================= PRODUCT ================= */
  if (page === 'product') {
    const p = live.find(x => x.id === params.get('id')) || live[0];
    const s = sellerById(p.seller), c = catById(p.cat), d = discount(p);
    document.title = `${p.name} | Bazaarly`;
    $('.crumbs').html(`<a href="index.html">Home</a> / <a href="products.html?cat=${c.id}">${esc(c.name)}</a> / ${esc(p.name)}`);
    let variant = p.variant ? p.variant[1][0] : '';
    $('#pd').html(`
      <div class="pd-gal">
        <div class="pd-main" title="Click to zoom"><img src="${p.gallery[0]}" alt="${esc(p.name)}"></div>
        <div class="pd-thumbs">${p.gallery.map((g, k) => `<button type="button" data-src="${g}" ${k ? '' : 'aria-current="true"'} aria-label="Image ${k + 1}"><img src="${g}" alt=""></button>`).join('')}</div>
      </div>
      <div class="pd-info">
        <h1>${esc(p.name)}</h1>
        <div class="pd-sub">
          <span><span class="stars">${stars(p.rating)}</span> ${p.rating} (${p.reviews} ratings)</span>
          <span>Brand: <a href="products.html?q=${encodeURIComponent(p.brand)}">${esc(p.brand)}</a></span>
          <span>${p.sold.toLocaleString('en-IN')} sold</span>
        </div>
        <div class="pd-price"><div class="price">${taka(p.price)}</div>${d ? `<span class="old">${taka(p.old)}</span><span class="off">-${d}%</span>` : ''}</div>
        ${p.variant ? `<div class="pd-row"><span>${p.variant[0]}</span><div class="opts" id="opts">${p.variant[1].map((v, k) => `<button type="button" aria-pressed="${k === 0}">${v}</button>`).join('')}</div></div>` : ''}
        <div class="pd-row"><span>Quantity</span><div class="qty"><button type="button" class="q-minus" aria-label="Decrease">−</button><input id="qty" value="1" inputmode="numeric" aria-label="Quantity"><button type="button" class="q-plus" aria-label="Increase">+</button></div></div>
        <p class="stock-note ${p.stock ? (p.stock < 10 ? 'note-bad' : 'note-ok') : 'note-bad'}">${p.stock ? (p.stock < 10 ? `Only ${p.stock} left in stock` : 'In stock') : 'Out of stock'}</p>
        <div class="pd-btns">
          <button class="btn btn-hot" id="buy" ${p.stock ? '' : 'disabled'}>Buy now</button>
          <button class="btn btn-brand" id="add" ${p.stock ? '' : 'disabled'}>Add to cart</button>
        </div>
      </div>
      <div class="pd-side">
        <div class="box"><h3>Delivery</h3><ul>
          <li><i>📍</i><span>Dhaka, Dhaka North<br><small class="muted">Change at checkout</small></span></li>
          <li><i>🚚</i><span>Standard delivery, 2–4 days<br><b>${p.freeShip ? 'Free' : taka(60)}</b></span></li>
          <li><i>💵</i><span>Cash on delivery available</span></li>
          <li><i>↩️</i><span>7 days easy return</span></li></ul></div>
        <div class="box"><h3>Sold by</h3>
          <a href="store.html?seller=${s.id}" style="display:flex;gap:.7rem;align-items:center">
            <span class="avatar" style="background:${sellerColor(s.id)};width:44px;height:44px">${initials(s.name)}</span>
            <span><b>${esc(s.name)}</b>${s.mall ? ' <span class="tag-mall" style="font-size:.7rem;padding:.05rem .35rem;border-radius:4px">Mall</span>' : ''}<br><small class="muted">${esc(s.city)}</small></span></a>
          <div class="seller-stats"><span><b>${s.positive}%</b><small>Positive ratings</small></span><span><b>${s.shipOnTime}%</b><small>Ship on time</small></span><span><b>${s.chat}%</b><small>Chat response</small></span></div>
          <a class="btn btn-ghost" style="width:100%;margin-top:.8rem" href="store.html?seller=${s.id}">Visit store</a></div>
      </div>`);
    // Gallery & zoom
    $('.pd-thumbs').on('click', 'button', function () {
      $('.pd-thumbs button').removeAttr('aria-current'); $(this).attr('aria-current', 'true');
      $('.pd-main img').attr('src', $(this).data('src'));
    });
    $('.pd-main').on('click', function () { $(this).toggleClass('zoom'); })
      .on('mousemove', function (e) {
        if (!$(this).hasClass('zoom')) return;
        const o = $(this).offset();
        $(this).find('img').css('transform-origin', `${(e.pageX - o.left) / $(this).width() * 100}% ${(e.pageY - o.top) / $(this).height() * 100}%`);
      });
    $('#opts').on('click', 'button', function () { $('#opts button').attr('aria-pressed', false); $(this).attr('aria-pressed', true); variant = $(this).text(); });
    const qv = () => Math.max(1, Math.min(10, parseInt($('#qty').val()) || 1));
    $('.q-minus').on('click', () => $('#qty').val(Math.max(1, qv() - 1)));
    $('.q-plus').on('click', () => $('#qty').val(Math.min(Math.min(10, p.stock || 1), qv() + 1)));
    $('#add').on('click', () => { addToCart(p.id, qv(), variant); toast(`Added ${qv()} item${qv() > 1 ? 's' : ''} to cart. <a href="cart.html">View cart</a>`); });
    $('#buy').on('click', () => {
      // "Buy now" checks out only this item
      const cart = getCart().map(l => ({ ...l, checked: false }));
      cart.push({ pid: p.id, qty: qv(), variant, checked: true });
      setCart(cart); location.href = 'checkout.html';
    });
    // Tabs
    $('#desc').html(`<p>${esc(p.name)} from ${esc(p.brand)}, sold by ${esc(s.name)}. Genuine product with seller warranty where applicable.</p>
      <ul style="margin:.8rem 0 0 1.2rem;line-height:1.9"><li>Category: ${esc(c.name)}</li><li>Delivery across Bangladesh, cash on delivery available</li><li>7-day return if the item arrives damaged or not as described</li></ul>`);
    $('#specs').html(`<table class="specs"><tr><td>Brand</td><td>${esc(p.brand)}</td></tr><tr><td>Category</td><td>${esc(c.name)}</td></tr>
      ${p.variant ? `<tr><td>${p.variant[0]} options</td><td>${p.variant[1].join(', ')}</td></tr>` : ''}<tr><td>Seller</td><td>${esc(s.name)}</td></tr>
      <tr><td>SKU</td><td>BZ-${p.id.slice(0, 10).toUpperCase()}</td></tr><tr><td>Warranty</td><td>${['electronics', 'appliances', 'accessories'].includes(p.cat) ? '1 year seller warranty' : 'No warranty'}</td></tr></table>`);
    $('#reviews').html(`<div class="rating-sum"><div><div class="big">${p.rating}</div><span class="stars">${stars(p.rating)}</span><div class="muted">${p.reviews} ratings</div></div></div>` +
      REVIEWS.map(r => `<div class="review"><b>${esc(r.name)}</b><span class="stars">${stars(r.rating)}</span><p>${esc(r.text)}</p></div>`).join(''));
    $('.tabbar').on('click', 'button', function () {
      $('.tabbar button').attr('aria-selected', false); $(this).attr('aria-selected', true);
      $('.tab-panel').prop('hidden', true); $('#' + $(this).data('tab')).prop('hidden', false);
    });
    $('#related').html(live.filter(x => x.cat === p.cat && x.id !== p.id).concat(live.filter(x => x.seller === p.seller && x.cat !== p.cat)).slice(0, 6).map(x => card(x)).join(''));
  }

  /* ================= CART ================= */
  if (page === 'cart') {
    function renderCart() {
      const cart = getCart().filter(l => productById(l.pid) && isLive(productById(l.pid)));
      if (cart.length !== getCart().length) setCart(cart);
      if (!cart.length) {
        $('#cart').html(`<div class="empty"><p>Your cart is empty.</p><a class="btn btn-brand" href="index.html">Continue shopping</a></div>`);
        $('.summary').prop('hidden', true); return;
      }
      $('.summary').prop('hidden', false);
      const groups = {};
      cart.forEach((l, idx) => { const sid = productById(l.pid).seller; (groups[sid] = groups[sid] || []).push({ ...l, idx }); });
      const allChecked = cart.every(l => l.checked);
      $('#cart').html(`<div class="cart-head"><label style="display:flex;gap:.5rem;align-items:center"><input type="checkbox" id="all" ${allChecked ? 'checked' : ''}> Select all (${cart.length})</label><button class="del-sel" type="button">Delete selected</button></div>` +
        Object.keys(groups).map(sid => {
          const s = sellerById(sid);
          return `<div class="shop-group"><div class="shop-head"><span class="avatar" style="background:${sellerColor(sid)};width:28px;height:28px;font-size:.7rem;border-radius:7px">${initials(s.name)}</span><a href="store.html?seller=${sid}">${esc(s.name)}</a></div>` +
            groups[sid].map(l => {
              const p = productById(l.pid);
              return `<div class="line" data-idx="${l.idx}">
                <input type="checkbox" class="chk" ${l.checked ? 'checked' : ''} aria-label="Select ${esc(p.name)}">
                <a href="product.html?id=${p.id}"><img src="${p.img}" alt=""></a>
                <div><a class="nm" href="product.html?id=${p.id}">${esc(p.name)}</a>${l.variant ? `<div class="var">${esc(p.variant ? p.variant[0] : '')}: ${esc(l.variant)}</div>` : ''}
                  <div><span class="price">${taka(p.price)}</span> ${discount(p) ? `<span class="old">${taka(p.old)}</span>` : ''}</div></div>
                <div class="qty"><button type="button" class="ln-minus" aria-label="Decrease">−</button><input value="${l.qty}" readonly aria-label="Quantity"><button type="button" class="ln-plus" aria-label="Increase">+</button></div>
                <button type="button" class="rm" aria-label="Remove ${esc(p.name)}">🗑</button></div>`;
            }).join('') + '</div>';
        }).join(''));
      summary(cart.filter(l => l.checked));
    }
    let voucher = 0;
    function summary(sel) {
      const sub = sel.reduce((a, l) => a + productById(l.pid).price * l.qty, 0);
      const sellers = new Set(sel.map(l => productById(l.pid).seller));
      const ship = [...sellers].reduce((a, sid) => {
        const t = sel.filter(l => productById(l.pid).seller === sid).reduce((x, l) => x + productById(l.pid).price * l.qty, 0);
        return a + (t >= 1500 ? 0 : 60);
      }, 0);
      const off = Math.min(voucher, sub);
      $('#s-items').text(`${sel.reduce((a, l) => a + l.qty, 0)} item(s)`); $('#s-sub').text(taka(sub));
      $('#s-ship').text(ship ? taka(ship) : 'Free'); $('#s-off').text(off ? '−' + taka(off) : taka(0));
      $('#s-total').text(taka(sub + ship - off));
      $('#to-checkout').prop('disabled', !sel.length).text(`Proceed to checkout (${sel.length})`);
    }
    $('#cart').on('change', '#all', function () { setCart(getCart().map(l => ({ ...l, checked: this.checked }))); renderCart(); })
      .on('change', '.chk', function () { const c = getCart(); c[$(this).closest('.line').data('idx')].checked = this.checked; setCart(c); renderCart(); })
      .on('click', '.ln-minus, .ln-plus', function () {
        const c = getCart(), l = c[$(this).closest('.line').data('idx')];
        l.qty = Math.max(1, Math.min(10, l.qty + ($(this).hasClass('ln-plus') ? 1 : -1))); setCart(c); renderCart();
      })
      .on('click', '.rm', function () { const c = getCart(); c.splice($(this).closest('.line').data('idx'), 1); setCart(c); renderCart(); toast('Item removed from cart.'); })
      .on('click', '.del-sel', () => { setCart(getCart().filter(l => !l.checked)); renderCart(); });
    $('#apply-voucher').on('click', () => {
      const code = $('#voucher').val().trim().toUpperCase();
      if (code === 'BAZAAR100') { voucher = 100; $('#v-msg').attr('class', 'note-ok').text('Voucher applied: ৳100 off.'); }
      else { voucher = 0; $('#v-msg').attr('class', 'note-bad').text('This voucher code isn’t valid. Try BAZAAR100.'); }
      store.set('bz_voucher', voucher); renderCart();
    });
    $('#to-checkout').on('click', () => { location.href = 'checkout.html'; });
    renderCart();
  }

  /* ================= CHECKOUT ================= */
  if (page === 'checkout') {
    const sel = getCart().filter(l => l.checked && productById(l.pid) && isLive(productById(l.pid)));
    if (!sel.length) { $('#checkout').html(`<div class="empty"><p>No items selected for checkout.</p><a class="btn btn-brand" href="cart.html">Go to cart</a></div>`); }
    const user = store.get('bz_user', null);
    if (user) { $('#c-name').val(user.name); $('#c-phone').val(user.phone || ''); }
    const voucher = store.get('bz_voucher', 0);
    function totals() {
      const sub = sel.reduce((a, l) => a + productById(l.pid).price * l.qty, 0);
      const express = $('input[name=ship]:checked').val() === 'express';
      const sellers = [...new Set(sel.map(l => productById(l.pid).seller))];
      const ship = sellers.reduce((a, sid) => {
        const t = sel.filter(l => productById(l.pid).seller === sid).reduce((x, l) => x + productById(l.pid).price * l.qty, 0);
        return a + (express ? 150 : t >= 1500 ? 0 : 60);
      }, 0);
      const cod = $('input[name=pay]:checked').val() === 'Cash on Delivery' ? 20 : 0;
      const off = Math.min(voucher, sub);
      $('#co-items').html(sel.map(l => { const p = productById(l.pid); return `<div class="sum-row"><span>${esc(p.name.slice(0, 34))}${p.name.length > 34 ? '…' : ''} × ${l.qty}</span><span>${taka(p.price * l.qty)}</span></div>`; }).join(''));
      $('#co-sub').text(taka(sub)); $('#co-ship').text(ship ? taka(ship) : 'Free'); $('#co-cod').text(taka(cod));
      $('#co-off').text(off ? '−' + taka(off) : taka(0)); $('#co-total').text(taka(sub + ship + cod - off));
      $('#co-sellers').text(`${sellers.length} seller${sellers.length > 1 ? 's' : ''} — delivered in ${sellers.length} package${sellers.length > 1 ? 's' : ''}`);
      return sub + ship + cod - off;
    }
    $('input[name=ship], input[name=pay]').on('change', totals);
    totals();
    $('#place').on('click', function () {
      const form = $('#addr-form')[0];
      if (!form.reportValidity()) return;
      const id = 'BZ' + (261100 + Math.floor(Math.random() * 800));
      const orders = store.get('bz_orders', []);
      orders.unshift({ id, date: new Date().toISOString().slice(0, 10), items: sel, total: totals(), payment: $('input[name=pay]:checked').val(), status: 'pending' });
      store.set('bz_orders', orders);
      setCart(getCart().filter(l => !l.checked)); store.set('bz_voucher', 0);
      $('#checkout').html(`<div class="success"><div class="tick">✓</div><h1>Order placed</h1>
        <p class="muted" style="margin:.6rem 0 1.4rem">Order <b>${id}</b> is confirmed. We’ll send updates by SMS to ${esc($('#c-phone').val())}.</p>
        <a class="btn btn-brand" href="account.html#orders">View my orders</a> <a class="btn btn-ghost" href="index.html">Continue shopping</a></div>`);
      window.scrollTo(0, 0);
    });
  }

  /* ================= STORE ================= */
  if (page === 'store') {
    const s = SELLERS.find(x => x.id === params.get('seller') && x.status === 'active') || SELLERS.find(x => x.mall);
    document.title = `${s.name} | Bazaarly`;
    const items = live.filter(p => p.seller === s.id);
    $('#store-head').html(`<div class="store-cover"></div><div class="store-bar">
      <span class="avatar" style="background:${sellerColor(s.id)}">${initials(s.name)}</span>
      <div><h1>${esc(s.name)} ${s.mall ? '<span class="tag-mall" style="font-size:.75rem;padding:.1rem .4rem;border-radius:4px;vertical-align:middle">Mall</span>' : ''}</h1>
        <div class="store-stats"><span><b>${s.positive}%</b> positive ratings</span><span><b>${s.followers.toLocaleString('en-IN')}</b> followers</span><span><b>${items.length}</b> products</span><span>${esc(s.city)} · since ${s.joined.slice(0, 4)}</span></div></div>
      <div class="acts"><button class="btn btn-brand" id="follow" type="button">+ Follow</button><button class="btn btn-ghost" type="button" id="chat">Chat</button></div></div>`);
    const followed = store.get('bz_follow', []);
    const setF = () => $('#follow').text(followed.includes(s.id) ? '✓ Following' : '+ Follow');
    setF();
    $('#follow').on('click', () => { const k = followed.indexOf(s.id); k < 0 ? followed.push(s.id) : followed.splice(k, 1); store.set('bz_follow', followed); setF(); });
    $('#chat').on('click', () => toast('Chat is not part of this demo.'));
    let sort = 'best';
    const renderStore = () => {
      const q = ($('#store-q').val() || '').toLowerCase();
      const list = items.filter(p => p.name.toLowerCase().includes(q)).sort(sort === 'low' ? (a, b) => a.price - b.price : sort === 'high' ? (a, b) => b.price - a.price : (a, b) => b.sold - a.sold);
      $('#store-grid').html(list.length ? `<div class="grid">${list.map(p => card(p)).join('')}</div>` : `<div class="empty"><p>No products in this store match “${esc(q)}”.</p></div>`);
    };
    $('#store-q').on('input', renderStore);
    $('#store-sort').on('change', function () { sort = this.value; renderStore(); });
    renderStore();
  }

  /* ================= ACCOUNT ================= */
  if (page === 'account') {
    const showAccount = () => {
      const u = store.get('bz_user', null);
      $('#auth').prop('hidden', !!u); $('#me').prop('hidden', !u);
      if (!u) return;
      $('#me-name').text(u.name);
      const mine = store.get('bz_orders', []);
      const sample = ORDERS.filter(o => o.customer === 'C1002').slice(0, 3).map(o => ({ ...o, items: o.items.map(i => ({ pid: i.pid, qty: i.qty })) }));
      const all = mine.concat(sample);
      $('#orders').html(all.length ? all.map(o => `<div class="order-card"><div class="top"><span><b>Order ${o.id}</b> · ${o.date}</span><span class="pill st-${o.status}">${o.status}</span></div>
        ${o.items.map(i => { const p = productById(i.pid); return p ? `<div style="display:flex;gap:.7rem;align-items:center;margin-top:.5rem"><img src="${p.img}" alt="" style="width:52px;height:52px;border-radius:6px"><span style="flex:1">${esc(p.name)} <span class="muted">× ${i.qty}</span></span></div>` : ''; }).join('')}
        <div style="text-align:right;margin-top:.6rem;font-weight:700">Total ${taka(o.total)}</div></div>`).join('') : '<div class="empty"><p>No orders yet.</p></div>');
    };
    $('.auth .tabbar').on('click', 'button', function () {
      $('.auth .tabbar button').attr('aria-selected', false); $(this).attr('aria-selected', true);
      $('#login-form, #signup-form').prop('hidden', true); $('#' + $(this).data('tab')).prop('hidden', false);
    });
    $('#login-form').on('submit', function (e) { e.preventDefault(); store.set('bz_user', { name: 'Nusrat Jahan', phone: $(this).find('input').first().val() }); showAccount(); });
    $('#signup-form').on('submit', function (e) { e.preventDefault(); store.set('bz_user', { name: $('#su-name').val(), phone: $('#su-phone').val() }); showAccount(); });
    $('#logout').on('click', () => { store.set('bz_user', null); showAccount(); });
    showAccount();
  }

  /* ================= SELL ================= */
  if (page === 'sell') {
    $('#sell-cat').append(CATEGORIES.map(c => `<option>${esc(c.name)}</option>`).join(''));
    $('#sell-form').on('submit', function (e) {
      e.preventDefault();
      $(this).html(`<div style="text-align:center;padding:1rem"><div class="tick" style="width:60px;height:60px;border-radius:50%;background:var(--ok-soft);color:var(--ok);display:grid;place-items:center;font-size:1.8rem;margin:0 auto .8rem">✓</div>
        <h2>Application received</h2><p class="muted" style="margin-top:.5rem">Our seller team will verify your documents within 2 working days. You’ll see it in the admin panel under Vendors → Pending.</p></div>`);
    });
  }
});
