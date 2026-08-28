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

`DELETE /me` deletes the local user row and the Supabase Auth user. The local delete cascades to resumes, versions, and assets.

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

## Approved Skills

```text
GET /approved/skills?query=React&limit=10
POST /approved/skills
PATCH /approved/skills/:id
DELETE /approved/skills/:id
```

Search is public because approved skills are shared lookup data.

Create, update, and delete require a Supabase bearer token for now. Later we should add admin roles so only admins can manage approved lists.

Create a skill:

```json
{
  "name": "React",
  "category": "Frontend",
  "approved": true
}
```

Update a skill:

```json
{
  "category": "Frontend Engineering"
}
```

## Notes

- Certifications are free text inside each resume.
- Approved certifications were intentionally removed.
- `skills` are the only approved lookup table in the current backend.
- Local frontend autosave still saves to IndexedDB first, then syncs to this backend.
- Before production, add an admin role check around approved-skill create, update, and delete.
