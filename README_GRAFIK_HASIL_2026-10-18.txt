PERUBAHAN GRAFIK SILAT MOTION

1. Menghapus tombol Komparasi pada header Session Detail karena menuju halaman yang mengulang informasi hasil.
2. Menghapus kartu Akurasi Sesi 40% dari halaman detail; akurasi tetap tersedia pada tabel dan grafik.
3. Menghapus grafik Durasi Siklus Penuh yang berdiri sendiri.
4. Menjadi 4 grafik utama dalam layout 2 x 2:
   - Kecepatan Fase & Waktu
   - Kecepatan Siklus & Waktu
   - Kecepatan Puncak & Akurasi
   - Simpangan Titik Impact
5. Waktu pada dua grafik pertama ditampilkan sebagai BAR, bukan titik.
6. Skala waktu dibuat terbalik secara visual: waktu yang lebih kecil/lebih cepat berada lebih tinggi. Nilai detik tetap ditulis di atas bar.
7. Kecepatan tetap menggunakan bar maroon.
8. Waktu menggunakan bar biru.
9. Grafik Kecepatan Puncak & Akurasi memakai dua bar berdampingan per percobaan. Akurasi memakai status HIT/MISS.
10. Ukuran grafik, angka hasil, label, dan legenda diperbesar agar hasil penelitian lebih mudah dibaca.

LOGIC ANALISIS TIDAK DIUBAH. Perubahan hanya pada tampilan hasil di SessionDetailPage.tsx.

Catatan build:
npm run build tidak dapat diverifikasi di environment ini karena dependency node_modules belum tersedia dan proses npm ci mengalami timeout. Jalankan npm install/npm ci lalu npm run build di komputer project.
