document.addEventListener("DOMContentLoaded", () => {

  const productsContainer = document.getElementById("products");
  const cartContainer     = document.getElementById("cart");

  // ─── Admin mode: ?admin=true بالـ URL ──────────
  const isAdmin = new URLSearchParams(window.location.search).has("admin");

  // ─── Quantity tracker per product ──────────────
  const selectedQty = {};

  // ══════════════════════════════════════════════
  //  PRODUCTS
  // ══════════════════════════════════════════════
  function loadProducts() {
    fetch("/api/products")
      .then(res => res.json())
      .then(products => {
        productsContainer.innerHTML = "";

        if (products.length === 0) {
          productsContainer.innerHTML = `
            <div class="empty-state">
              <span class="empty-icon">🛍️</span>
              <p>Henüz ürün eklenmedi.</p>
            </div>`;
          return;
        }

        products.forEach(p => {
          if (!selectedQty[p.id]) selectedQty[p.id] = 1;

          const div = document.createElement("div");
          div.className = "product-card";
          div.id = `product-card-${p.id}`;

          const imgHTML = p.image
            ? `<img src="${p.image}" alt="${p.name}">`
            : `<div class="no-img">💄</div>`;

          const outOfStock = p.stock <= 0;

          // زر الحذف بس للأدمن
          const deleteBtn = isAdmin
            ? `<button class="btn-delete" onclick="deleteProduct(${p.id})">🗑️ Sil</button>`
            : "";

          div.innerHTML = `
            <div class="product-image">${imgHTML}</div>
            <div class="product-info">
              <h3 class="product-name">${p.name}</h3>
              <p class="price">₺${Number(p.price).toFixed(2)}</p>
              <p class="stock ${outOfStock ? 'out-of-stock' : ''}">
                ${outOfStock ? "❌ Stok Tükendi" : `Stok: ${p.stock}`}
              </p>

              ${!outOfStock ? `
              <div class="quantity-control">
                <button class="qty-btn" onclick="changeQty(${p.id}, -1, ${p.stock})">−</button>
                <span class="qty-value" id="qty-${p.id}">1</span>
                <button class="qty-btn" onclick="changeQty(${p.id}, +1, ${p.stock})">+</button>
              </div>` : ""}

              <div class="actions">
                ${outOfStock
                  ? `<button class="btn-add disabled" disabled>Stok Tükendi</button>`
                  : `<button class="btn-add" onclick="addToCart(${p.id})">🛒 Sepete Ekle</button>`
                }
                ${deleteBtn}
              </div>
            </div>
          `;

          productsContainer.appendChild(div);
        });
      })
      .catch(err => console.error("Products yüklenemedi:", err));
  }

  // ─── Change Qty ─────────────────────────────
  window.changeQty = function(productId, delta, maxStock) {
    let qty = (selectedQty[productId] || 1) + delta;
    if (qty < 1) qty = 1;
    if (qty > maxStock) {
      showToast("⚠️ Stok limiti aşıldı!");
      qty = maxStock;
    }
    selectedQty[productId] = qty;
    const el = document.getElementById("qty-" + productId);
    if (el) {
      el.textContent = qty;
      el.style.transform = "scale(1.4)";
      setTimeout(() => el.style.transform = "scale(1)", 180);
    }
  };

  // ─── Add to Cart ─────────────────────────────
  window.addToCart = function(id) {
    const qty = selectedQty[id] || 1;

    fetch("/api/cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ product_id: id, quantity: qty })
    })
      .then(res => res.json())
      .then(() => {
        selectedQty[id] = 1;
        const el = document.getElementById("qty-" + id);
        if (el) el.textContent = 1;

        loadCart();
        loadProducts();
        showToast(`✨ ${qty} adet ürün sepete eklendi`);

        // ─── Cart badge bounce ───
        const badge = document.getElementById("cart-count");
        if (badge) {
          badge.classList.add("bounce");
          setTimeout(() => badge.classList.remove("bounce"), 400);
        }
      })
      .catch(() => showToast("⚠️ Bir hata oluştu"));
  };

  // ─── Delete Product (admin only) ─────────────
  window.deleteProduct = function(id) {
    if (!confirm("Ürünü silmek istiyor musun?")) return;

    fetch(`/api/products/${id}`, {
      method: "DELETE",
      headers: { admin: "1234" }
    })
      .then(res => res.json())
      .then(() => {
        loadProducts();
        loadCart();
        showToast("🗑️ Ürün silindi");
      })
      .catch(err => console.error(err));
  };

  // ─── Admin form ──────────────────────────────
  const form = document.getElementById("productForm");
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const formData = new FormData(form);
      fetch("/api/products", {
        method: "POST",
        headers: { admin: "1234" },
        body: formData
      })
        .then(res => res.json())
        .then(() => {
          form.reset();
          showToast("✅ Ürün başarıyla eklendi!");
          loadProducts();
        })
        .catch(() => showToast("⚠️ Ürün eklenemedi"));
    });
  }

  // ══════════════════════════════════════════════
  //  CART
  // ══════════════════════════════════════════════
  function loadCart() {
    fetch("/api/cart")
      .then(res => res.json())
      .then(items => {
        // ─── Badge ──────────────────────────────
        const totalQty = items.reduce((s, i) => s + (i.quantity || 1), 0);
        document.getElementById("cart-count").innerText = totalQty;

        cartContainer.innerHTML = "";

        if (items.length === 0) {
          cartContainer.innerHTML = `
            <div class="empty-state">
              <span class="empty-icon">🛒</span>
              <p>Sepetiniz boş. Ürünler sayfasından ekleyin!</p>
            </div>`;
          return;
        }

        const list = document.createElement("div");
        list.className = "cart-list";

        let grandTotal = 0;

        items.forEach(item => {
          const qty      = item.quantity || 1;
          const unitPrice = Number(item.product.price);
          const lineTotal = unitPrice * qty;
          grandTotal += lineTotal;

          const imgHTML = item.product.image
            ? `<img src="${item.product.image}" alt="${item.product.name}">`
            : `<span class="cart-placeholder">💄</span>`;

          const div = document.createElement("div");
          div.className = "cart-item";
          div.dataset.price = unitPrice;   // للتحديث الفوري

          div.innerHTML = `
            <div class="cart-item-img">${imgHTML}</div>

            <div class="cart-item-info">
              <h3>${item.product.name}</h3>
              <p class="unit-price">Birim: ₺${unitPrice.toFixed(2)}</p>
            </div>

            <div class="cart-qty-control">
              <button class="cart-qty-btn" onclick="changeCartQty(${item.id}, -1)">−</button>
              <span class="cart-qty-val" id="cqty-${item.id}">${qty}</span>
              <button class="cart-qty-btn" onclick="changeCartQty(${item.id}, +1)">+</button>
            </div>

            <div class="cart-line-total" id="cprice-${item.id}">
              ₺${lineTotal.toFixed(2)}
            </div>

            <button class="cart-remove" onclick="removeFromCart(${item.id})">✕</button>
          `;

          list.appendChild(div);
        });

        cartContainer.appendChild(list);

        // ─── Summary ────────────────────────────
        const summary = document.createElement("div");
        summary.className = "cart-summary";
        summary.innerHTML = `
          <div class="cart-summary-row">
            <span>Toplam Ürün</span>
            <span>${totalQty} adet</span>
          </div>
          <div class="cart-summary-row total">
            <span>Toplam Tutar</span>
            <span class="cart-total-amount" id="grand-total">₺${grandTotal.toFixed(2)}</span>
          </div>
          <button class="btn-checkout" onclick="showToast('🎉 Sipariş özelliği yakında!')">
            ✨ Siparişi Tamamla
          </button>
        `;
        cartContainer.appendChild(summary);
      })
      .catch(err => console.error("Sepet yüklenemedi:", err));
  }

  // ─── Change Cart Qty ─────────────────────────
  window.changeCartQty = function(cartItemId, delta) {
    const qtyEl    = document.getElementById("cqty-" + cartItemId);
    const priceEl  = document.getElementById("cprice-" + cartItemId);
    if (!qtyEl) return;

    const currentQty = parseInt(qtyEl.textContent) || 1;
    const newQty     = currentQty + delta;

    if (newQty < 1) {
      if (confirm("Ürünü sepetten çıkarmak istiyor musun?")) {
        removeFromCart(cartItemId);
      }
      return;
    }

    // Optimistic UI update
    qtyEl.textContent = newQty;
    qtyEl.style.transform = "scale(1.4)";
    setTimeout(() => qtyEl.style.transform = "scale(1)", 180);

    if (priceEl) {
      const card      = qtyEl.closest(".cart-item");
      const unitPrice = card ? parseFloat(card.dataset.price) : 0;
      priceEl.textContent = "₺" + (unitPrice * newQty).toFixed(2);
    }

    // Recalculate grand total live
    recalcGrandTotal();

    // PATCH API
    fetch(`/api/cart/${cartItemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quantity: newQty })
    })
      .then(res => res.json())
      .then(() => {
        // badge update
        fetch("/api/cart")
          .then(r => r.json())
          .then(items => {
            const t = items.reduce((s, i) => s + (i.quantity || 1), 0);
            document.getElementById("cart-count").innerText = t;
          });
      })
      .catch(() => loadCart()); // fallback
  };

  function recalcGrandTotal() {
    let total = 0;
    document.querySelectorAll(".cart-item").forEach(card => {
      const price = parseFloat(card.dataset.price) || 0;
      const qtyEl = card.querySelector(".cart-qty-val");
      const qty   = qtyEl ? parseInt(qtyEl.textContent) || 1 : 1;
      total += price * qty;
    });
    const el = document.getElementById("grand-total");
    if (el) el.textContent = "₺" + total.toFixed(2);

    // badge total
    let totalQty = 0;
    document.querySelectorAll(".cart-qty-val").forEach(el => {
      totalQty += parseInt(el.textContent) || 1;
    });
    document.getElementById("cart-count").innerText = totalQty;
  }

  // ─── Remove from Cart ────────────────────────
  window.removeFromCart = function(id) {
    fetch(`/api/cart/${id}`, { method: "DELETE" })
      .then(res => res.json())
      .then(() => {
        loadCart();
        loadProducts();
        showToast("🗑️ Ürün sepetten çıkarıldı");
      })
      .catch(err => console.error(err));
  };

  // ══════════════════════════════════════════════
  //  TABS
  // ══════════════════════════════════════════════
  window.showTab = function(tabName) {
    document.querySelectorAll(".section").forEach(s => s.classList.remove("active"));
    document.querySelectorAll(".nav-tab").forEach(b => b.classList.remove("active"));

    document.getElementById("tab-" + tabName)?.classList.add("active");
    document.querySelector(`.nav-tab[onclick*="${tabName}"]`)?.classList.add("active");

    if (tabName === "cart")     loadCart();
    if (tabName === "products") loadProducts();
  };

  // ══════════════════════════════════════════════
  //  TOAST
  // ══════════════════════════════════════════════
  window.showToast = function(msg) {
    let toast = document.getElementById("toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "toast";
      toast.className = "toast";
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.add("show");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => toast.classList.remove("show"), 2800);
  };

  // ══════════════════════════════════════════════
  //  INIT
  // ══════════════════════════════════════════════
  loadProducts();
  loadCart();

});
