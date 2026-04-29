const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files untuk uploads dan public
app.use("/uploads", express.static(path.join(__dirname, "../public/uploads")));
app.use(express.static(path.join(__dirname, "../public")));

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || "tabungan_mimpiku_secret_key_2024";

// In-Memory Database (fallback jika MongoDB tidak tersedia)
const memoryDB = {
  users: [],
  targets: [],
  nextUserId: 1,
  nextTargetId: 1,
};

// MongoDB Connection Status
let useMongoDB = false;

// MongoDB Connection
const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/tabungan_mimpiku";

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log("MongoDB Connected Successfully");
    useMongoDB = true;

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Database mode: MongoDB`);
    });
  })
  .catch((err) => {
    console.log("MongoDB not available, using in-memory database");
    console.log("Connection error:", err.message);

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Database mode: In-Memory (Demo)`);
    });
  });

// Helper Functions untuk In-Memory DB
function generateToken(userId, username) {
  return jwt.sign({ userId, username }, JWT_SECRET, { expiresIn: "24h" });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

function authMiddleware(req, res, next) {
  const token = req.header("Authorization")?.replace("Bearer ", "");

  if (!token) {
    return res
      .status(401)
      .json({ message: "Akses ditolak. Token tidak ditemukan." });
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ message: "Token tidak valid." });
  }

  req.userId = decoded.userId;
  req.username = decoded.username;
  next();
}

// ============================================
// AUTH ROUTES (In-Memory & MongoDB)
// ============================================

// Register
app.post("/api/auth/register", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res
        .status(400)
        .json({ message: "Username dan password wajib diisi" });
    }

    if (username.length < 3) {
      return res.status(400).json({ message: "Username minimal 3 karakter" });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password minimal 6 karakter" });
    }

    if (useMongoDB) {
      const User = require("./models/User");
      const existingUser = await User.findOne({ username });
      if (existingUser) {
        return res.status(400).json({ message: "Username sudah terdaftar" });
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      const user = new User({ username, password: hashedPassword });
      await user.save();

      const token = generateToken(user._id.toString(), user.username);

      res.status(201).json({
        message: "Registrasi berhasil",
        token,
        user: { id: user._id, username: user.username },
      });
    } else {
      // In-Memory
      const existingUser = memoryDB.users.find((u) => u.username === username);
      if (existingUser) {
        return res.status(400).json({ message: "Username sudah terdaftar" });
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      const user = {
        _id: memoryDB.nextUserId.toString(),
        username,
        password: hashedPassword,
        createdAt: new Date(),
      };

      memoryDB.users.push(user);
      memoryDB.nextUserId++;

      const token = generateToken(user._id, user.username);

      res.status(201).json({
        message: "Registrasi berhasil",
        token,
        user: { id: user._id, username: user.username },
      });
    }
  } catch (error) {
    console.error("Register error:", error);
    res
      .status(500)
      .json({ message: "Terjadi kesalahan server", error: error.message });
  }
});

// Login
app.post("/api/auth/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res
        .status(400)
        .json({ message: "Username dan password wajib diisi" });
    }

    if (useMongoDB) {
      const User = require("./models/User");
      const user = await User.findOne({ username });
      if (!user) {
        return res
          .status(400)
          .json({ message: "Username atau password salah" });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res
          .status(400)
          .json({ message: "Username atau password salah" });
      }

      const token = generateToken(user._id.toString(), user.username);

      res.json({
        message: "Login berhasil",
        token,
        user: { id: user._id, username: user.username },
      });
    } else {
      // In-Memory
      const user = memoryDB.users.find((u) => u.username === username);
      if (!user) {
        return res
          .status(400)
          .json({ message: "Username atau password salah" });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res
          .status(400)
          .json({ message: "Username atau password salah" });
      }

      const token = generateToken(user._id, user.username);

      res.json({
        message: "Login berhasil",
        token,
        user: { id: user._id, username: user.username },
      });
    }
  } catch (error) {
    console.error("Login error:", error);
    res
      .status(500)
      .json({ message: "Terjadi kesalahan server", error: error.message });
  }
});

// Get Me
app.get("/api/auth/me", authMiddleware, async (req, res) => {
  try {
    if (useMongoDB) {
      const User = require("./models/User");
      const user = await User.findById(req.userId).select("-password");
      if (!user) {
        return res.status(404).json({ message: "User tidak ditemukan" });
      }
      res.json(user);
    } else {
      const user = memoryDB.users.find((u) => u._id === req.userId);
      if (!user) {
        return res.status(404).json({ message: "User tidak ditemukan" });
      }
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    }
  } catch (error) {
    res
      .status(500)
      .json({ message: "Terjadi kesalahan server", error: error.message });
  }
});

