# PRD — Media & Attachment Upload on Ticket Creation

## Context

Saat ini Devflow hanya mendukung unggah media/lampiran bukti (screenshot atau video) setelah tiket dibuat, yaitu melalui `TicketDetailModal` yang memanggil `POST /api/projects/[id]/tickets/[ticketId]/media`.

Pada form pembuatan tiket (`CreateTicketForm`), belum ada input atau dropzone untuk memilih lampiran. Hal ini memperlambat proses pelaporan bug, karena reporter harus menyimpan tiket terlebih dahulu lalu mencarinya dan membukanya kembali di modal detail hanya untuk menambahkan screenshot/video bukti masalah.

## Problem / Motivation

Pengguna membutuhkan alur satu langkah (*single-step workflow*) untuk melaporkan bug atau membuat task lengkap beserta file bukti (screenshot/video reproduksi) langsung dari form pembuatan tiket.

## Scope

### 1. Frontend — Form Pembuatan Tiket (`apps/web/src/components/tickets/create-ticket-form.tsx`)
- Menambahkan area lampiran media (*Attachments Section*) pada `CreateTicketForm` (berlaku untuk `type === "bug"` dan `type === "task"`).
- Memungkinkan pemilihan hingga **maksimal 5 file** (gambar `image/png,image/jpeg,image/gif,image/webp,image/avif` dan video `video/mp4,video/webm,video/quicktime`).
- Preview thumbnail instan menggunakan `URL.createObjectURL` lokal sebelum disubmit, menampilkan:
  - Thumbnail gambar atau video preview.
  - Nama file dan ukuran dalam KB/MB.
  - Tombol hapus file dari antrean sebelum submit.
- Validasi ukuran file di sisi client (maksimal 50MB per file) dan format file.

### 2. Workflow Submit & Upload
- Saat tombol "Simpan" ditekan:
  1. Form membuat tiket via `POST /api/projects/[id]/tickets`.
  2. Jika tiket berhasil dibuat dan terdapat file dalam antrean, form mengunggah file tersebut secara bersamaan/paralel ke `POST /api/projects/[id]/tickets/[newTicketId]/media`.
  3. Status loading pada tombol menampilkan indikator jelas (e.g. `"Menyimpan & mengunggah file..."`).
  4. Setelah selesai, form menutup dan daftar tiket me-reload data terbaru.
  5. Menangani error jika ada file yang gagal diunggah tanpa merusak tiket yang sudah tersimpan.

### 3. Backend & API
- Memanfaatkan endpoint yang sudah ada tanpa perubahan breaking: `POST /api/projects/[id]/tickets/[ticketId]/media` (sudah mendukung validasi MIME dan limit 50MB di S3/MinIO).

## Out of Scope

- Drag-and-drop file ke seluruh window (cukup file picker & dropzone di dalam card form create).
- Peningkatan batas file di atas 50MB.
- Kompresi video di sisi client (di luar scope saat ini).

## Success Criteria

- Pengguna dapat memilih 1–5 gambar/video saat membuat bug atau task baru di `CreateTicketForm`.
- Thumbnail preview lokal muncul segera setelah file dipilih dan dapat dihapus satu per satu sebelum submit.
- Saat form disubmit, tiket dibuat dan file otomatis terunggah ke S3/MinIO.
- Saat tiket baru dibuka di `TicketDetailModal`, seluruh media yang dilampirkan langsung tampil lengkap.
- `pnpm lint` dan `pnpm build` lulus 100%.

## Definition of Done

- [ ] `pnpm --filter web lint` lulus tanpa error atau warning.
- [ ] `pnpm --filter @devflow/shared lint` lulus.
- [ ] `pnpm build` lulus 100%.
- [ ] Verifikasi manual: buat bug baru dengan 2 gambar dan 1 video, pastikan tiket tersimpan dan attachment tampil di modal detail.
- [ ] Code review pass (`reviewer` agent / `code-review-and-quality` skill).
