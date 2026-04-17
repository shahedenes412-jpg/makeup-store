const express = require("express");

const fs = require("fs");

const path = require("path");

const multer = require("multer");

const ADMIN_KEY = "1234";

const app = express();

const PORT = process.env.PORT || 3000;

const DB_FILE = path.join(__dirname, "database.json");



// ─── Multer (Image Upload) ─────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, "public/uploads");

    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }

    cb(null, uploadPath);
  },

  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);

    const unique = Date.now() + "-" + Math.round(Math.random() * 1e6);

    cb(null, unique + ext);
  },
});

const upload = multer({
  storage,

  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];

    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error("Sadece resim yüklenebilir"));
  },

  limits: { fileSize: 5 * 1024 * 1024 },
});



// ─── Middleware ────────────────────────────────────────
app.use(express.json());

app.use(express.static(path.join(__dirname, "public")));

app.use("/uploads", express.static(path.join(__dirname, "public/uploads")));


// ─── Database Helpers ──────────────────────────────────
function readDB() {
  return JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
}

function saveDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}



// ─── PRODUCTS ──────────────────────────────────────────

// GET
app.get("/api/products", (req, res) => {
  const db = readDB();

  res.json(db.products);
});



// POST (ADMIN)
app.post("/api/products", upload.single("image"), (req, res) => {
  if (req.headers.admin !== ADMIN_KEY) {
    return res.status(403).json({ error: "Admin only" });
  }

  const { name, price, stock } = req.body;

  if (!name || !price) {
    return res.status(400).json({ error: "Eksik veri" });
  }

  const db = readDB();

  const newProduct = {
    id: db.nextProductId++,
    name,
    price: parseFloat(price),
    stock: parseInt(stock) || 0,
    image: req.file ? `/uploads/${req.file.filename}` : null,
  };

  db.products.push(newProduct);

  saveDB(db);

  res.status(201).json(newProduct);
});



// DELETE (ADMIN)
app.delete("/api/products/:id", (req, res) => {
  if (req.headers.admin !== ADMIN_KEY) {
    return res.status(403).json({ error: "Admin only" });
  }

  const id = parseInt(req.params.id);

  const db = readDB();

  const index = db.products.findIndex(p => p.id === id);

  if (index === -1) {
    return res.status(404).json({ error: "Bulunamadı" });
  }

  const product = db.products[index];

  if (product.image && product.image.startsWith("/uploads/")) {
    const imgPath = path.join(__dirname, "public", product.image);

    if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
  }

  db.products.splice(index, 1);

  db.cart = db.cart.filter(item => item.product_id !== id);

  saveDB(db);

  res.json({ message: "Silindi" });
});



// PUT (ADMIN)
app.put("/api/products/:id", (req, res) => {
  if (req.headers.admin !== ADMIN_KEY) {
    return res.status(403).json({ error: "Admin only" });
  }

  const id = parseInt(req.params.id);

  const db = readDB();

  const product = db.products.find(p => p.id === id);

  if (!product) {
    return res.status(404).json({ error: "Bulunamadı" });
  }

  product.name = req.body.name || product.name;

  product.price = req.body.price ? parseFloat(req.body.price) : product.price;

  product.stock =
    req.body.stock !== undefined ? parseInt(req.body.stock) : product.stock;

  saveDB(db);

  res.json(product);
});



// ─── CART ──────────────────────────────────────────────

// GET
app.get("/api/cart", (req, res) => {
  const db = readDB();

  const result = db.cart.map(item => {
    const product = db.products.find(p => p.id === item.product_id);

    return { ...item, product };
  });

  res.json(result);
});



// POST
app.post("/api/cart", (req, res) => {
  const { product_id } = req.body;

  const db = readDB();

  const product = db.products.find(p => p.id === product_id);

  if (!product) {
    return res.status(404).json({ error: "Ürün yok" });
  }

  if (product.stock <= 0) {
    return res.status(400).json({ error: "Stok yok" });
  }

  const existing = db.cart.find(i => i.product_id === product_id);

  if (existing) {
    existing.quantity += 1;
  } else {
    db.cart.push({
      id: db.nextCartId++,
      product_id,
      quantity: 1,
    });
  }

  product.stock -= 1;

  saveDB(db);

  res.json({ message: "Eklendi" });
});



// DELETE
app.delete("/api/cart/:id", (req, res) => {
  const id = parseInt(req.params.id);

  const db = readDB();

  const index = db.cart.findIndex(i => i.id === id);

  if (index === -1) {
    return res.status(404).json({ error: "Yok" });
  }

  const item = db.cart[index];

  const product = db.products.find(p => p.id === item.product_id);

  if (product) {
    product.stock += item.quantity;
  }

  db.cart.splice(index, 1);

  saveDB(db);

  res.json({ message: "Silindi" });
});



// ─── START ─────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