// ============================================
// TARGET ROUTES (In-Memory & MongoDB)
// ============================================

const multer = require("multer");
const fs = require("fs");

// Konfigurasi storage untuk multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "../public/uploads"));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, "target-" + uniqueSuffix + ext);
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Hanya file gambar yang diizinkan"), false);
    }
  },
});

// Get all targets
app.get("/api/targets", authMiddleware, async (req, res) => {
  try {
    const { status } = req.query;

    if (useMongoDB) {
      const Target = require("./models/Target");
      let query = { userId: req.userId };
      if (status) query.status = status;
      const targets = await Target.find(query).sort({ createdAt: -1 });
      res.json(targets);
    } else {
      // In-Memory
      let targets = memoryDB.targets.filter((t) => t.userId === req.userId);
      if (status) {
        targets = targets.filter((t) => t.status === status);
      }
      targets.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      res.json(targets);
    }
  } catch (error) {
    res
      .status(500)
      .json({ message: "Terjadi kesalahan server", error: error.message });
  }
});

// Get stats
app.get("/api/targets/stats", authMiddleware, async (req, res) => {
  try {
    if (useMongoDB) {
      const Target = require("./models/Target");
      const totalTarget = await Target.countDocuments({ userId: req.userId });
      const targetAktif = await Target.countDocuments({
        userId: req.userId,
        status: "aktif",
      });
      const targetSelesai = await Target.countDocuments({
        userId: req.userId,
        status: "selesai",
      });
      const targets = await Target.find({ userId: req.userId });
      const totalTabungan = targets.reduce(
        (sum, t) => sum + t.totalTabungan,
        0,
      );

      res.json({ totalTarget, targetAktif, targetSelesai, totalTabungan });
    } else {
      // In-Memory
      const userTargets = memoryDB.targets.filter(
        (t) => t.userId === req.userId,
      );
      const totalTarget = userTargets.length;
      const targetAktif = userTargets.filter(
        (t) => t.status === "aktif",
      ).length;
      const targetSelesai = userTargets.filter(
        (t) => t.status === "selesai",
      ).length;
      const totalTabungan = userTargets.reduce(
        (sum, t) => sum + t.totalTabungan,
        0,
      );

      res.json({ totalTarget, targetAktif, targetSelesai, totalTabungan });
    }
  } catch (error) {
    res
      .status(500)
      .json({ message: "Terjadi kesalahan server", error: error.message });
  }
});

