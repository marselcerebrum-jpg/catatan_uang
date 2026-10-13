# Catatan Uang

Web app sederhana untuk mencatat pemasukan dan pengeluaran. Tanpa server dan tanpa instalasi: cukup HTML, CSS, dan JavaScript.

## Fitur

- Catat pemasukan dan pengeluaran beserta kategori, tanggal, dan keterangan
- Ringkasan per bulan: pemasukan, pengeluaran, saldo, dan saldo total
- Grafik pengeluaran per kategori
- Riwayat transaksi dikelompokkan per hari, dengan pencarian, ubah, dan hapus
- Ekspor ke CSV (bisa dibuka di Excel / Google Sheets)
- Cadangkan dan pulihkan data lewat file JSON
- Mode gelap otomatis, tampilan ramah HP

## Cara menjalankan

Buka `index.html` langsung di browser, atau jalankan server lokal:

```bash
python3 -m http.server 8000
# lalu buka http://localhost:8000
```

Bisa juga di-deploy gratis ke GitHub Pages, Netlify, atau Vercel karena semuanya file statis.

## Penyimpanan data

Data disimpan di `localStorage` browser, jadi hanya ada di perangkat dan browser yang dipakai. Gunakan **Cadangkan (JSON)** secara berkala dan **Pulihkan (JSON)** untuk memindahkan data ke perangkat lain.
