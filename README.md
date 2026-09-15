# NextGen Starter Theme for Rock RMS

A ready-to-use **public website theme** for [Rock RMS](https://www.rockrms.com/),
built on Rock v18's new **NextGen theme system**. Use it as-is, as the starting
point for your own site, or as a working example of how NextGen themes fit
together.

## Why NextGen?

Rock v18 introduced a new way to build themes. Compared to the old LESS themes,
a NextGen theme gives you:

- **Edit your brand in the admin UI** — colors, logo, and fonts are changed in
  `Admin Tools > CMS Configuration > Themes`. No code, no rebuild, no deploy.
- **Dark mode built in** — visitors who prefer dark mode get it automatically.
  (You can also lock the site to light mode — see [Customizing](#customizing).)
- **Rock's design system included** — buttons, forms, cards, and menus match
  Rock's modern look out of the box.

## What's in the box

- A complete site shell: fixed header with logo and dropdown menus, mobile
  hamburger menu, page title banner, footer with link columns, back-to-top
  button.
- Seven page layouts: Homepage, FullWidth, LeftSidebar, RightSidebar, Blank,
  Dialog, and Error.
- Ready-made menu and footer templates for Rock's Page Menu block.
- A placeholder logo you replace with your own — right from the admin UI.

---

## Installing on your Rock server

You don't need any developer tools for this part — just the files in this repo.

> **Requires Rock v18.1 or newer** (v18.2+ recommended).

1. **Copy the theme folder** to your Rock server at:

   ```
   RockWeb/Themes/NextGenStarter/
   ```

   You can skip `node_modules/` and `tools/` — they're only used for
   development. Keep the folder name `NextGenStarter` unless you're ready to
   also update the logo path in `theme.json` and the stylesheet path in
   `Layouts/Error.aspx` (both reference the folder by name).

2. **Give the app pool write access to the theme folder.** Rock saves your
   admin color/logo choices directly into the theme's stylesheet — without
   write access, the theme editor won't apply anything.

3. **Restart Rock** (recycle the app pool). Rock finds new themes at startup —
   there's nothing to install or import.

   > On Rock **18.1** restart **twice** — the first restart registers the
   > theme, the second reads its settings. 18.2 and newer only need one.

4. **Check it registered correctly.** In
   `Admin Tools > CMS Configuration > Themes`, you should see **NextGen
   Starter** listed with the purpose **Website NextGen**. If it says *Website
   Legacy*, restart once more (see the 18.1 note above).

5. **Choose it for your site.** Go to `CMS Configuration > Sites`, open your
   external site, and select **NextGen Starter** as the theme. Then:
   - Point your pages at the theme's layouts (`Homepage`, `FullWidth`, etc.).
   - Add a **Page Menu** block to the **Nav** zone with the template
     `{% include '~~/Assets/Lava/PageNav.lava' %}` and *Number of Levels* = 2.
   - Add your footer content to the **Footer** and **FooterNav1–3** zones
     (`Assets/Lava/Footer.lava` is a good starting point).

6. **Make it yours.** Open the theme in
   `CMS Configuration > Themes`, upload your logo, and set your brand colors.
   Save, refresh your site, and you should see the changes immediately — that
   confirms everything is wired up.

**Tip:** try all of this on a staging server first, and keep your old theme
selected until you're happy with the result.

---

## Changing the styling (developers)

The admin UI covers colors, logo, and fonts. To change the CSS itself — spacing,
components, new styles — you'll edit the theme's source files and rebuild the
stylesheet.

### One-time setup

1. Install **Node.js** (version 18 or newer): **https://nodejs.org/en/download**

   Node is only needed on your development machine — never on the Rock server.

2. In the theme folder, install the build tool:

   ```bash
   npm install
   ```

### Making changes

| Command | What it does |
|---|---|
| `npm run build` | Compiles `Styles/theme.scss` into `Styles/theme.css` |
| `npm run watch` | Rebuilds automatically every time you save |
| `npm run check` | Verifies the theme is still wired up correctly |

The files you'll actually edit:

| File | What lives there |
|---|---|
| `Styles/_components.scss` | The theme's look: header, menus, footer, page title, etc. |
| `Styles/_tokens.scss` | The default colors and fonts (must match `theme.json`) |
| `theme.json` | The fields shown in Rock's admin theme editor |
| `Assets/Lava/*.lava` | Menu and footer templates |
| `Layouts/*.aspx` | Page layouts and the site shell (`Site.Master`) |

After editing, run `npm run build`, then `npm run check`, and copy the theme
folder to your server again.

**Rebuilding doesn't wipe the admin's colors.** Those live in Rock's database,
not in `theme.css` — Rock bakes a copy of them into the file, and a rebuild
just clears that copy. Rock writes them back the next time anyone saves in the
theme editor, and again on every application start. If you're compiling
straight into a live site's theme folder, let Rock have the last write: rebuild,
then save in the theme editor (or recycle the app pool).

### Three rules to keep you out of trouble

1. **Never edit `Styles/theme.css` by hand.** It's generated by the build, and
   Rock itself rewrites parts of it when admins save theme settings. Always
   edit the `.scss` files and rebuild.
2. **Leave the `/* CSS Overrides ... */` comments alone — all four of them.**
   Rock deletes everything between a `Start` marker and its `End` marker before
   regenerating that section, and the match is greedy. Delete or reword half of
   a pair and the next admin save can wipe your whole stylesheet. `npm run
   check` guards this.
3. **If you change a default color or font, change it in both places** —
   `theme.json` *and* `Styles/_tokens.scss`. `npm run check` will tell you if
   they've drifted apart.

The source files contain detailed comments explaining *why* things are built
the way they are — read those before restructuring anything.

## Customizing

- **Colors, logo, fonts** — use the theme editor in Rock's admin UI. No code.
- **Lock the site to light mode** — some brands want the same look for every
  visitor. Un-comment the clearly marked block at the bottom of
  `Styles/_tokens.scss` and rebuild.
- **Use a webfont** — `@import` the font at the top of
  `Styles/_components.scss`, then update the font family defaults in
  `theme.json` and `Styles/_tokens.scss`.
- **Add your own styles** — add rules to `Styles/_components.scss` using
  Rock's color variables (`var(--color-primary)`,
  `var(--color-interface-strong)`, …) so dark mode keeps working
  automatically.

## License

MIT (see [LICENSE](LICENSE)). `Layouts/Error.aspx.cs` and `Layouts/Dialog.aspx`
derive from Rock RMS files under the Rock Community License.
