# ISSUES — Media Proxy Endpoint

See `PRD.md` for full context, root cause, and scope decisions.

## 1. New proxy endpoint

- [x] Create
      `apps/web/src/app/api/projects/[id]/tickets/[ticketId]/media/[mediaId]/route.ts`
      with a `GET` handler:
  - `type Ctx = { params: Promise<{ id: string; ticketId: string; mediaId: string }> }`.
  - `await requireProjectMember(id)`.
  - Look up the `media` row by `mediaId`; return `404` if not found or if
    `media.ticketId !== ticketId`.
  - Fetch the object via `GetObjectCommand` against the `s3` client from
    `@/lib/s3` (add a small helper there if useful, e.g. `getObjectStream`).
  - Stream the response body (`Body.transformToWebStream()`), set
    `Content-Type` from `media.mime`, set a private `Cache-Control` header.
  - Return `404` if the S3 call fails with `NoSuchKey`/object not found.

## 2. Range request support

- [x] In the new handler, read the incoming `Range` header; if present,
      pass it to `GetObjectCommand`'s `Range` param.
- [x] When ranged, respond `206 Partial Content` with `Content-Range`,
      `Accept-Ranges: bytes`, `Content-Length` from the S3 response's range
      metadata.
- [x] When not ranged, respond `200 OK` with the full object and
      `Accept-Ranges: bytes` so clients know ranging is supported for
      subsequent requests.

## 3. Update existing media routes to stop returning presigned URLs

- [x] `apps/web/src/app/api/projects/[id]/tickets/[ticketId]/media/route.ts`
      `GET` (list, ~line 20): replace `url: await signedUrl(m.fileKey)` with
      a proxy path `/api/projects/${id}/tickets/${ticketId}/media/${m.id}`.
- [x] Same file, `POST` (upload, ~line 68): replace
      `url: await signedUrl(key)` with
      `/api/projects/${id}/tickets/${ticketId}/media/${record.id}`.
- [x] While touching this file, consider fixing the redundant duplicate
      `eq(schema.media.ticketId, ticketId)` condition noted at line 17
      (found during investigation — not the primary bug, but a trivial
      cleanup in the same file).

## 4. Cleanup

- [x] Remove `signedUrl()` from `apps/web/src/lib/s3.ts` if it has no
      remaining callers after step 3.

## 5. Verification (definition of done)

- [x] `pnpm --filter web lint` passes.
- [x] `pnpm build` passes.
- [x] Manual check: open an existing image attachment through the public
      domain, confirm the network request URL has no internal Docker
      hostname/port and the image renders.
- [x] Manual check: open a video attachment, confirm it plays and can be
      seeked (Range requests return 206).
- [x] Manual check: request the proxy endpoint with a nonexistent
      `mediaId`, confirm HTTP 404.
- [x] Manual check: request the proxy endpoint as a non-member of the
      project, confirm HTTP 403 (per `requireProjectMember`).
- [x] Manual check: upload a new attachment, confirm the returned `url`
      field is the proxy path (not a presigned MinIO URL) and it loads.
- [x] Code review pass (per repo's `code-review-and-quality` skill).
