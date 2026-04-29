const mongoose = require('mongoose');

const targetSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  namaBarang: {
    type: String,
    required: true,
    trim: true
  },
  target: {
    type: Number,
    required: true,
    min: 1
  },
  tipe: {
    type: String,
    enum: ['Harian', 'Mingguan', 'Bulanan'],
    required: true
  },
  perPeriode: {
    type: Number,
    required: true,
    min: 1
  },
  totalTabungan: {
    type: Number,
    default: 0,
    min: 0
  },
  progress: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  gambar: {
    type: String,
    default: null
  },
  status: {
    type: String,
    enum: ['aktif', 'selesai'],
    default: 'aktif'
  },
  estimasiHari: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Pre-save middleware untuk hitung estimasi hari
targetSchema.pre('save', function(next) {
  if (this.perPeriode > 0) {
    const sisa = this.target - this.totalTabungan;
    if (sisa > 0) {
      let periodeDalamHari = 1;
      switch(this.tipe) {
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
      this.estimasiHari = Math.ceil(sisa / this.perPeriode) * periodeDalamHari;
    } else {
      this.estimasiHari = 0;
    }
  }
  next();
});

module.exports = mongoose.model('Target', targetSchema);
