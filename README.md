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

Go to `https://<your-domain>/admin.html`, log in with `ADMIN_PASSWORD`, then:

- Choose an image
- Pick a **category** (Logo Design, Social Media, Menu Design, Banner & Stand, Brochure, Packaging)
- Pick an **aspect ratio** (16:9, 4:5, 3:4, 1:1, 9:16) — this controls how the image is cropped in the grid
- Add a title and short description
- Upload — it appears on the live site immediately, filterable by category

Uploaded projects can be deleted from the same admin panel.

## Notes

- The 25 existing case studies are baked in as seed data (`data/projects.seed.json`) so the site always has content even before any admin upload.
- If this repo is ever hosted on a purely static host (e.g. GitHub Pages) without the `/api` functions, the site automatically falls back to the seed data — browsing still works, only the admin upload feature requires the Vercel backend.
