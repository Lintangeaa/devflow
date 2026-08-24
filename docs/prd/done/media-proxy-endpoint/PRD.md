# PRD — Media Proxy Endpoint (Fix Internal Docker Hostname Leak)

## Context — bug report

**Title:** Attachment foto tidak muncul karena signed URL memakai hostname
internal Docker

Ticket media attachments (photos/videos) fail to load in the browser
because the API returns a presigned S3/MinIO URL pointing at the internal
Docker hostname (`devflow-minio:9000`), which is only resolvable inside the
Docker network — not from a browser hitting the public domain
(`https://devflow.alpitech.biz.id`).

Root cause, confirmed in code:
- `apps/web/src/lib/s3.ts:34-39` (`signedUrl()`):
  ```ts
  export async function signedUrl(key: string, expiresIn = 3600): Promise<string> {
    const cmd = new GetObjectCommand({ Bucket: bucket, Key: key });
    const base = process.env.S3_PUBLIC_URL; // nginx front if set
    if (base) return `${base.replace(/\/$/, "")}/${key}`;
    return await getSignedUrl(s3, cmd, { expiresIn });
  }
  ```
  When `S3_PUBLIC_URL` isn't set, `getSignedUrl` builds the URL from the
  `S3Client`'s configured `endpoint` (`s3.ts:5`,
  `process.env.S3_ENDPOINT ?? "http://localhost:9000"`), which in the
  production Docker Compose setup is the internal service hostname.
- Only two call sites exist, both in
  `apps/web/src/app/api/projects/[id]/tickets/[ticketId]/media/route.ts`:
  - `GET` (line 20, per-row): `url: await signedUrl(m.fileKey)`
  - `POST` (line 68, after upload): `url: await signedUrl(key)`
- `media` table (`packages/db/src/schema.ts:142-161`): `id, ticketId,
  uploadedBy, fileKey, originalName, mime, size, width, height, duration,
  resized, createdAt`.

## Reproduction

1. Login ke Devflow.
2. Buka project dan detail ticket yang memiliki attachment foto.
3. Buka atau preview attachment foto.
4. Periksa URL gambar yang diberikan API.
5. Browser gagal memuat gambar karena URL mengarah ke `devflow-minio:9000`.

## Expected behavior

Attachment (foto, GIF, WebP, video) dapat ditampilkan melalui domain publik
Devflow tanpa mengekspos hostname internal Docker atau kredensial MinIO.

## Chosen fix — proxy endpoint (Option 2)

Rather than reconfiguring `S3_PUBLIC_URL`/nginx to expose MinIO on a public
hostname (Option 1), route all attachment reads through the Devflow API
itself, which already sits behind the public domain.

### 1. New endpoint
- `GET /api/projects/[id]/tickets/[ticketId]/media/[mediaId]`
  (`apps/web/src/app/api/projects/[id]/tickets/[ticketId]/media/[mediaId]/route.ts`,
  new file).
- Guards: `await requireProjectMember(id)` (same pattern as every other
  route under `tickets/[ticketId]`, e.g.
  `tickets/[ticketId]/route.ts:1-11`).
- Looks up the `media` row by `mediaId`, verifies `media.ticketId ===
  ticketId` (and that the ticket belongs to project `id`), returns `404`
  if not found or mismatched.
- Fetches the object directly via `GetObjectCommand` against `@/lib/s3`'s
  `s3` client (not `signedUrl()` — no presigned URL is generated or
  returned to the client at all).
- Streams the S3 object body back as the response body
  (`Body.transformToWebStream()` from `@aws-sdk/client-s3` v3, passed to
  `new Response(stream, { headers })` — the repo's existing precedent for
  non-JSON binary responses is `export/route.ts:99-104`, though that one
  buffers rather than streams; this is the first streaming response in the
  repo).
- Sets `Content-Type` from `media.mime`.
- Sets a private `Cache-Control` header (not exposing signed credentials,
  e.g. `private, max-age=300`).
- Returns `404` if the S3 object itself is missing (`NoSuchKey` from the
  SDK call).

### 2. Range request support (for video seek/scrub)
- If the incoming request has a `Range` header, forward it to
  `GetObjectCommand` via its `Range` parameter, and respond `206 Partial
  Content` with `Content-Range`, `Accept-Ranges: bytes`, and
  `Content-Length` set from the S3 response's returned range metadata.
- Without a `Range` header, respond `200 OK` with the full object as
  today's behavior implies.

### 3. Update existing routes to stop leaking presigned URLs
- `media/route.ts` `GET` (list, line 20) and `POST` (upload, line 68):
  replace `url: await signedUrl(...)` with
  `url: \`/api/projects/${id}/tickets/${ticketId}/media/${record.id}\`` (or
  `m.id` for the list case) — i.e. point the client at the new proxy
  endpoint instead of a presigned MinIO URL.
- `signedUrl()` in `apps/web/src/lib/s3.ts` becomes unused after this
  change (its only two call sites are the ones being replaced) — remove it
  if nothing else references it after implementation.

## Out of scope

- Option 1 (public MinIO endpoint / nginx-fronted `S3_PUBLIC_URL`
  reconfiguration) — not pursued; the proxy approach is chosen instead.
- Thumbnail/resize generation for images (the `resized`/`width`/`height`
  columns already on `media` are unrelated to this fix).
- Changing the upload flow (`POST` validation, size/MIME limits) beyond the
  `url` field change above.
- Caching at a CDN/edge layer — only a basic `Cache-Control` response
  header is added.

## Acceptance criteria

- [ ] Attachment foto dapat tampil melalui domain publik Devflow.
- [ ] URL yang diterima browser tidak mengandung `devflow-minio` atau
      hostname/port Docker internal lain.
- [ ] Proxy media memvalidasi authentication (`requireUser`) dan project
      membership (`requireProjectMember`) sebelum melayani object apa pun.
- [ ] Foto, GIF, WebP, dan video tetap dapat dipreview sesuai MIME type
      (`Content-Type` header benar).
- [ ] Video mendukung `Range` request sehingga bisa di-seek di browser.
- [ ] Object yang tidak ditemukan (row `media` atau S3 key hilang)
      mengembalikan HTTP `404`.
- [ ] Attachment yang sudah diupload sebelumnya tetap bisa dibuka setelah
      perbaikan (existing `fileKey`s are unaffected — only how the `url`
      field is derived changes).
- [ ] Endpoint tidak membocorkan credential MinIO atau presigned query
      string ke client.

## Definition of done (from CLAUDE.md / repo conventions)

- [ ] DB reads go through `@devflow/db`'s `schema.*` via Drizzle.
- [ ] Server-only modules keep the `"server-only"` guard where applicable.
- [ ] `pnpm lint` passes for `web`.
- [ ] `pnpm build` passes.
- [ ] Manual verification: open an existing attachment (image) and a video
      attachment through the public domain, confirm no internal hostname
      appears in the network request, confirm video seeking works, and
      confirm a request for a nonexistent `mediaId` returns 404 (no
      automated test suite exists in this repo yet).
