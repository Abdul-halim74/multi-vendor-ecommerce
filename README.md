# Bazaarly — multi-vendor e-commerce demo (frontend only)

HTML + CSS + JavaScript + jQuery 3.7. No build step: open `index.html` (storefront)
or `admin/login.html` (admin panel) in a browser. Internet is needed for jQuery,
Google Fonts and Chart.js (admin dashboard). All products, sellers, customers and
prices are fictional; all images are local SVGs.

## Storefront
- index.html       Home: category menu, banner slider, flash sale with countdown, categories, Mall stores, "Just for you" with load more
- products.html    Search / category listing with filters (category, price, rating, brand, free delivery, Mall) and sort
- product.html     Product page: gallery + zoom, variants, quantity, buy now / add to cart, seller card, specs, reviews
- cart.html        Cart grouped by seller, select items, per-seller shipping, voucher (try BAZAAR100)
- checkout.html    Address, delivery option, payment (bKash, Nagad, card, COD), place order
- store.html       Vendor shop page with follow, search and sort
- account.html     Demo login / sign up and "My orders"
- sell.html        Vendor application form

## Admin panel (admin/)
- login.html       Demo login (details are pre-filled)
- index.html       Dashboard: KPIs, 14-day sales chart, orders by status, recent orders, top products, low stock, vendor applications
- orders.html      Status tabs, search, payment filter, pagination, order drawer with status update, CSV export
- products.html    Filters, show/hide in store, add / edit / delete
- categories.html  Category list with product counts, add category
- vendors.html     Approve / reject / suspend vendors, edit commission
- payouts.html     Delivered sales − commission = payable, mark paid
- customers.html   Search, block / unblock
- settings.html    Store, commission, delivery and payment settings; reset demo data

## How data works
- js/data.js holds all demo data. Replace it with API calls to your backend
  (e.g. `$.getJSON('/api/products')`) — the rendering code stays the same.
- Cart, login, orders and admin changes are saved in the browser's localStorage.
  Admin changes show up in the storefront too (e.g. suspend a vendor → their
  products disappear from the store). Settings → "Reset demo data" clears them.

## Files
css/store.css, css/admin.css · js/data.js, js/store.js, js/admin.js ·
images/products (150 SVG product images), images/banners (4 slider banners)
