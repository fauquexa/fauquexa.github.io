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

## Recommendations box

The box at the end of "Games for lab breaks" writes into a `recommendations` table in the same Supabase
project. Visitors can only add rows; nobody can read them back through the site. Create the table once in
Supabase → SQL editor:

```sql
create table public.recommendations (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  name text check (char_length(name) <= 40),
  message text not null check (char_length(message) between 1 and 1000),
  page text check (char_length(page) <= 40)
);
alter table public.recommendations enable row level security;
create policy "visitors can send recommendations" on public.recommendations
  for insert to anon with check (true);
grant insert on public.recommendations to anon;   -- this project does not grant new tables to anon by default
```

**Email on each new recommendation** (set up 25 Nov 2026): a trigger calls Resend through `pg_net`. The Resend
account belongs to the Berkeley address (Resend's test sender only delivers to the account's own address). The
API key lives in the Supabase vault as `resend_api_key`; the function skips the email if the key is missing.
Function `public.email_new_recommendation()`, trigger `recommendation_email`. To see whether emails went out:
`select status_code, content, created from net._http_response order by created desc;`. To stop the emails:
`drop trigger recommendation_email on public.recommendations;`.

To read them: Supabase dashboard → Table editor → `recommendations` (or `select * from recommendations
order by created_at desc;` in the SQL editor). To delete one: `delete from public.recommendations where id = …;`

## Driving game best times

Solo and multiplayer races in `playground/drive.html` post finishing times to a `drive_times` table in the same
Supabase project and show the top 5 per race type (`s5`, `s15` street; `o5`, `o15` off-road). Visitors can add
and read times, never change or delete them. Create the table once in Supabase → SQL editor:

```sql
create table public.drive_times (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  race text not null check (race in ('s5', 's15', 'o5', 'o15')),
  name text not null check (char_length(name) between 1 and 20),
  ms integer not null check (ms between 40000 and 3600000)
);
alter table public.drive_times enable row level security;
create policy "anyone can read drive times" on public.drive_times for select to anon using (true);
create policy "anyone can add a drive time" on public.drive_times for insert to anon with check (true);
grant select, insert on public.drive_times to anon;
create index drive_times_board on public.drive_times (race, ms);
```

To remove a bogus time: `delete from public.drive_times where id = …;`. Add `?dev` to the game's URL to test
multiplayer on a private channel.
