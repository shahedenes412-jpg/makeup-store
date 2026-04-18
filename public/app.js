document.addEventListener("DOMContentLoaded", () => {

  const productsContainer = document.getElementById("products");
  const cartContainer = document.getElementById("cart");

  // ─── Quantity tracker (per product, before adding to cart) ─────
  const selectedQty = {};

  // ─── Load Products ─────────────────────────────
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

          const addBtn = p.stock <= 0
            ? `<button class="btn-add" disabled style="opacity:.5;cursor:not-allowed;">Stok Yok</button>`
            : `<button class="btn-add" onclick="addToCart(${p.id})">🛒 Sepete Ekle</button>`;

          div.innerHTML = `
            <div class="product-image">${imgHTML}</div>
            <div class="product-info">
              <h3 class="product-name">${p.name}</h3>
              <p class="price">₺${Number(p.price).toFixed(2)}</p>
              <p class="stock">Stok: ${p.stock}</p>

              <div class="quantity-control">
                <button class="qty-btn" onclick="changeQty(${p.id}, -1, ${p.stock})">−</button>
                <span class="qty-value" id="qty-${p.id}">1</span>
                <button class="qty-btn" onclick="changeQty(${p.id}, +1, ${p.stock})">+</button>
              </div>

              <div class="actions">
                ${addBtn}
                <button class="btn-delete" onclick="deleteProduct(${p.id})">🗑️ Sil</button>
              </div>
            </div>
          `;

          productsContainer.appendChild(div);
        });
      })
      .catch(err => console.error("Products yüklenemedi:", err));
  }

  // ─── Change Qty (product grid) ─────────────────
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

  // ─── Add to Cart (with qty) ────────────────────
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
      })
      .catch(err => {
        console.error("Sepete eklenemedi:", err);
        showToast("⚠️ Bir hata oluştu");
      });
  };

  // ─── Add Product (ADMIN form) ──────────────────
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
        .catch(err => {
          console.error(err);
          showToast("⚠️ Ürün eklenemedi");
        });
    });
  }

  // ─── Delete Product ────────────────────────────
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

  // ─── Load Cart ─────────────────────────────────
  function loadCart() {
    fetch("/api/cart")
      .then(res => res.json())
      .then(items => {
        const totalItems = items.reduce((s, i) => s + (i.quantity || 1), 0);
        document.getElementById("cart-count").innerText = totalItems;

        cartContainer.innerHTML = "";

        if (items.length === 0) {
          cartContainer.innerHTML = `
            <div class="empty-state">
              <span class="empty-icon">🛒</span>
              <p>Sepetiniz boş. Ürünler sayfasından ekleyin!</p>
            </div>`;
          return;
        }

        let total = 0;
        const list = document.createElement("div");
        list.className = "cart-list";

        items.forEach(item => {
          const qty   = item.quantity || 1;
          const price = item.product.price;
          total += price * qty;

          const imgHTML = item.product.image
            ? `<img src="${item.product.image}" alt="${item.product.name}">`
            : `<span class="cart-placeholder">💄</span>`;

          const div = document.createElement("div");
          div.className = "cart-item";
          div.innerHTML = `
            <div class="cart-item-img">${imgHTML}</div>
            <div class="cart-item-info">
              <h3>${item.product.name}</h3>
              <p>Birim: ₺${Number(price).toFixed(2)}</p>
            </div>
            <div class="cart-qty-control">
              <button class="cart-qty-btn" onclick="changeCartQty(${item.id}, ${qty - 1})">−</button>
              <span class="cart-qty-val">${qty}</span>
              <button class="cart-qty-btn" onclick="changeCartQty(${item.id}, ${qty + 1})">+</button>
            </div>
            <div class="cart-item-price">₺${(price * qty).toFixed(2)}</div>
            <button class="cart-remove" onclick="removeFromCart(${item.id})">🗑️ Çıkar</button>
          `;
          list.appendChild(div);
        });

        cartContainer.appendChild(list);

        const totalDiv = document.createElement("div");
        totalDiv.className = "cart-total";
        totalDiv.innerHTML = `
          <span class="cart-total-label">🛒 Toplam Tutar</span>
          <span class="cart-total-amount">₺${total.toFixed(2)}</span>
        `;
        cartContainer.appendChild(totalDiv);
      })
      .catch(err => console.error("Sepet yüklenemedi:", err));
  }

  // ─── Change Cart Item Qty (via API PATCH) ──────
  window.changeCartQty = function(cartItemId, newQty) {
    if (newQty < 1) {
      if (confirm("Ürünü sepetten çıkarmak istiyor musun?")) {
        removeFromCart(cartItemId);
      }
      return;
    }

    fetch(`/api/cart/${cartItemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quantity: newQty })
    })
      .then(res => res.json())
      .then(() => loadCart())
      .catch(err => {
        console.warn("PATCH desteklenmiyor:", err);
        showToast("⚠️ Miktar güncellenemedi — Backend PATCH /api/cart/:id gerektirir");
      });
  };

  // ─── Remove From Cart ──────────────────────────
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

  // ─── Tab Navigation ────────────────────────────
  window.showTab = function(tabName) {
    document.querySelectorAll(".section").forEach(sec => sec.classList.remove("active"));
    document.querySelectorAll(".nav-tab").forEach(btn => btn.classList.remove("active"));

    document.getElementById("tab-" + tabName)?.classList.add("active");

    const activeBtn = document.querySelector(`.nav-tab[onclick*="${tabName}"]`);
    if (activeBtn) activeBtn.classList.add("active");

    if (tabName === "cart") loadCart();
    if (tabName === "products") loadProducts();
  };

  // ─── Toast ─────────────────────────────────────
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
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => toast.classList.remove("show"), 2800);
  };

  // ─── Init ──────────────────────────────────────
  loadProducts();
  loadCart();

});
