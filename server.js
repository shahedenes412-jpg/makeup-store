// ════════════════════════════════════════════════════════════
//  استدعاء المكتبات اللي بنحتاجها
// ════════════════════════════════════════════════════════════

const express = require("express");
// express هي المكتبة الرئيسية اللي بتخلينا نعمل سيرفر ويب بسهولة

const fs = require("fs");
// fs اختصار FileSystem، بتخلينا نقرأ ونكتب ملفات على الجهاز

const path = require("path");
// path بتساعدنا نبني مسارات الملفات بشكل صح على أي نظام تشغيل

const multer = require("multer");
// multer مكتبة مخصصة لاستقبال رفع الملفات (صور وغيرها) من المستخدم


// ════════════════════════════════════════════════════════════
//  إعدادات أساسية للسيرفر
// ════════════════════════════════════════════════════════════

const ADMIN_KEY = "1234";
// هاد هو "الباسورد" السري للأدمين، أي طلب بده يعدل أو يحذف لازم يبعت هاد المفتاح

const app = express();
// هون بنشغل express ونحطه بمتغير اسمه app، هاد هو السيرفر تبعنا

const PORT = process.env.PORT || 3000;
// البورت (رقم الباب) اللي رح يشتغل عليه السيرفر
// إذا في بيئة الاستضافة حددت بورت تاني بيستخدمه، وإلا بيستخدم 3000

const DB_FILE = path.join(__dirname, "database.json");
// هاد هو مسار ملف قاعدة البيانات تبعتنا (بسيطة، مجرد ملف JSON)
// __dirname يعني المجلد اللي فيه هاد الملف


// ════════════════════════════════════════════════════════════
//  إعداد رفع الصور (Multer)
// ════════════════════════════════════════════════════════════

const storage = multer.diskStorage({
  // بنحدد كيف وين نحفظ الصور اللي بيرفعها المستخدم

  destination: (req, file, cb) => {
    // destination = وين نحفظ الصورة؟
    const uploadPath = path.join(__dirname, "public/uploads");
    // المسار هو مجلد public/uploads جنب ملفنا

    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
      // إذا المجلد مش موجود، اعمله (وكمان اعمل المجلدات الأب إذا ناقصة)
    }

    cb(null, uploadPath);
    // cb = callback، بنقول لـ multer "احفظ الصورة هون"
  },

  filename: (req, file, cb) => {
    // filename = شو اسم الملف اللي رح نحفظه؟
    const ext = path.extname(file.originalname);
    // استخرج امتداد الملف الأصلي (مثلاً .jpg أو .png)

    const unique = Date.now() + "-" + Math.round(Math.random() * 1e6);
    // اعمل رقم فريد من الوقت الحالي + رقم عشوائي، عشان ما يتكرر اسم الملف

    cb(null, unique + ext);
    // الاسم النهائي = الرقم الفريد + الامتداد (مثلاً: 1714000000-829341.jpg)
  },
});

const upload = multer({
  storage,
  // استخدم إعدادات الحفظ اللي عرفناها فوق

  fileFilter: (req, file, cb) => {
    // fileFilter = فلتر للتحقق من نوع الملف قبل ما نقبله
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    // هاي هي الأنواع المسموحة فقط

    if (allowed.includes(file.mimetype)) cb(null, true);
    // إذا نوع الملف من الأنواع المسموحة، اقبله (true)
    else cb(new Error("Sadece resim yüklenebilir"));
    // وإلا ارفضه وبعت رسالة خطأ "يمكن رفع الصور فقط" (بالتركي)
  },

  limits: { fileSize: 5 * 1024 * 1024 },
  // الحد الأقصى لحجم الملف = 5 ميغابايت (5 × 1024 × 1024 = 5MB)
});


// ════════════════════════════════════════════════════════════
//  Middleware (وسطاء - بيشتغلوا على كل طلب قبل ما يوصل للـ route)
// ════════════════════════════════════════════════════════════

app.use(express.json());
// هاد بيخلي السيرفر يفهم البيانات اللي بتيجي بصيغة JSON في جسم الطلب (req.body)

app.use(express.static(path.join(__dirname, "public")));
// أي ملف موجود بمجلد public (HTML, CSS, JS) بيتقدم للمستخدم مباشرة

app.use("/uploads", express.static(path.join(__dirname, "public/uploads")));
// أي صورة موجودة بمجلد uploads بتكون متاحة على الرابط /uploads/اسم_الصورة


// ════════════════════════════════════════════════════════════
//  دوال مساعدة لقراءة وحفظ قاعدة البيانات (ملف JSON)
// ════════════════════════════════════════════════════════════

function readDB() {
  // هاي الدالة بتقرأ ملف database.json وترجع البيانات
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
    // اقرأ الملف كنص، وحوله من JSON لـ Object جاهز للاستخدام
  } catch {
    return { products: [], cart: [], nextProductId: 1, nextCartId: 1 };
    // إذا صار خطأ (مثلاً الملف مش موجود)، ارجع قاعدة بيانات فاضية
  }
}

