# Labs Studio

[English](README.md) · **Bahasa Indonesia**

Studio animasi lokal, semacam After Effects versi ringan, yang berjalan di komputer sendiri dan mengekspor langsung ke MP4. Dibuat untuk dikembangkan terus dengan vibe coding lewat Claude Code (lihat `CLAUDE.md`).

## Yang dibutuhkan

- **Node.js 18+**
- **ffmpeg** di PATH (untuk ekspor MP4 dan impor video). Windows: `winget install ffmpeg` · Mac: `brew install ffmpeg` · Linux: `sudo apt install ffmpeg`. Tanpa ffmpeg, editor tetap jalan.
- Opsional: API key **ElevenLabs** untuk voice over (disimpan hanya di komputermu, di `settings.local.json`).

## Membuka

- **Windows:** klik dua kali **`Labs Studio.bat`**. Server menyala di jendela kecil (biarkan terbuka), lalu studio terbuka di jendela Edge seperti aplikasi.
- **Mac/Linux:** jalankan `sh labs-studio.sh`.
- **Manual:** `npm install`, lalu `npm run dev`, buka http://localhost:5173.

Semua proyek, unggahan, dan hasil ekspor disimpan di folder ini (`motion/`, `episodes/`, `media/`, `posters/`, `output/`) dan tidak ikut ke git.

## Beranda

- **Mulai dari template:** Komposisi kosong, Teks kinetik, Karakter 3D + teks, atau Episode karakter chibi (naskah → video).
- **Proyek:** semua proyek dengan poster, durasi, dan waktu edit terakhir. Bisa dicari, diganti nama, diduplikat, dan dihapus.
- **Kembangkan dengan Claude:** contoh permintaan siap salin, plus daftar jenis layer dan preset animasi yang terpasang.

## Editor motion

| Area | Isi |
|---|---|
| Kiri: **Tambah** | Jenis layer (Latar, Teks, Bentuk, Gambar, Audio, Karakter chibi 3D), rakitan siap pakai (Judul + subjudul, Lower third, Subtitle, Kartu kutipan), impor file |
| Tengah | Kanvas. Klik objek untuk memilih, seret untuk memindahkan. Seret **sudut** untuk memperbesar/memperkecil, seret **titik bulat di tengah sisi** untuk crop. Zoom tampilan: tombol − / + di bawah kanvas, Ctrl + scroll, Ctrl 0 = pas layar |
| Kanan: **Inspector** | Properti layer. ○/◇/◆ untuk keyframe, pilih easing tiap keyframe, animasi masuk/keluar. Tanpa pilihan: pengaturan komposisi (ukuran, fps, durasi) |
| Bawah: **Timeline** | Satu baris per layer (atas = paling depan). Seret batang untuk menggeser, seret tepi untuk memotong; ◆ = keyframe |

**Garis bantu:** saat menggeser, layer menempel ke tengah layar (kiri-kanan dan atas-bawah), ke tepi layar, dan ke tepi/tengah layer lain, lalu muncul garis pink sebagai penanda. Tahan Ctrl atau Alt untuk menggeser bebas tanpa menempel.

**Crop:** setiap layer punya Crop atas/bawah/kiri/kanan (%) di inspector, dan bisa diberi keyframe.

**Keyframe:** klik ○ di samping properti untuk mulai beranimasi. Setelah itu, setiap kali nilainya diubah di waktu lain, keyframe baru otomatis dibuat (seperti After Effects).

**Teks:** kata di antara `*bintang*` memakai warna aksen, `[kata]` jadi pil bergaris, `{logo}` jadi ikon logo. Animasi khusus teks: per kata dan mesin ketik.

**Video:** impor atau seret file video (mp4, mov, mkv, webm) ke jendela editor motion. Gambarnya jadi layer **Video**, suaranya jadi layer **Audio** di bawahnya (volume bisa diatur terpisah). Format yang tidak bisa diputar browser otomatis dikonversi ke MP4.