// Create target
app.post(
  "/api/targets",
  authMiddleware,
  upload.single("gambar"),
  async (req, res) => {
    try {
      const { namaBarang, target, tipe, perPeriode } = req.body;

      if (!namaBarang || !target || !tipe || !perPeriode) {
        return res.status(400).json({ message: "Semua field wajib diisi" });
      }

      const targetNum = Number(target);
      const perPeriodeNum = Number(perPeriode);

      if (targetNum < 1) {
        return res.status(400).json({ message: "Target harus lebih dari 0" });
      }

      if (perPeriodeNum < 1) {
        return res
          .status(400)
          .json({ message: "Jumlah tabungan per periode harus lebih dari 0" });
      }

      // Hitung estimasi hari
      let periodeDalamHari = 1;
      switch (tipe) {
        case "Harian":
          periodeDalamHari = 1;
          break;
        case "Mingguan":
          periodeDalamHari = 7;
          break;
        case "Bulanan":
          periodeDalamHari = 30;
          break;
      }
      const estimasiHari =
        Math.ceil(targetNum / perPeriodeNum) * periodeDalamHari;

      const gambarPath = req.file ? `/uploads/${req.file.filename}` : null;

      if (useMongoDB) {
        const Target = require("./models/Target");
        const newTarget = new Target({
          userId: req.userId,
          namaBarang,
          target: targetNum,
          tipe,
          perPeriode: perPeriodeNum,
          totalTabungan: 0,
          progress: 0,
          gambar: gambarPath,
          status: "aktif",
          estimasiHari,
        });

        await newTarget.save();
        res.status(201).json({
          message: "Target tabungan berhasil dibuat",
          target: newTarget,
        });
      } else {
        // In-Memory
        const newTarget = {
          _id: memoryDB.nextTargetId.toString(),
          userId: req.userId,
          namaBarang,
          target: targetNum,
          tipe,
          perPeriode: perPeriodeNum,
          totalTabungan: 0,
          progress: 0,
          gambar: gambarPath,
          status: "aktif",
          estimasiHari,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        memoryDB.targets.push(newTarget);
        memoryDB.nextTargetId++;

        res.status(201).json({
          message: "Target tabungan berhasil dibuat",
          target: newTarget,
        });
      }
    } catch (error) {
      console.error("Create target error:", error);
      res
        .status(500)
        .json({ message: "Terjadi kesalahan server", error: error.message });
    }
  },
);

// Update target
app.put("/api/targets/:id", authMiddleware, async (req, res) => {
  try {
    const { tambahan, tandaiSelesai } = req.body;

    if (useMongoDB) {
      const Target = require("./models/Target");
      const target = await Target.findOne({
        _id: req.params.id,
        userId: req.userId,
      });

      if (!target) {
        return res.status(404).json({ message: "Target tidak ditemukan" });
      }

      if (tandaiSelesai) {
        target.totalTabungan = target.target;
        target.progress = 100;
        target.status = "selesai";
        target.estimasiHari = 0;
      } else if (tambahan && tambahan > 0) {
        target.totalTabungan += Number(tambahan);
        target.progress = Math.min(
          Math.round((target.totalTabungan / target.target) * 100),
          100,
        );

        if (target.totalTabungan >= target.target) {
          target.status = "selesai";
          target.totalTabungan = target.target;
          target.progress = 100;
          target.estimasiHari = 0;
        }
      }

      await target.save();
      res.json({ message: "Target berhasil diupdate", target });
    } else {
      // In-Memory
      const target = memoryDB.targets.find(
        (t) => t._id === req.params.id && t.userId === req.userId,
      );

      if (!target) {
        return res.status(404).json({ message: "Target tidak ditemukan" });
      }

      if (tandaiSelesai) {
        target.totalTabungan = target.target;
        target.progress = 100;
        target.status = "selesai";
        target.estimasiHari = 0;
      } else if (tambahan && tambahan > 0) {
        target.totalTabungan += Number(tambahan);
        target.progress = Math.min(
          Math.round((target.totalTabungan / target.target) * 100),
          100,
        );

        if (target.totalTabungan >= target.target) {
          target.status = "selesai";
          target.totalTabungan = target.target;
          target.progress = 100;
          target.estimasiHari = 0;
        }
      }

      target.updatedAt = new Date();
      res.json({ message: "Target berhasil diupdate", target });
    }
  } catch (error) {
    res
      .status(500)
      .json({ message: "Terjadi kesalahan server", error: error.message });
  }
});

// Delete target
app.delete("/api/targets/:id", authMiddleware, async (req, res) => {
  try {
    if (useMongoDB) {
      const Target = require("./models/Target");
      const target = await Target.findOne({
        _id: req.params.id,
        userId: req.userId,
      });

      if (!target) {
        return res.status(404).json({ message: "Target tidak ditemukan" });
      }

      if (target.gambar) {
        const gambarPath = path.join(__dirname, "../public", target.gambar);
        if (fs.existsSync(gambarPath)) {
          fs.unlinkSync(gambarPath);
        }
      }

      await Target.deleteOne({ _id: req.params.id });
      res.json({ message: "Target berhasil dihapus" });
    } else {
      // In-Memory
      const targetIndex = memoryDB.targets.findIndex(
        (t) => t._id === req.params.id && t.userId === req.userId,
      );

      if (targetIndex === -1) {
        return res.status(404).json({ message: "Target tidak ditemukan" });
      }

      const target = memoryDB.targets[targetIndex];
      if (target.gambar) {
        const gambarPath = path.join(__dirname, "../public", target.gambar);
        if (fs.existsSync(gambarPath)) {
          fs.unlinkSync(gambarPath);
        }
      }

      memoryDB.targets.splice(targetIndex, 1);
      res.json({ message: "Target berhasil dihapus" });
    }
  } catch (error) {
    res
      .status(500)
      .json({ message: "Terjadi kesalahan server", error: error.message });
  }
});

// ============================================
// STATIC FILE ROUTES
// ============================================

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/login.html"));
});

app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/login.html"));
});

app.get("/register", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/register.html"));
});

app.get("/dashboard", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/dashboard.html"));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res
    .status(500)
    .json({ message: "Something went wrong!", error: err.message });
});

const PORT = process.env.PORT || 3000;
