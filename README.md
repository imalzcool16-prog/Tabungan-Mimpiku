# Tabungan Mimpiku

Aplikasi web fullstack untuk membantu user membuat target tabungan untuk membeli barang impian.

## Fitur

- **Autentikasi**: Login & Register dengan JWT
- **Target Tabungan**: Buat, edit, hapus target tabungan
- **Upload Gambar**: Upload gambar barang impian
- **Progress Tracking**: Pantau progress tabungan dengan progress bar animasi
- **Estimasi Waktu**: Hitung estimasi hari tercapai
- **Responsive Design**: Tampilan optimal di desktop dan mobile

## Tech Stack

### Backend

- Node.js
- Express.js
- MongoDB + Mongoose
- JWT Authentication
- bcrypt.js (password hashing)
- Multer (file upload)

### Frontend

- HTML5
- CSS3 (Pure CSS, no framework)
- Vanilla JavaScript
- Responsive Design

## Instalasi

1. Clone repository

```bash
git clone <repository-url>
cd tabungan-mimpiku
```

2. Install dependencies

```bash
npm run install:all
```

3. Konfigurasi environment variables

```bash
cp server/.env.example server/.env
# Edit server/.env sesuai konfigurasi Anda
```

4. Jalankan aplikasi

```bash
npm start
```

Aplikasi akan berjalan di `http://localhost:3000`

## API Endpoints

### Auth

- `POST /api/auth/register` - Register user baru
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user (protected)

### Targets

- `GET /api/targets` - Get all targets (protected)
- `GET /api/targets/:id` - Get single target (protected)
- `POST /api/targets` - Create new target (protected)
- `PUT /api/targets/:id` - Update target (protected)
- `DELETE /api/targets/:id` - Delete target (protected)
- `GET /api/targets/stats` - Get statistics (protected)

## Struktur Folder

```
tabungan-mimpiku/
├── server/
│   ├── controllers/
│   │   ├── authController.js
│   │   └── targetController.js
│   ├── middleware/
│   │   ├── auth.js
│   │   └── upload.js
│   ├── models/
│   │   ├── User.js
│   │   └── Target.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   └── targetRoutes.js
│   ├── .env
│   ├── package.json
│   └── server.js
├── public/
│   ├── css/
│   │   └── style.css
│   ├── js/
│   │   ├── auth.js
│   │   └── dashboard.js
│   ├── uploads/
│   ├── login.html
│   ├── register.html
│   └── dashboard.html
├── package.json
└── README.md
```

## Design System

- **Warna Utama**: Biru muda soft (#9BBBD4)
- **Warna Sekunder**: Putih, Abu muda (#f5f5f5)
- **Border Radius**: 12px - 20px
- **Shadow**: Soft blur
- **Font**: Poppins / Inter

## Lisensi

MIT License

![Repo Size](https://img.shields.io/github/repo-size/imalzcool16-prog/Tabungan-Mimpiku)
![Last Commit](https://img.shields.io/github/last-commit/imalzcool16-prog/Tabungan-Mimpiku)
