// ════════════════════════════════════════════════════════════
//  استنى حتى تنتهي الصفحة من التحميل الكامل، وبعدين شغّل الكود
// ════════════════════════════════════════════════════════════
document.addEventListener("DOMContentLoaded", () => {

  const productsContainer = document.getElementById("products");
  // خذ العنصر اللي رح نحط فيه بطاقات المنتجات من الـ HTML

  const cartContainer = document.getElementById("cart");
  // خذ العنصر اللي رح نحط فيه محتويات السلة من الـ HTML


  // ─── هل المستخدم أدمين؟ ────────────────────────────────
  const isAdmin = new URLSearchParams(window.location.search).has("admin");
  // اقرأ الـ URL، إذا فيه ?admin (مثلاً: site.com/?admin) يعني هو أدمين
  // has("admin") بترجع true إذا الكلمة موجودة، وfalse إذا لا


  // ─── متتبع الكمية لكل منتج ──────────────────────────────
  const selectedQty = {};
  // object فاضي بنحفظ فيه الكمية المختارة لكل منتج
  // مثلاً: { 1: 3, 2: 1 } يعني المنتج رقم 1 اختار منه 3، ورقم 2 اختار منه 1


  // ════════════════════════════════════════════════════════
  //  قسم المنتجات
  // ════════════════════════════════════════════════════════

  function loadProducts() {
    // هاي الدالة بتجيب المنتجات من السيرفر وتعرضها على الصفحة

    fetch("/api/products")
      // بعت طلب GET للسيرفر على هاد الرابط
      .then(res => res.json())
      // حوّل الجواب من نص لـ JSON (مصفوفة منتجات)
      .then(products => {
        productsContainer.innerHTML = "";
        // امسح كل اللي كان موجود قبل، عشان نعيد الرسم من الأول

        if (products.length === 0) {
          productsContainer.innerHTML = `
            <div class="empty-state">
              <span class="empty-icon">🛍️</span>
              <p>Henüz ürün eklenmedi.</p>
            </div>`;
          return;
          // إذا ما في منتجات، اعرض رسالة "ما في منتجات لحد الآن" ووقف
        }

        products.forEach(p => {
          // لكل منتج بالمصفوفة، اعمل بطاقة (card) وضيفها للصفحة

          if (!selectedQty[p.id]) selectedQty[p.id] = 1;
          // إذا ما في كمية مسجلة لهاد المنتج، ابدأها بـ 1

          const div = document.createElement("div");
          div.className = "product-card";
          div.id = `product-card-${p.id}`;
          // اعمل div جديد للبطاقة وعطيه class وid مناسبين

          const imgHTML = p.image
            ? `<img src="${p.image}" alt="${p.name}">`
            : `<div class="no-img">💄</div>`;
          // إذا المنتج عنده صورة، اعرضها، وإلا اعرض إيموجي كبديل

          const outOfStock = p.stock <= 0;
          // إذا الكمية بالمخزون صفر أو أقل، يعني الستوك خلص

          const deleteBtn = isAdmin
            ? `<button class="btn-delete" onclick="deleteProduct(${p.id})">🗑️ Sil</button>`
            : "";
          // إذا المستخدم أدمين، أضف زر حذف، وإلا ما تضيف شي

          div.innerHTML = `
            <div class="product-image">${imgHTML}</div>
            <div class="product-info">
              <h3 class="product-name">${p.name}</h3>
              <p class="price">₺${Number(p.price).toFixed(2)}</p>
              <!-- اعرض السعر بـ رقمين عشريين -->

              <p class="stock ${outOfStock ? 'out-of-stock' : ''}">
                ${outOfStock ? "❌ Stok Tükendi" : `Stok: ${p.stock}`}
              </p>
              <!-- إذا خلص الستوك اعرض "نفد المخزون"، وإلا اعرض الكمية -->

              ${!outOfStock ? `
              <div class="quantity-control">
                <button class="qty-btn" onclick="changeQty(${p.id}, -1, ${p.stock})">−</button>
                <span class="qty-value" id="qty-${p.id}">1</span>
                <button class="qty-btn" onclick="changeQty(${p.id}, +1, ${p.stock})">+</button>
              </div>` : ""}
              <!-- إذا في ستوك، اعرض أزرار + و - لاختيار الكمية -->

              <div class="actions">
                ${outOfStock
                  ? `<button class="btn-add disabled" disabled>Stok Tükendi</button>`
                  : `<button class="btn-add" onclick="addToCart(${p.id})">🛒 Sepete Ekle</button>`
                }
                <!-- إذا خلص الستوك زر معطّل، وإلا زر "أضف للسلة" شغّال -->
                ${deleteBtn}
              </div>
            </div>
          `;

          productsContainer.appendChild(div);
          // ضيف البطاقة الكاملة للصفحة
        });
      })
      .catch(err => console.error("Products yüklenemedi:", err));
      // إذا صار خطأ بالاتصال، اطبعه بالـ console
  }


  // ─── تغيير الكمية المختارة قبل الإضافة للسلة ────────────
  window.changeQty = function(productId, delta, maxStock) {
    // productId = ID المنتج، delta = +1 أو -1، maxStock = أقصى كمية متاحة

    let qty = (selectedQty[productId] || 1) + delta;
    // الكمية الجديدة = الكمية الحالية + التغيير (زيادة أو نقصان)

    if (qty < 1) qty = 1;
    // ما بيصير الكمية تنزل تحت 1

    if (qty > maxStock) {
      showToast("⚠️ Stok limiti aşıldı!");
      qty = maxStock;
    }
    // إذا تجاوزت الكمية الستوك المتاح، أعد تحديدها بالحد الأقصى وبيّن تحذير

    selectedQty[productId] = qty;
    // احفظ الكمية الجديدة بالـ object

    const el = document.getElementById("qty-" + productId);
    // خذ عنصر الرقم الظاهر على الصفحة

    if (el) {
      el.textContent = qty;
      // حدّث الرقم الظاهر

      el.style.transform = "scale(1.4)";
      setTimeout(() => el.style.transform = "scale(1)", 180);
      // أضف أنيميشن نبضة صغيرة للرقم عند التغيير
    }
  };


  // ─── إضافة منتج للسلة ───────────────────────────────────
  window.addToCart = function(id) {
    const qty = selectedQty[id] || 1;
    // خذ الكمية المختارة لهاد المنتج، افتراضياً 1

    fetch("/api/cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ product_id: id, quantity: qty })
    })
    // بعت طلب POST للسيرفر عشان يضيف المنتج للسلة مع الكمية
      .then(res => res.json())
      .then(() => {
        selectedQty[id] = 1;
        // صفّر الكمية المختارة لهاد المنتج

        const el = document.getElementById("qty-" + id);
        if (el) el.textContent = 1;
        // رجّع الرقم الظاهر على الصفحة لـ 1

        loadCart();
        loadProducts();
        // حدّث السلة والمنتجات عشان تظهر الكميات الجديدة

        showToast(`✨ ${qty} adet ürün sepete eklendi`);
        // بيّن إشعار "تم إضافة X عدد للسلة"

        const badge = document.getElementById("cart-count");
        if (badge) {
          badge.classList.add("bounce");
          setTimeout(() => badge.classList.remove("bounce"), 400);
        }
        // أضف أنيميشن نبضة على عداد السلة (الرقم اللي بيظهر على أيقونة السلة)
      })
      .catch(() => showToast("⚠️ Bir hata oluştu"));
      // إذا صار خطأ، بيّن إشعار
  };


  // ─── حذف منتج كامل (للأدمين فقط) ──────────────────────
  window.deleteProduct = function(id) {
    if (!confirm("Ürünü silmek istiyor musun?")) return;
    // اسأل المستخدم تأكيد قبل الحذف، إذا ضغط "لا" وقف

    fetch(`/api/products/${id}`, {
      method: "DELETE",
      headers: { admin: "1234" }
      // ابعت مفتاح الأدمين بالـ headers عشان السيرفر يقبل الطلب
    })
      .then(res => res.json())
      .then(() => {
        loadProducts();
        loadCart();
        // حدّث المنتجات والسلة بعد الحذف

        showToast("🗑️ Ürün silindi");
        // بيّن إشعار "تم حذف المنتج"
      })
      .catch(err => console.error(err));
  };


  // ─── نموذج إضافة منتج جديد (للأدمين) ──────────────────
  const form = document.getElementById("productForm");
  if (form) {
    // إذا فيه نموذج إضافة منتج بالصفحة (يعني صفحة الأدمين)

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      // امنع الصفحة من الـ refresh الافتراضي عند الضغط على "إرسال"

      fetch("/api/products", {
        method: "POST",
        headers: { admin: "1234" },
        body: new FormData(form)
        // FormData بتجمع كل بيانات النموذج تلقائياً (اسم، سعر، صورة...)
      })
        .then(res => res.json())
        .then(() => {
          form.reset();
          // امسح النموذج بعد الإضافة الناجحة

          showToast("✅ Ürün eklendi!");
          // بيّن إشعار "تم إضافة المنتج"

          loadProducts();
          // حدّث قائمة المنتجات
        })
        .catch(() => showToast("⚠️ Ürün eklenemedi"));
    });
  }


  // ════════════════════════════════════════════════════════
  //  قسم السلة
  // ════════════════════════════════════════════════════════

  function loadCart() {
    // هاي الدالة بتجيب محتويات السلة وتعرضها

    fetch("/api/cart")
      .then(res => res.json())
      .then(items => {

        const totalQty = items.reduce((s, i) => s + (i.quantity || 1), 0);
        // احسب مجموع كل الكميات بالسلة
        // reduce = اجمع كل quantity مع بعض ابتداءً من 0

        document.getElementById("cart-count").innerText = totalQty;
        // حدّث عداد السلة الظاهر بالـ navbar

        cartContainer.innerHTML = "";
        // امسح المحتوى القديم

        if (items.length === 0) {
          cartContainer.innerHTML = `
            <div class="empty-state">
              <span class="empty-icon">🛒</span>
              <p>Sepetiniz boş. Ürünler sayfasından ekleyin!</p>
            </div>`;
          return;
          // إذا السلة فاضية، اعرض رسالة ووقف
        }

        // ─── ارسم قائمة منتجات السلة ──────────────────────
        const list = document.createElement("div");
        list.className = "cart-list";
        // اعمل div لقائمة العناصر

        let grandTotal = 0;
        // متغير لتجميع المبلغ الكلي

        items.forEach(item => {
          // لكل عنصر بالسلة، ارسم صف

          const qty       = item.quantity || 1;
          const unitPrice = Number(item.product.price);
          // سعر الوحدة
          const lineTotal = unitPrice * qty;
          // المجموع لهاد العنصر = سعر الوحدة × الكمية
          grandTotal += lineTotal;
          // ضيف للمجموع الكلي

          const imgHTML = item.product.image
            ? `<img src="${item.product.image}" alt="${item.product.name}">`
            : `<span class="cart-placeholder">💄</span>`;
          // صورة المنتج أو إيموجي بديل

          const div = document.createElement("div");
          div.className = "cart-item";
          div.dataset.price = unitPrice;
          // احفظ سعر الوحدة كـ data attribute على الـ div، بنحتاجه لحسابات لاحقة

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
            <!-- أزرار تغيير الكمية داخل السلة -->

            <div class="cart-line-total" id="cprice-${item.id}">₺${lineTotal.toFixed(2)}</div>
            <!-- مجموع سعر هاد العنصر = كمية × سعر -->

            <button class="cart-remove" onclick="removeFromCart(${item.id})" title="Çıkar">✕</button>
            <!-- زر حذف العنصر من السلة -->
          `;

          list.appendChild(div);
        });

        cartContainer.appendChild(list);
        // ضيف القائمة للصفحة

        // ─── بطاقة الملخص والمجموع ────────────────────────
        const summary = document.createElement("div");
        summary.className = "cart-summary";
        summary.id = "cart-summary-box";

        summary.innerHTML = `
          <div class="cart-summary-row">
            <span>Toplam Ürün</span>
            <span>${totalQty} adet</span>
          </div>
          <!-- عدد المنتجات الكلي -->

          <div class="cart-summary-row total">
            <span>Toplam Tutar</span>
            <span class="cart-total-amount" id="grand-total">₺${grandTotal.toFixed(2)}</span>
          </div>
          <!-- المبلغ الإجمالي -->

          <button class="btn-checkout" onclick="showToast('🎉 Sipariş özelliği yakında!')">
            ✨ Siparişi Tamamla
          </button>
          <!-- زر "أتمم الطلب" - لسا ما في منطق حقيقي وراه، بس بيبيّن رسالة -->
        `;

        cartContainer.appendChild(summary);
        // ضيف بطاقة الملخص للصفحة
      })
      .catch(err => console.error("Sepet yüklenemedi:", err));
  }


  // ─── تغيير كمية عنصر داخل السلة (فوري بالـ UI) ─────────
  window.changeCartQty = function(cartItemId, delta) {
    const qtyEl   = document.getElementById("cqty-" + cartItemId);
    const priceEl = document.getElementById("cprice-" + cartItemId);
    // خذ عنصر الكمية وعنصر السعر لهاد الصف

    if (!qtyEl) return;
    // إذا ما لقيناهم، وقف

    const currentQty = parseInt(qtyEl.textContent) || 1;
    const newQty     = currentQty + delta;
    // احسب الكمية الجديدة

    if (newQty < 1) {
      if (confirm("Ürünü sepetten çıkarmak istiyor musun?")) removeFromCart(cartItemId);
      return;
      // إذا الكمية راحت تحت 1، اسأل المستخدم إذا يريد يحذف العنصر
    }

    // ─── حدّث الـ UI فوراً بدون انتظار السيرفر ────────────
    qtyEl.textContent = newQty;
    qtyEl.style.transform = "scale(1.4)";
    setTimeout(() => qtyEl.style.transform = "scale(1)", 180);
    // حدّث الرقم وأضف أنيميشن نبضة

    if (priceEl) {
      const card = qtyEl.closest(".cart-item");
      const unitPrice = card ? parseFloat(card.dataset.price) : 0;
      priceEl.textContent = "₺" + (unitPrice * newQty).toFixed(2);
      // حدّث سعر الصف (سعر الوحدة × الكمية الجديدة)
    }

    recalcGrandTotal();
    // أعد حساب المجموع الكلي

    // ─── بعدها بعت الطلب للسيرفر ──────────────────────────
    fetch(`/api/cart/${cartItemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quantity: newQty })
      // PATCH = تحديث جزئي، بس بنغير الكمية
    })
      .then(res => res.json())
      .then(() => {
        const totalQty = Array.from(document.querySelectorAll(".cart-qty-val"))
          .reduce((s, el) => s + (parseInt(el.textContent) || 1), 0);
        document.getElementById("cart-count").innerText = totalQty;
        // بعد ما السيرفر يتأكد، حدّث عداد السلة بالـ navbar
      })
      .catch(() => loadCart());
      // إذا صار خطأ، أعد تحميل السلة من الأول
  };


  // ─── إعادة حساب المجموع الكلي بالصفحة ──────────────────
  function recalcGrandTotal() {
    let total = 0;
    document.querySelectorAll(".cart-item").forEach(card => {
      const price = parseFloat(card.dataset.price) || 0;
      const qty   = parseInt(card.querySelector(".cart-qty-val")?.textContent) || 1;
      total += price * qty;
      // لكل صف بالسلة: خذ السعر من dataset والكمية من الـ span، واجمعهم
    });
    const el = document.getElementById("grand-total");
    if (el) el.textContent = "₺" + total.toFixed(2);
    // حدّث رقم المجموع الظاهر
  }


  // ─── حذف عنصر كامل من السلة ─────────────────────────────
  window.removeFromCart = function(id) {
    fetch(`/api/cart/${id}`, { method: "DELETE" })
    // بعت طلب DELETE للسيرفر عشان يحذف العنصر
      .then(res => res.json())
      .then(() => {
        loadCart();
        loadProducts();
        // حدّث السلة والمنتجات (عشان يرجع الستوك للمنتج)

        showToast("🗑️ Ürün sepetten çıkarıldı");
        // بيّن إشعار "تم إزالة المنتج من السلة"
      })
      .catch(err => console.error(err));
  };


  // ════════════════════════════════════════════════════════
  //  التنقل بين التبويبات (Tabs)
  // ════════════════════════════════════════════════════════
  window.showTab = function(tabName) {
    document.querySelectorAll(".section").forEach(s => s.classList.remove("active"));
    // أخفي كل التبويبات

    document.querySelectorAll(".nav-tab").forEach(b => b.classList.remove("active"));
    // أزل التحديد من كل أزرار الـ nav

    document.getElementById("tab-" + tabName)?.classList.add("active");
    // أظهر التبويب المطلوب

    document.querySelector(`.nav-tab[onclick*="${tabName}"]`)?.classList.add("active");
    // فعّل زر الـ nav المرتبط بهاد التبويب

    if (tabName === "cart")     loadCart();
    if (tabName === "products") loadProducts();
    // إذا فتحت تبويب السلة أو المنتجات، حدّث بياناتهم من السيرفر
  };


  // ════════════════════════════════════════════════════════
  //  نظام الإشعارات (Toast)
  // ════════════════════════════════════════════════════════
  window.showToast = function(msg) {
    let toast = document.getElementById("toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "toast";
      toast.className = "toast";
      document.body.appendChild(toast);
      // إذا ما في عنصر toast بالصفحة، اعمله وضيفه
    }

    toast.textContent = msg;
    // حط الرسالة المطلوبة

    toast.classList.add("show");
    // أظهره (الـ CSS بيتحكم بالشكل والأنيميشن)

    clearTimeout(toast._t);
    // إذا في timer قديم شغّال، ألغيه عشان ما يتداخلوا

    toast._t = setTimeout(() => toast.classList.remove("show"), 2800);
    // بعد 2.8 ثانية، أخفي الإشعار تلقائياً
  };


  // ════════════════════════════════════════════════════════
  //  التشغيل الأولي — بيشتغلوا مباشرة لما تفتح الصفحة
  // ════════════════════════════════════════════════════════
  loadProducts();
  // جيب المنتجات من أول ما تفتح الصفحة

  loadCart();
  // جيب السلة عشان يتحدث العداد بالـ navbar

});
