# Resume Builder Project Structure

This document is the shared map for the resume builder. It explains what we are building, how the app is currently shaped, what the final product should become, and the architecture choices we should keep in mind as we add backend sync, approved data, and smarter resume guidance.

The simple idea: this should not just be a form that exports a PDF. It should feel like a quiet professional coach that helps different kinds of users create a resume that is clean, credible, ATS-friendly, and hard to miss.

## Product Goal

Build a resume builder for people at different career stages:

- Professionals with real work experience
- Graduates and entry-level applicants
- Interns
- Attachees seeking industrial attachment
- Career changers

The app should adapt to the user instead of forcing everyone into the same resume structure.

For a professional, the app should push measurable achievements, leadership, strong summaries, relevant skills, and clean experience history.

For an intern or attachee, the app should prioritize education, projects, coursework, practical skills, certifications, volunteer work, and strong career objectives. They should not be punished for having little or no work experience.

## What The Final Product Should Feel Like

The final app should feel:

- Minimal, modern, and calm
- Fast to use
- Professional enough for serious job seekers
- Helpful without being noisy
- Structured but not restrictive
- Smart enough to guide users toward better content

The resume output should be:

- Clean and elegant
- Easy to scan in seconds
- ATS-friendly
- Properly paged when exported
- Strong on content, not just pretty layout
- Adapted to the user's career stage

The best version of this product does not just ask, "What did you do?" It asks better questions:

- What improved because of your work?
- How many people, customers, users, students, or clients were affected?
- What tools did you use?
- What was faster, cheaper, safer, clearer, or better after you contributed?
- What proof do you have that you are ready for this role?

## Current Tech Stack

The app is currently built with:

- React 19
- TypeScript
- Vite
- Plain CSS
- Lucide React for icons
- dnd-kit for drag and sort interactions
- idb for browser storage
- Zod for validation/import safety
- Vitest for tests

It is not using Tailwind right now. Styling lives in custom CSS files.

## Recommended Future Tech Stack

For the backend and sync architecture, the recommended stack is:

- Backend framework: NestJS
- Database: PostgreSQL
- ORM: Prisma
- Auth: Supabase Auth, starting with email and password
- File storage: Supabase Storage or S3-compatible object storage

Recommended default:

```text
React + TypeScript frontend
NestJS API
PostgreSQL database
Prisma ORM
Supabase Auth/Storage if we want speed and managed services
```

Why this stack:

- The frontend is already TypeScript, so NestJS keeps the full product in one language.
- PostgreSQL fits structured resume data better than MongoDB.
- Prisma gives typed models, migrations, and safer database access.
- Supabase can help with auth, storage, Postgres hosting, and realtime features if we want to move faster.

## Current Project Map

```text
apps/
  backend/
    src/
      main.ts                   NestJS API entry point
      app.module.ts             Backend module wiring
      health.controller.ts      Health check endpoint
      prisma.service.ts         Shared Prisma client service
      approved/                 Approved server data search APIs
      resumes/                  Resume create, fetch, sync, versions APIs
    prisma/
      schema.prisma             PostgreSQL data model

  web/
    src/
      main.tsx                  Main resume builder app
      styles.css                App shell and editor styles
      templates.css             Resume template styles
      measure.tsx               Hidden measuring route for pagination logic
      export/
        print-export.ts         Browser print-to-PDF export path
        print.css               Print-specific app chrome hiding
      onboarding/
        TemplateChooser.tsx     First template/profile chooser experience
        sample-content.ts       Sample resume content
      sections/
        DesignPanel.tsx         Settings dropdown and resume design controls
        ExportBar.tsx           Download/import/export controls
        PersonalPanel.tsx       Personal details, photo, links
        SummaryPanel.tsx        Summary editor
        panels.tsx              Skills, languages, hobbies, references panels
        fields.tsx              Shared text, bullets, chips fields
        list-controls.tsx       Add/remove/undo list helpers

  render/
    src/
      server.ts                 Server-side render/measurement support

packages/
  resume-core/
    src/
      index.ts                  Core resume schema, migrations, sections
      blocks/                   Block extraction for pagination
      pagination/               Page box and pagination rules
      form/                     Bullet and line reconciliation helpers

  resume-render/
    src/
      index.tsx                 Shared ResumePreview renderer
      design-tokens.ts          Resume design tokens and templates
      sections/registry.tsx     Section renderers
      primitives/               Shared render primitives

fixtures/
  fixture-1page.v2.json         One-page sample resume
  fixture-3page.v2.json         Multi-page sample resume

scripts/
  spike-a-parity.mjs            Existing parity/check script
```

