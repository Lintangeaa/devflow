# ISSUES — Media & Attachment Upload on Ticket Creation

See `PRD.md` for full context and scope decisions.

## 1. UI — CreateTicketForm Media Picker & Preview

- [x] `apps/web/src/components/tickets/create-ticket-form.tsx`:
  - Add state for selected local files: `files: File[]` (max 5 items).
  - Add hidden file input with accepted MIME types: `image/png,image/jpeg,image/gif,image/webp,image/avif,video/mp4,video/webm,video/quicktime`.
  - Add "Unggah Bukti / Media" button and attachment section under the form.
  - Implement client-side size check (max 50MB per file) with error toast/banner when exceeded.
  - Render local preview grid with thumbnail, filename, file size in KB/MB, and remove button per item.
  - Clean up created object URLs (`URL.revokeObjectURL`) on unmount / removal to avoid memory leaks.

## 2. UI — Submission & Background Upload Pipeline

- [x] `apps/web/src/components/tickets/create-ticket-form.tsx`:
  - Update `submit` function:
    - Step 1: POST to `/api/projects/[id]/tickets` to create the ticket.
    - Step 2: If `files.length > 0`, upload all files in parallel via `Promise.all` or sequential POST to `/api/projects/[id]/tickets/[newTicketId]/media`.
    - Step 3: Update submit button label to reflect status (e.g. `"Menyimpan & mengunggah media..."`).
  - Gracefully handle upload errors (if any file fails, notify user without breaking ticket creation).
  - Call `onCreated()` upon completion.

## 3. Verification (Definition of Done)

- [x] `pnpm --filter web lint` passes.
- [x] `pnpm --filter @devflow/shared lint` passes.
- [x] `pnpm build` passes.
- [x] Manual browser verification: create a bug with 2 images, verify files upload successfully and appear when opening `TicketDetailModal`.
- [x] Manual browser verification: create a task with an attachment, verify it saves and attaches correctly.
- [x] Manual browser verification: test selecting a file > 50MB, confirm client-side validation displays an error.
- [x] Code review pass (per repo's `code-review-and-quality` skill).
