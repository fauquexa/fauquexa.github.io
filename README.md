# alain fauquex · personal site

A static site for GitHub Pages. It has no build step and no dependencies. Plain HTML, CSS and JS.

```
index.html                     homepage (about, research, projects, publications, experience, playground, the Menagerie of pets)
assets/style.css               homepage styles (light/dark)
assets/toy.css                 shared look of the playground pages
assets/site.js                 theme toggle, nav highlighting, email link
assets/julia-day.js            date-seeded Julia-set parameters (shared)
assets/previews.js             generated previews for the Julia and stereogram tiles
assets/ambient.js              calm generated music + mute button (cats, fish, chickens); cinema mode goes fullscreen
assets/thumbs/                 screenshots used as playground thumbnails (worm.jpg: headless capture of worm.html?thumb&theme=dark at 1600x900, scale 2, right 1000x562 px cropped)
assets/salemi-mouse.svg        Salemi group logo (stereogram default)
playground/flight.html         flight sim: Pilatus aircraft + helicopter, fuel, airports, high scores (Supabase)
playground/drive.html          driving sim: DB9-style GT, endless low-poly countryside (fixed seed 7), multiplayer via Supabase realtime broadcast
playground/worm.html           C. elegans connectome: worm brain simulator, with the activity map and a connectivity (weight) matrix
playground/aquarium.html       perch in a mangrove creek
playground/chickens.html       back-garden chickens
playground/cats.html           six cats at home
playground/julia.html          Julia set of the day, with an endless dive
playground/stereogram.html     stereogram generator
playground/toolbox.html        quantum device toolbox: CPW, resonator fit, transmon, JJ, photon number, superconductors, nanofabricated lumped elements, dew point, units (incl. RF power), inch threads
playground/corner.html         Claude's corner: Claude's own pick, currently a Physarum slime-mould network
playground/maze3d.html         first-person maze screensaver (not linked from the homepage)
```

## Publish on GitHub Pages

1. Create a **public** repository named exactly `fauquexa.github.io`.
2. Push these files to its `main` branch:
   ```
   git init
   git add .
   git commit -m "Personal site"
   git branch -M main
   git remote add origin https://github.com/fauquexa/fauquexa.github.io.git
   git push -u origin main
   ```
3. On GitHub, open **Settings → Pages**. Set **Source** to *Deploy from a branch*, then pick `main` and `/ (root)`.
4. After a minute the site is live at `https://fauquexa.github.io`.

## Preview locally

```
python -m http.server 8000
```
Then open http://localhost:8000.

## Optional

- **CV PDF.** Add `assets/cv.pdf` and link it from the sidebar in `index.html`. Remove your phone number before publishing it.
- **Custom domain.** Add a `CNAME` file containing the domain, then set DNS as GitHub describes.

## High scores

The flight sim's leaderboard lives in a free Supabase project (`flight-scores`). The page only uses the public
(publishable) key. Row-level security allows visitors to read scores and add new ones, but not to edit or delete them.
To remove a score, use the Supabase dashboard → SQL editor: `delete from public.scores where id = …;`

When you change a file in `assets/`, bump the `?v=` tag on its links (all pages) so browsers fetch the new version.