## Current Product Features

The app currently supports:

- Two resume templates:
  - Meridian: supports photo
  - Technical: no photo
- Personal details
- Phone, email, birthday, and location icons
- Date of birth formatted as `dd-mm-yyyy`
- Photo upload and placeholder profile icon
- Company logos for experience
- Institution logos for education
- Summary section
- Experience section with bullets
- Education section
- Skills grouped into columns
- Skill group validation:
  - group name must be one word
  - maximum 4 skills per group
- Languages with a 5-dot level indicator
- Hobbies
- References:
  - omitted
  - available on request
  - listed referees, maximum 3
  - name on top, details below
  - icons for role, organisation, email, and phone
- Download PDF through browser print
- Import/export JSON
- Local browser persistence through IndexedDB

## Current Backend Foundation

The backend foundation now exists in `apps/backend`.

It currently supports:

- NestJS API shell
- PostgreSQL schema through Prisma
- Supabase email/password auth foundation
- Supabase access-token verification for resume APIs
- Prisma client generation
- Health check endpoint
- Resume create, list, fetch, sync, and version-history endpoints
- Revision-based conflict detection for sync
- Approved skills search endpoint
- Approved certifications search endpoint
- Environment sample for local database setup

This is not yet connected to the editor UI. The frontend still saves locally first, and the next major product step is to wire the editor to these APIs with debounced autosave and server-backed dropdowns.

## Known UI And Export Limitations

The UI is not limited by plain CSS. It can become very slick and minimal without Tailwind.

The current limitations are more architectural:

- Styling is spread across several CSS files.
- Some old preview styles still exist beside newer template styles.
- The PDF export path depends on browser print behavior.
- The preview is still one long resume element, not a true stack of pages.
- The pagination measurement logic exists, but display/export does not yet fully use it.

The proper future fix for export is paged rendering:

- Use the existing pagination result.
- Render real page wrappers in preview.
- Export those page wrappers.
- Give every page its own padding/margins.
- Show visible page boundaries in the preview.
- Track how full each page is.
- Support "tighten" suggestions when content almost fits.

## Backend Goals

The backend should make the app reliable across devices and more intelligent.

Core backend goals:

- User accounts
- Resume sync
- Resume autosave
- Multiple resumes per user
- Resume versions/history
- Approved server-side lists for controlled fields
- Search/autocomplete APIs
- Asset upload for photos and logos
- Job-description matching
- Resume scoring
- AI-assisted content improvement

## Sync Model

The app should not send a server request for every raw keystroke immediately.

Recommended sync behavior:

- Update the UI immediately.
- Save locally first.
- Debounce server saves, for example 500ms to 1000ms.
- Send patches or section updates to the server.
- Store a revision/version number.
- Detect conflicts if the same resume is edited on two devices.
- Keep IndexedDB as an offline cache.
- Show simple save states:
  - Saving
  - Saved
  - Offline
  - Sync failed

The user should feel like the resume is always safe.

## Approved Server Data

Some fields should come from approved server data so resumes stay consistent and searchable.

Fields that should be approved or autocomplete-driven:

- Skills
- Job titles
- Industries
- Companies
- Education institutions
- Degrees and qualifications
- Fields of study
- Languages
- Countries, cities, and locations
- Certifications
- Employment types
- Seniority levels
- Achievement/action verbs

Fields that should stay free text:

- Professional summary
- Career objective
- Work achievement bullets
- Project descriptions
- Reference names
- Phone numbers
- Email addresses
- Custom links
- Personal headline, unless we decide to suggest job titles there

The rule: controlled lists should improve quality, but not block the user's real story.

## Skill Autocomplete Goal

Skills should eventually work like this:

1. User types in the skills field.
2. Frontend calls the backend, for example `/skills/search?q=rea`.
3. Backend returns approved matches.
4. Dropdown appears under the field.
5. User selects one approved skill.
6. Resume stores the selected skill ID and display name.

If we want strict quality control, users should not be able to save arbitrary skill text. If we want flexibility, we can allow "suggest new skill" and send it for approval.

## User Profiles

The app should adapt based on profile type.

Recommended profiles:

- Professional
- Graduate / entry-level
- Intern
- Attachee / industrial attachment
- Career changer

Each profile changes:

- Section order
- Required fields
- Resume score rules
- Suggested prompts
- Example bullets
- Template guidance
- What the app considers "complete"

