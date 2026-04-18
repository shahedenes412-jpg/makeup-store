document.addEventListener("DOMContentLoaded", () => {

  const productsContainer = document.getElementById("products");
  const cartContainer = document.getElementById("cart");

  // ─── Load Products ─────────────────────────────
  function loadProducts() {
    fetch("/api/products")
      .then(res => res.json())
      .then(products => {
        productsContainer.innerHTML = "";

        products.forEach(p => {
          const div = document.createElement("div");

          div.innerHTML = `
            <div class="product-card">
              
              <div class="product-image">
                ${p.image ? `<img src="${p.image}">` : `<div class="no-img">💄</div>`}
              </div>

              <div class="product-info">
                <h3>${p.name}</h3>

                <p class="price">₺${p.price}</p>

                <p class="stock">Stok: ${p.stock}</p>

                <div class="actions">
                  
                  ${
                    p.stock <= 0
                      ? `<button class="btn-add" disabled style="background:gray;">Stok Yok</button>`
                      : `<button class="btn-add" onclick="addToCart(${p.id})">Sepete Ekle</button>`
                  }

                  <button class="btn-delete" onclick="deleteProduct(${p.id})">
                    Sil
                  </button>

                </div>
              </div>

            </div>
          `;

          productsContainer.appendChild(div);
        });
      })
      .catch(err => console.error(err));
  }

  // ─── Add Product (ADMIN) ───────────────────────
  const form = document.getElementById("productForm");

  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();

      const formData = new FormData(form);

      fetch("/api/products", {
        method: "POST",
        headers: {
          admin: "1234"
        },
        body: formData
      })
        .then(res => res.json())
        .then(() => {
          form.reset();
          alert("Ürün başarıyla eklendi ✅");
          loadProducts();
        });
    });
  }

  // ─── Delete Product ────────────────────────────
  function deleteProduct(id) {
    if (!confirm("Ürünü silmek istiyor musun?")) return;

    fetch(`/api/products/${id}`, {
      method: "DELETE",
      headers: {
        admin: "1234"
      }
    })
      .then(res => res.json())
      .then(() => {
        loadProducts();
        loadCart();
      });
  }

  // ─── Add to Cart ───────────────────────────────
  function addToCart(id) {
    fetch("/api/cart", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ product_id: id })
    })
      .then(res => res.json())
      .then(() => {
        loadCart();
        loadProducts();
      });
  }

  // ─── Load Cart ─────────────────────────────────
  function loadCart() {
    fetch("/api/cart")
      .then(res => res.json())
      .then(items => {

        document.getElementById("cart-count").innerText = items.length;

        cartContainer.innerHTML = "";

        if (items.length === 0) {
          cartContainer.innerHTML = "<p>Sepet boş 🛒</p>";
          return;
        }

        let total = 0;

        items.forEach(item => {

          total += item.product.price * item.quantity;

          const div = document.createElement("div");

          div.innerHTML = `
            <div class="cart-item">

              ${item.product.image ? `<img src="${item.product.image}">` : ""}

              <div class="cart-info">
                <h4>${item.product.name}</h4>
                <p>Adet: ${item.quantity}</p>
                <p>₺${item.product.price}</p>
              </div>

              <button class="btn-delete" onclick="removeFromCart(${item.id})">
                ❌
              </button>

            </div>
          `;

          cartContainer.appendChild(div);
        });

        // ─── TOTAL ─────────────────────────────
        const totalDiv = document.createElement("div");

        totalDiv.innerHTML = `
          <div style="margin-top:20px; font-size:22px; font-weight:bold; text-align:right;">
            Toplam: ₺${total.toFixed(2)}
          </div>
        `;

        cartContainer.appendChild(totalDiv);

      });
  }

  // ─── Remove From Cart ──────────────────────────
  function removeFromCart(id) {
    fetch(`/api/cart/${id}`, {
      method: "DELETE"
    })
      .then(res => res.json())
      .then(() => {
        loadCart();
        loadProducts();
      });
  }

  // ─── Tabs ──────────────────────────────────────
  function showTab(tabName) {
    const sections = document.querySelectorAll(".section");
    const buttons = document.querySelectorAll(".nav-tab");

    sections.forEach(sec => sec.classList.remove("active"));
    buttons.forEach(btn => btn.classList.remove("active"));

    document.getElementById("tab-" + tabName).classList.add("active");

    event.target.classList.add("active");
  }

  // ─── Global Fix ────────────────────────────────
  window.addToCart = addToCart;
  window.deleteProduct = deleteProduct;
  window.removeFromCart = removeFromCart;
  window.showTab = showTab;

  // ─── Init ──────────────────────────────────────
  loadProducts();
  loadCart();

});
