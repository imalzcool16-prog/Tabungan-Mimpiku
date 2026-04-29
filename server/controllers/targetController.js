const Target = require('../models/Target');
const path = require('path');
const fs = require('fs');

// Get all targets for logged in user
exports.getTargets = async (req, res) => {
  try {
    const { status } = req.query;
    let query = { userId: req.userId };
    
    if (status) {
      query.status = status;
    }

    const targets = await Target.find(query).sort({ createdAt: -1 });
    res.json(targets);
  } catch (error) {
    res.status(500).json({ message: 'Terjadi kesalahan server', error: error.message });
  }
};

// Get single target
exports.getTarget = async (req, res) => {
  try {
    const target = await Target.findOne({
      _id: req.params.id,
      userId: req.userId
    });

    if (!target) {
      return res.status(404).json({ message: 'Target tidak ditemukan' });
    }

    res.json(target);
  } catch (error) {
    res.status(500).json({ message: 'Terjadi kesalahan server', error: error.message });
  }
};

// Create new target
exports.createTarget = async (req, res) => {
  try {
    const { namaBarang, target, tipe, perPeriode } = req.body;

    // Validasi input
    if (!namaBarang || !target || !tipe || !perPeriode) {
      return res.status(400).json({ message: 'Semua field wajib diisi' });
    }

    if (target < 1) {
      return res.status(400).json({ message: 'Target harus lebih dari 0' });
    }

    if (perPeriode < 1) {
      return res.status(400).json({ message: 'Jumlah tabungan per periode harus lebih dari 0' });
    }

    // Hitung estimasi hari
    let periodeDalamHari = 1;
    switch(tipe) {
      case 'Harian':
        periodeDalamHari = 1;
        break;
      case 'Mingguan':
        periodeDalamHari = 7;
        break;
      case 'Bulanan':
        periodeDalamHari = 30;
        break;
    }
    const estimasiHari = Math.ceil(target / perPeriode) * periodeDalamHari;

    // Handle gambar
    let gambarPath = null;
    if (req.file) {
      gambarPath = `/uploads/${req.file.filename}`;
    }

    const newTarget = new Target({
      userId: req.userId,
      namaBarang,
      target: Number(target),
      tipe,
      perPeriode: Number(perPeriode),
      totalTabungan: 0,
      progress: 0,
      gambar: gambarPath,
      status: 'aktif',
      estimasiHari
    });

    await newTarget.save();

    res.status(201).json({
      message: 'Target tabungan berhasil dibuat',
      target: newTarget
    });
  } catch (error) {
    console.error('Create target error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan server', error: error.message });
  }
};

// Update target (tambah tabungan)
exports.updateTarget = async (req, res) => {
  try {
    const { tambahan, tandaiSelesai } = req.body;

    const target = await Target.findOne({
      _id: req.params.id,
      userId: req.userId
    });

    if (!target) {
      return res.status(404).json({ message: 'Target tidak ditemukan' });
    }

    // Jika tandai selesai
    if (tandaiSelesai) {
      target.totalTabungan = target.target;
      target.progress = 100;
      target.status = 'selesai';
      target.estimasiHari = 0;
    } else if (tambahan && tambahan > 0) {
      // Tambah tabungan
      target.totalTabungan += Number(tambahan);
      
      // Hitung progress
      target.progress = Math.min(Math.round((target.totalTabungan / target.target) * 100), 100);
      
      // Cek apakah sudah tercapai
      if (target.totalTabungan >= target.target) {
        target.status = 'selesai';
        target.totalTabungan = target.target;
        target.progress = 100;
        target.estimasiHari = 0;
      }
    }

    await target.save();

    res.json({
      message: 'Target berhasil diupdate',
      target
    });
  } catch (error) {
    res.status(500).json({ message: 'Terjadi kesalahan server', error: error.message });
  }
};

// Delete target
exports.deleteTarget = async (req, res) => {
  try {
    const target = await Target.findOne({
      _id: req.params.id,
      userId: req.userId
    });

    if (!target) {
      return res.status(404).json({ message: 'Target tidak ditemukan' });
    }

    // Hapus gambar jika ada
    if (target.gambar) {
      const gambarPath = path.join(__dirname, '../../public', target.gambar);
      if (fs.existsSync(gambarPath)) {
        fs.unlinkSync(gambarPath);
      }
    }

    await Target.deleteOne({ _id: req.params.id });

    res.json({ message: 'Target berhasil dihapus' });
  } catch (error) {
    res.status(500).json({ message: 'Terjadi kesalahan server', error: error.message });
  }
};

// Get stats
exports.getStats = async (req, res) => {
  try {
    const totalTarget = await Target.countDocuments({ userId: req.userId });
    const targetAktif = await Target.countDocuments({ userId: req.userId, status: 'aktif' });
    const targetSelesai = await Target.countDocuments({ userId: req.userId, status: 'selesai' });
    
    const targets = await Target.find({ userId: req.userId });
    const totalTabungan = targets.reduce((sum, t) => sum + t.totalTabungan, 0);

    res.json({
      totalTarget,
      targetAktif,
      targetSelesai,
      totalTabungan
    });
  } catch (error) {
    res.status(500).json({ message: 'Terjadi kesalahan server', error: error.message });
  }
};
