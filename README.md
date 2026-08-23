# Arkar Myo Portfolio

Graphic design portfolio for Arkar Myo (RAKO Creative) with a password-protected
admin panel for uploading new projects (image + category + aspect ratio).

## Stack

- Static HTML/CSS/JS front end (`index.html`, `assets/`)
- Vercel Serverless Functions (`api/`) for auth + project storage
- [Vercel Blob](https://vercel.com/docs/storage/vercel-blob) for storing uploaded images and the projects list

## Deploy on Vercel

1. **Import the repo** — [vercel.com/new](https://vercel.com/new), select this GitHub repo (`arkar-myo-portfolio`). Framework preset: "Other". No build command needed.
2. **Create a Blob store** — In the Vercel dashboard: *Storage → Create Database → Blob*. Connect it to this project. This automatically adds the `BLOB_READ_WRITE_TOKEN` environment variable.
3. **Set environment variables** — Project Settings → Environment Variables:
   - `ADMIN_PASSWORD` — the password you'll use to log into `/admin.html`
   - `SESSION_SECRET` — any long random string (used to sign the login session cookie)
4. **Redeploy** after adding the env vars.

## Using the admin panel

Go to `https://<your-domain>/admin.html`, log in with `ADMIN_PASSWORD`.

**Upload a new project:**
- Choose one or more images — each becomes a photo in that project's gallery (first = cover thumbnail)
- Pick a category, aspect ratio, title and short description
- Click **Upload Project**

**Edit any existing project — including the original 25:**
- Scroll to **All Projects**, find the project, click **Edit**
- The form fills in with its current photos, title, category, etc.
- Remove old photos (✕ on a thumbnail) and/or add new ones from your computer
- Change the title, description, category or ratio as needed
- Click **Save Changes**

Editing one of the original 25 projects creates an override — the site will show your edited version instead of the original PDF-extracted one. Click **Revert** on that project any time to discard the override and go back to the original photos/details. Genuinely new uploads show a **Delete** button instead, which removes them completely.

**Profile photo:** update it any time from the Profile Photo section at the top of the admin panel — takes effect on the live site immediately.

## Notes

- The 25 existing case studies are baked in as seed data (`data/projects.seed.json`) so the site always has content even before any admin upload.
- If this repo is ever hosted on a purely static host (e.g. GitHub Pages) without the `/api` functions, the site automatically falls back to the seed data — browsing still works, only the admin upload feature requires the Vercel backend.