function saveDB(data) {
  // هاي الدالة بتحفظ البيانات على ملف database.json
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
  // حول الـ Object لـ JSON وكتبه على الملف (null, 2) عشان يكون مرتب وقابل للقراءة
}


// ════════════════════════════════════════════════════════════
//  API الخاصة بالمنتجات (PRODUCTS)
// ════════════════════════════════════════════════════════════

// ─── جلب كل المنتجات ───────────────────────────────────────
app.get("/api/products", (req, res) => {
  // أي حدا بيطلب GET على /api/products بيجيب قائمة المنتجات
  const db = readDB();
  // اقرأ قاعدة البيانات

  res.json(db.products);
  // ارجع المنتجات كـ JSON للمستخدم
});


// ─── إضافة منتج جديد (للأدمين فقط) ────────────────────────
app.post("/api/products", upload.single("image"), (req, res) => {
  // POST على /api/products لإضافة منتج، ومع رفع صورة وحدة اسم حقلها "image"

  if (req.headers.admin !== ADMIN_KEY) {
    return res.status(403).json({ error: "Admin only" });
    // إذا المفتاح السري في الـ header مش صح، ارفض الطلب (403 = ممنوع)
  }

  const { name, price, stock } = req.body;
  // استخرج اسم المنتج، سعره، وكميته من البيانات اللي بعتها المستخدم

  if (!name || isNaN(price)) {
    return res.status(400).json({ error: "Eksik veya hatalı veri" });
    // إذا الاسم ناقص أو السعر مش رقم، ارفض (400 = بيانات غلط)
  }

  const db = readDB();
  // اقرأ قاعدة البيانات الحالية

  const newProduct = {
    id: db.nextProductId++,
    // الـ ID هو الرقم التالي المتاح، وزيده بـ 1 للمنتج الجاي
    name,
    price: parseFloat(price),
    // حول السعر لرقم عشري (مثلاً "19.99" تصير 19.99)
    stock: parseInt(stock) || 0,
    // حول الكمية لرقم صحيح، وإذا ما في قيمة حطها 0
    image: req.file ? `/uploads/${req.file.filename}` : null,
    // إذا رُفعت صورة، احفظ مسارها، وإلا null
  };

  db.products.push(newProduct);
  // أضف المنتج الجديد على مصفوفة المنتجات

  saveDB(db);
  // احفظ قاعدة البيانات المحدثة

  res.status(201).json(newProduct);
  // ارجع المنتج الجديد (201 = تم الإنشاء بنجاح)
});


// ─── حذف منتج (للأدمين فقط) ────────────────────────────────
app.delete("/api/products/:id", (req, res) => {
  // DELETE على /api/products/رقم_المنتج لحذفه

  if (req.headers.admin !== ADMIN_KEY) {
    return res.status(403).json({ error: "Admin only" });
    // إذا مش أدمين، ارفض
  }

  const id = Number(req.params.id);
  // استخرج الـ ID من الرابط وحوله لرقم

  if (isNaN(id)) {
    return res.status(400).json({ error: "Geçersiz ID" });
    // إذا الـ ID مش رقم، ارفض
  }

  const db = readDB();

  const index = db.products.findIndex(p => p.id === id);
  // ابحث عن موقع المنتج في المصفوفة حسب الـ ID

  if (index === -1) {
    return res.status(404).json({ error: "Bulunamadı" });
    // إذا ما لقيناه (findIndex ترجع -1)، قول 404 = مش موجود
  }

  const product = db.products[index];
  // خذ بيانات المنتج

  if (product.image && product.image.startsWith("/uploads/")) {
    // إذا المنتج عنده صورة مرفوعة على السيرفر
    const imgPath = path.join(
      __dirname,
      "public",
      product.image.replace("/uploads/", "uploads/")
    );
    // بناء المسار الكامل للصورة على الجهاز

    if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
    // إذا الصورة موجودة، احذفها من الجهاز عشان ما يتراكم ملفات مش محتاجينها
  }

  db.products.splice(index, 1);
  // احذف المنتج من المصفوفة

  db.cart = db.cart.filter(item => item.product_id !== id);
  // احذف أي كميات من هاد المنتج موجودة بالسلة، مش معقول يضل بالسلة وهو محذوف

  saveDB(db);
  // احفظ التغييرات

  res.json({ message: "Silindi" });
  // قول "تم الحذف"
});


