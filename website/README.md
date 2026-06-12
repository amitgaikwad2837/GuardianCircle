# GuardianCircle Website

This folder contains the static website for GuardianCircle, hosted via GitHub Pages.

## Structure

```
website/
├── index.html        # Landing page
├── privacy.html      # Privacy Policy
├── terms.html        # Terms & Conditions
├── assets/
│   └── logo.svg      # App logo
└── .nojekyll         # Disables Jekyll processing on GitHub Pages
```

## Hosting on GitHub Pages

1. Go to your repository **Settings → Pages**
2. Under **Source**, select **Deploy from a branch**
3. Set **Branch** to `main` and **Folder** to `/website`
4. Click **Save**

Your site will be live at `https://<your-username>.github.io/GuardianCircle/`

## Local preview

Open `index.html` directly in a browser, or use any static file server:

```bash
npx serve website
```
