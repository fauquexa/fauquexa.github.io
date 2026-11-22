# alain fauquex · personal site

A static site for GitHub Pages. It has no build step and no dependencies. Plain HTML, CSS and JS.

```
index.html               main page (about, research, projects, publications, path, playground)
assets/style.css         main page styles (light/dark)
assets/site.js           theme toggle + nav highlighting
assets/julia-day.js      date-seeded Julia-set parameters (shared)
assets/toy.css           shared chrome for the playground pages
assets/headshot.jpg
playground/julia.html          Julia of the day (WebGL): pick c on the Mandelbrot set, zoom, save
playground/stereogram.html     Stereogram Studio: logo / text / shapes → SIRDS, PNG + HTML export
playground/maze.html           first-person maze screensaver (raycaster, right-hand-rule autopilot)
playground/flight.html         flight sim (three.js): PC-24/12/21/6 + heli, fuel, airports, real Bay Area terrain, high scores
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
