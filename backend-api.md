# Backend API Guide

This is the Postman-friendly map for the Resume Builder backend.

Base URL for local development:

```text
http://127.0.0.1:4000
```

Protected endpoints require a Supabase access token:

```text
Authorization: Bearer <supabase-access-token>
Content-Type: application/json
```

The backend verifies the token with Supabase Auth. Passwords live in Supabase Auth, not in our database.

## Health

```text
GET /health
```

Checks that the backend is running.

## Users

```text
POST /users
```

Creates a Supabase Auth user and a local user profile row.

```json
{
  "email": "person@example.com",
  "password": "password123",
  "name": "Person Name"
}
```

```text
GET /me
PATCH /me
DELETE /me
```

`GET /me` returns the signed-in user's local profile.

`PATCH /me` updates local profile fields:

```json
{
  "name": "New Name"
}
```

`DELETE /me` deletes stored asset files, the local user row, and the Supabase Auth user. The local delete cascades to resumes, versions, and asset rows.

## Resumes

```text
GET /resumes
POST /resumes
GET /resumes/:id
PATCH /resumes/:id/sync
DELETE /resumes/:id
GET /resumes/:id/versions
```

Resumes are owned by the authenticated user. The browser does not send `userId`; the backend reads it from the Supabase token.

Create a resume:

```json
{
  "title": "Software Developer Resume",
  "document": {
    "schemaVersion": 2,
    "meta": {
      "id": "resume-uuid",
      "title": "Software Developer Resume",
      "updatedAt": "2026-08-28T08:00:00.000Z",
      "profileType": "professional"
    },
    "design": {},
    "personal": {},
    "content": {}
  }
}
```

Sync an existing resume:

```json
{
  "baseRevision": 1,
  "title": "Updated Resume",
  "document": {
    "schemaVersion": 2,
    "meta": {
      "id": "resume-uuid",
      "title": "Updated Resume",
      "updatedAt": "2026-08-28T08:00:00.000Z",
      "profileType": "professional"
    },
    "design": {},
    "personal": {},
    "content": {}
  }
}
```

If `baseRevision` is stale, the API returns a conflict instead of overwriting newer server data.

## Notes

- Certifications are free text inside each resume.
- Skills are free text inside each resume, grouped by the user.
- Local frontend autosave still saves to IndexedDB first, then syncs to this backend.

## Assets

```text
GET /assets
GET /assets?kind=profilePhoto
POST /assets
POST /assets/replace
DELETE /assets?kind=profilePhoto&url=<asset-url>
DELETE /assets/:id
```

All asset endpoints require a Supabase bearer token.

Supported `kind` values:

```text
profilePhoto
institutionLogo
companyLogo
```

Upload a processed image data URL:

```json
{
  "kind": "profilePhoto",
  "fileName": "profile-photo.png",
  "dataUrl": "data:image/png;base64,..."
}
```

The backend uploads the file to Supabase Storage, creates the bucket if needed, stores a row in `assets`, and returns:

```json
{
  "asset": {
    "id": "asset-id",
    "kind": "profilePhoto",
    "storagePath": "user-id/profilePhoto/file.png",
    "url": "https://...supabase.co/storage/v1/object/public/...",
    "createdAt": "2026-08-28T..."
  }
}
```

Replace an existing image without stacking old files:

```json
{
  "kind": "profilePhoto",
  "fileName": "profile-photo.png",
  "previousUrl": "https://...supabase.co/storage/v1/object/public/profile-photos/...",
  "dataUrl": "data:image/png;base64,..."
}
```

If `previousUrl` belongs to the signed-in user, the backend uploads the new file, updates the existing asset row when it can find one, and removes the old Storage object. If an older asset row cannot be matched, the backend still parses the Supabase Storage URL and deletes the old object when its path starts with the signed-in user's id.

Delete by URL is useful when the user presses Remove in the editor:

```text
DELETE /assets?kind=profilePhoto&url=https%3A%2F%2F...
```

The frontend now stores the returned `url` in the resume photo/logo `assetId`, so synced resumes can render images on another device.