**Efek suara:** panel kiri → Media → **Efek suara** (whoosh, whoosh naik, klik UI, pop, chime, kilau, riser, dentum lembut, dll.), tanpa file audio. Atur jenis & volumenya di inspector, geser layernya ke titik transisi.

**Layer untuk video promo:** Liquid gradient (latar gradien cair, bisa digelapkan), Garis gambar (garis silang & bingkai yang tergambar), Layar aplikasi 3D (tampilan studio dengan perspektif 3D), Kursor, Tombol/pil, Logo aplikasi. Contohnya ada di proyek **Intro Motion Studio (liquid navy)** dan template **Intro aplikasi (liquid gradient)**.

**Layer gaya editorial (Promo):** Pola titik, Bola gradien, Lanskap alam, Diagram lingkar, Kartu UI, Angka berjalan, Gulungan kata. Contohnya ada di proyek **Labs Motion · promo editorial** dan template **Promo editorial (Labs Motion)**.

**Ganti gambar:** layer **Lanskap alam** punya kolom *Gambar sendiri* (foto pemandanganmu menggantikan ilustrasi, tetap bisa digeser lewat *Geser kamera* dan di-zoom). Layer **Layar aplikasi 3D** punya kolom *Gambar isi layar* untuk screenshot aplikasimu sendiri. Kosongkan kolomnya untuk kembali ke ilustrasi.

**Ukuran:** 16:9 YouTube, 9:16 Shorts/Reels/TikTok, 1:1, 4:5, atau kustom.

**Pintasan:** Spasi putar · ← → 1 frame (Shift: 1 detik) · Home ke awal · S potong layer · Delete / Backspace hapus layer · Ctrl+D duplikat · Ctrl+Z / Ctrl+Y · Esc lepas pilihan.

**Ekspor:** MP4 (`output/<id>.mp4`), audio saja (MP3 + WAV), dan frame PNG.

## Voice over (ElevenLabs)

Pertama kali dipakai, dialog Voice over meminta API key ElevenLabs (elevenlabs.io → Profile → API Keys). Key disimpan hanya di komputer ini (`settings.local.json`).

- **Editor motion:** panel kiri → **Suara → Voice over**. Tulis teks, pilih suara & model, klik **Buat suara**, dengarkan, lalu **Masukkan ke timeline**. Hasilnya jadi layer audio di posisi playhead.
- **Editor episode chibi:** di toolbar timeline ada **🎙 Voice over** (satu suara di playhead) dan **🎙 VO semua adegan**. Yang kedua membacakan subtitle tiap adegan, menaruh suaranya di awal adegan, dan (opsional) menyamakan durasi adegan dengan panjang suaranya.
- Pengaturan suara terakhir diingat. Sisa kuota karakter ditampilkan di dialog.

## Editor episode chibi

Editor khusus video ceramah gaya Mode Ustadz. Naskah dipecah jadi adegan dengan karakter chibi di panggung catur, lengkap dengan thumbnail, foto profil, dan banner. Dibuka dari kartu proyek "Episode chibi" di Beranda (`chibi.html`).

## Folder

| Folder | Isi |
|---|---|
| `motion/` | Proyek motion (JSON) |
| `episodes/` | Proyek episode chibi (JSON). `.backup/` = cadangan ep01 lama |
| `<folder>/.trash/` | Proyek yang dihapus (pindahkan kembali untuk memulihkan) |
| `media/uploads/` | Gambar & audio yang diimpor |
| `posters/` | Gambar kartu di beranda |
| `output/` | Hasil ekspor |
| `src/motion/layers/` | Jenis layer (1 file = 1 jenis) |
| `src/templates/` | Template proyek (1 file = 1 template) |

## Mengembangkan

Buka Claude Code di folder ini, lalu minta dengan bahasa biasa, misalnya "buat jenis layer Progress bar yang bisa dianimasikan". Arsitektur dan titik perluasannya sudah dijelaskan di `CLAUDE.md`, jadi Claude tahu harus menaruh file di mana.