// ─── تعديل منتج (للأدمين فقط) ──────────────────────────────
app.put("/api/products/:id", (req, res) => {
  // PUT على /api/products/رقم_المنتج لتعديل بياناته

  if (req.headers.admin !== ADMIN_KEY) {
    return res.status(403).json({ error: "Admin only" });
  }

  const id = Number(req.params.id);

  if (isNaN(id)) {
    return res.status(400).json({ error: "Geçersiz ID" });
  }

  const db = readDB();

  const product = db.products.find(p => p.id === id);
  // ابحث عن المنتج مباشرة (مش محتاج الـ index هون)

  if (!product) {
    return res.status(404).json({ error: "Bulunamadı" });
  }

  if (req.body.price && isNaN(req.body.price)) {
    return res.status(400).json({ error: "Fiyat hatalı" });
    // إذا أرسلوا سعر بس هو مش رقم، ارفض
  }

  product.name = req.body.name || product.name;
  // عدّل الاسم إذا أرسلوا اسم جديد، وإلا خلي القديم

  product.price = req.body.price ? parseFloat(req.body.price) : product.price;
  // عدّل السعر إذا أرسلوا سعر جديد، وإلا خلي القديم

  product.stock =
    req.body.stock !== undefined ? parseInt(req.body.stock) : product.stock;
  // عدّل الكمية إذا أرسلوا قيمة (حتى لو 0)، وإلا خلي القديمة

  saveDB(db);
  // احفظ التعديلات

  res.json(product);
  // ارجع المنتج بعد التعديل
});


// ════════════════════════════════════════════════════════════
//  API الخاصة بالسلة (CART)
// ════════════════════════════════════════════════════════════

// ─── جلب محتويات السلة ─────────────────────────────────────
app.get("/api/cart", (req, res) => {
  const db = readDB();

  const result = db.cart.map(item => {
    // لكل عنصر بالسلة، ابحث عن بيانات المنتج المرتبط فيه
    const product = db.products.find(p => p.id === item.product_id);

    return { ...item, product };
    // ارجع بيانات العنصر + بيانات المنتج كاملة مدموجين مع بعض
  });

  res.json(result);
  // ابعت السلة للمستخدم
});


// ─── إضافة منتج للسلة ──────────────────────────────────────
app.post("/api/cart", (req, res) => {
  const { product_id } = req.body;
  // استخرج ID المنتج اللي بدنا نضيفه للسلة

  const db = readDB();

  const product = db.products.find(p => p.id === product_id);
  // ابحث عن المنتج

  if (!product) {
    return res.status(404).json({ error: "Ürün yok" });
    // إذا المنتج مش موجود، ارفض
  }

  if (product.stock <= 0) {
    return res.status(400).json({ error: "Stok yok" });
    // إذا الكمية خلصت، ارفض
  }

  const existing = db.cart.find(i => i.product_id === product_id);
  // شوف إذا المنتج هاد موجود مسبقاً بالسلة

  if (existing) {
    existing.quantity += 1;
    // إذا موجود، زيد الكمية بـ 1
  } else {
    db.cart.push({
      id: db.nextCartId++,
      // ID جديد للعنصر بالسلة
      product_id,
      quantity: 1,
    });
    // إذا مش موجود، أضف عنصر جديد للسلة بكمية 1
  }

  product.stock -= 1;
  // نقص كمية المنتج بـ 1 لأنه صار محجوز بالسلة

  saveDB(db);
  // احفظ التغييرات

  res.json({ message: "Eklendi" });
  // "تمت الإضافة"
});


// ─── حذف عنصر من السلة ─────────────────────────────────────
app.delete("/api/cart/:id", (req, res) => {
  // DELETE على /api/cart/رقم_العنصر لحذفه من السلة

  const id = Number(req.params.id);
  // استخرج ID العنصر من الرابط

  if (isNaN(id)) {
    return res.status(400).json({ error: "Geçersiz ID" });
  }

  const db = readDB();

  const index = db.cart.findIndex(i => i.id === id);
  // ابحث عن العنصر بالسلة

  if (index === -1) {
    return res.status(404).json({ error: "Yok" });
    // إذا مش موجود، قول 404
  }

  const item = db.cart[index];
  // خذ بيانات العنصر (فيها الكمية)

  const product = db.products.find(p => p.id === item.product_id);
  // ابحث عن المنتج المرتبط

  if (product) {
    product.stock += item.quantity;
    // رجّع الكمية المحجوزة للمخزون، لأن العنصر اتحذف من السلة
  }

  db.cart.splice(index, 1);
  // احذف العنصر من السلة

  saveDB(db);
  // احفظ التغييرات

  res.json({ message: "Silindi" });
  // "تم الحذف"
});


// ════════════════════════════════════════════════════════════
//  معالجة أخطاء رفع الصور
// ════════════════════════════════════════════════════════════

app.use((err, req, res, next) => {
  // هاد Middleware بيشتغل بس إذا صار خطأ بأي route فوق

  if (err instanceof multer.MulterError || err.message.includes("resim")) {
    return res.status(400).json({ error: err.message });
    // إذا الخطأ من multer (مثلاً الملف كبير) أو فيه كلمة "resim" (صورة بالتركي)
    // ارجع رسالة الخطأ بشكل واضح
  }
  next(err);
  // إذا الخطأ من نوع ثاني، مررّه للـ middleware الجاي
});


// ════════════════════════════════════════════════════════════
//  تشغيل السيرفر
// ════════════════════════════════════════════════════════════

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  // شغّل السيرفر على البورت المحدد، ولما يبدأ اطبع رسالة تأكيد
});