## Professional Resume Flow

For professionals, prioritize:

- Strong professional summary
- Work experience first
- Measurable achievements
- Leadership and ownership
- Tools and domain skills
- Certifications
- Selected education
- References optional

Professional scoring should reward:

- Quantified impact
- Strong action verbs
- Relevant skills
- Recent experience
- Clear job titles
- Consistent dates
- One-page or two-page fit depending on seniority

## Intern And Attachee Resume Flow

For interns and attachees, prioritize:

- Career objective
- Education near the top
- Field of study
- Practical skills
- Coursework
- Projects
- Certifications
- Volunteer work
- Attachment/internship interests
- Referees, such as lecturers or supervisors

Intern and attachee scoring should not punish lack of work experience. It should reward:

- Clear target field
- Relevant coursework
- Practical tools
- School projects
- Attachment goals
- Professional presentation
- Willingness and readiness signals

## Content Intelligence Goals

The app should help users write stronger content.

Important future features:

- Job-description matching
- Resume strength score
- ATS keyword check
- Missing-section warnings
- Weak bullet detection
- Achievement bullet builder
- Professional summary generator
- Career objective generator
- "Make this stronger" button for bullets
- Quantification prompts
- Role-specific examples
- Grammar and clarity suggestions

Examples of useful prompts:

- Add a number to show scale.
- Start this bullet with a stronger action verb.
- This sounds like a duty. What changed because of your work?
- This skill appears in the job post but not your resume.
- Your education is strong for this profile. Move it higher.

## Sections To Add Later

Likely future sections:

- Projects
- Certifications
- Awards
- Publications
- Portfolio
- Volunteer work
- Custom sections
- Training / workshops
- Professional memberships

Projects and certifications are especially important for interns, attachees, graduates, and career changers.

## Suggested Database Shape

At a high level, the database should include:

```text
users
  id
  email
  name
  created_at

resumes
  id
  user_id
  title
  profile_type
  design_json
  content_json
  revision
  created_at
  updated_at

resume_versions
  id
  resume_id
  revision
  snapshot_json
  created_at

skills
  id
  name
  category
  approved

job_titles
  id
  name
  industry_id
  approved

education_institutions
  id
  name
  country
  logo_url
  approved

companies
  id
  name
  country
  logo_url
  approved

certifications
  id
  name
  provider
  approved

languages
  id
  name
  approved

assets
  id
  user_id
  kind
  url
  created_at
```

Early on, `resumes.content_json` can hold the resume document as JSON. Later, if analytics and querying become more important, high-value fields can be normalized into separate tables.

## API Areas

Recommended API groups:

```text
/auth through Supabase email/password
/users
/resumes
/resumes/:id/sync
/resumes/:id/versions
/skills/search
/job-titles/search
/institutions/search
/companies/search
/certifications/search
/languages/search
/assets
/analysis/job-match
/analysis/resume-score
/ai/suggest-summary
/ai/suggest-bullets
```

## Design Direction

The app UI should stay quiet and useful.

Good direction:

- Clean sidebar forms
- One open accordion at a time
- Compact but readable controls
- Clear save status
- Smart suggestions below fields
- Minimal settings dropdown
- Icons where they reduce scanning effort
- Resume preview always visible on desktop
- Real page boundaries in the preview

Avoid:

- Loud dashboard visuals
- Decorative cards everywhere
- Overly rounded controls
- Marketing-style hero sections inside the app
- Big empty panels that do not help the user
- Too many templates before the core experience is strong

## Template Direction

For now, keep two strong templates:

- Meridian: supports photo, editorial and warm
- Technical: no photo, structured and ATS-safe

Both templates should support:

- Contact icons
- Skills groups
- Language dots
- Education logos
- Experience logos
- Clean references
- Good PDF export

The priority is not many templates. The priority is two excellent templates that produce serious resumes.

## Build Priorities

Recommended order:

1. Stabilize PDF export with true paged rendering.
2. Add backend foundation with NestJS, PostgreSQL, and Prisma.
3. Add auth and user-owned resumes.
4. Add server sync with local-first autosave.
5. Add approved data tables and autocomplete.
6. Add profile-aware resume flows.
7. Add projects and certifications.
8. Add resume scoring.
9. Add job-description matching.
10. Add AI-assisted summaries and bullet improvements.

## Guiding Principle

Every feature should answer one question:

Will this help the user create a better resume faster?

If yes, build it carefully.

If no, leave it out for now.
