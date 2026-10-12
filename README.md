# Spiral Sounds

Spiral Sounds adalah aplikasi toko online sederhana untuk menjelajahi dan membeli piringan hitam vinyl. Aplikasi menyediakan katalog dengan pencarian dan filter genre, akun pengguna, serta keranjang belanja yang tersimpan di SQLite.

## Fitur

- Melihat katalog vinyl, mencari berdasarkan judul, artis, atau genre, dan memfilter berdasarkan genre.
- Mendaftar dan masuk menggunakan akun pengguna.
- Menambahkan produk ke keranjang dan melihat jumlah item.
- Melihat dan menghapus item keranjang, termasuk mengosongkan seluruh keranjang.
- Menyimpan akun, katalog, dan keranjang di database SQLite.

## Teknologi

- Node.js dengan Express 5
- SQLite melalui `sqlite` dan `sqlite3`
- Session berbasis cookie dengan `express-session`
- HTML, CSS, dan JavaScript

## Persiapan

Pastikan Node.js dan npm sudah terpasang. Dari direktori proyek, pasang dependensi:

```bash
npm install
```

Siapkan file `.env` dari contoh yang tersedia:

```powershell
Copy-Item .env.example .env
```

Atur nilai `SPIRAL_SESSION_SECRET` di `.env` dengan string acak yang kuat. `PORT` bersifat opsional dan default-nya `8000`.

```env
PORT=8000
SPIRAL_SESSION_SECRET=ganti-dengan-string-acak-yang-kuat
```

### Menyiapkan database baru

Database menggunakan file `database.db` di direktori proyek. Jika belum memiliki database beserta tabelnya, jalankan perintah berikut **satu kali** dari direktori proyek:

```bash
node sql/productTable/createTable.js
node sql/userTable/createTable.js
node sql/cartItemsTable/createTable.js
node sql/productTable/seedTable.js
```

Perintah terakhir mengisi katalog awal. Jangan jalankan ulang perintah pembuatan tabel keranjang atau pengisian katalog pada database yang sudah disiapkan: tabel keranjang tidak dibuat secara idempoten, dan pengisian katalog akan menambahkan data lagi.

## Menjalankan aplikasi

Mode normal:

```bash
npm start
```

Mode pengembangan dengan restart otomatis:

```bash
npm run dev
```

Buka [http://localhost:8000](http://localhost:8000), atau gunakan port yang diatur melalui `PORT`.

## API

Semua request yang mengirim data menggunakan JSON. Login dan pendaftaran menggunakan session cookie; semua endpoint keranjang memerlukan pengguna yang sudah masuk.

| Metode | Endpoint | Keterangan |
| --- | --- | --- |
| `GET` | `/api/products` | Mengambil katalog. Opsional: `?genre=Rock` dan/atau `?search=artist` untuk filter dan pencarian. |
| `GET` | `/api/products/genres` | Mengambil daftar genre. |
| `POST` | `/api/auth/register` | Membuat akun. Body: `{ "name": "...", "email": "...", "username": "...", "password": "..." }`. |
| `POST` | `/api/auth/login` | Masuk. Body: `{ "username": "...", "password": "..." }`. |
| `GET` | `/api/auth/logout` | Keluar dan menghapus session. |
| `GET` | `/api/auth/me` | Memeriksa status login dan mengambil nama pengguna jika sudah masuk. |
| `POST` | `/api/cart/add` | Menambahkan satu unit produk. Body: `{ "productId": 1 }`. Memerlukan login. |
| `GET` | `/api/cart/cart-count` | Mengambil jumlah total unit di keranjang. |
| `GET` | `/api/cart` | Mengambil item keranjang. Memerlukan login. |
| `DELETE` | `/api/cart/:itemId` | Menghapus item keranjang berdasarkan ID item. Memerlukan login. |
| `DELETE` | `/api/cart/all` | Mengosongkan keranjang. Memerlukan login. |

## Struktur proyek

```text
.
├── controllers/   # Logika endpoint
├── db/            # Koneksi SQLite
├── middleware/    # Middleware autentikasi
├── public/        # Halaman, aset, dan JavaScript frontend
├── routes/        # Definisi route API
└── sql/           # Skrip pembuatan tabel dan data katalog
```

## Catatan

- `database.db` dan `.env` tidak disertakan dalam Git. Buat file database lokal dengan langkah di atas.
- Session store bawaan Express digunakan untuk pengembangan; siapkan session store yang persisten sebelum menjalankan aplikasi di produksi.
