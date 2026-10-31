# Tsuru design system

`@chepelcr/tsuru-design-system` — the shared visual language of Tsuru Account and
the virtual fairs: design tokens, accessible UI components, a small pixel-art
engine and the customisable avatar. It follows the sketches approved on
2026-10-29 (client panel, order/proof, avatar editor; package
"Plataforma_Ferias_Implementacion_v1_0").

```bash
pnpm install
pnpm dev     # demo page at http://127.0.0.1:5180 (tokens, components, avatar matrix)
pnpm test    # schema, migration and composer tests
pnpm build   # dist/: ESM bundle, .d.ts, styles.css, tokens.css, avatar-catalog.json
```

## Use it in an app

```ts
import "@chepelcr/tsuru-design-system/styles.css"; // tokens + components, once per app
import { AvatarEditor, AvatarPortrait, Button, StatusChip, normalizeAvatar } from "@chepelcr/tsuru-design-system";
```

React 18 is a peer dependency. The package is published to GitHub Packages, so the
consuming repository needs an `.npmrc` with
`@chepelcr:registry=https://npm.pkg.github.com` and a token with `read:packages`.

## Tokens (`src/tokens`)

CSS variables with the `--tsr-` prefix (light and dark), mirrored in `tokens.ts`
for canvas or Phaser code. Forest-and-cream surfaces, the fair's game palette
(`--tsr-game-*`), six status tones (`success`, `warning`, `review`, `pending`,
`info`, `danger`), type (Source Serif 4 display, DM Sans body, Pixelify Sans for
game accents only), spacing, radii, shadows and motion. Components read only
tokens; an app may override any of them on `:root`.

## Components (`src/components`)

Plain `tsr-*` classes with thin React wrappers, so a Phaser HTML overlay can use
the same look without React: `Button`, `Card`, `Field`, `Input`, `Select`,
`StatusChip` (icon + words, never colour alone), `StatusPill`, `Notice`,
`Stepper`, `Dropzone`, `FileChip`, `EmptyState`, `Skeleton`, `Mark`, the
`tsr-table` and `tsr-nav` classes, choice controls (`ChoiceGroup`,
`OptionTile`, `Swatch`, `SwatchRow`, `CustomColor`, `CategoryTabs` — native
radios/checkboxes, keyboard friendly) and the game framing (`PixelBanner`,
`PixelFrame`). A stroke icon set is included so there is no icon dependency.

## Pixel engine (`src/pixel`)

`Raster` (whole pixels, no anti-aliasing), `spriteGrid`, `outlined`, `tone`,
`mixHex` and `PixelCanvas` (nearest-neighbour, whole-number scale). Ported from the
origin film (`videos/tsuru-launch/src/pixel`).

## Avatar (`src/avatar`)

The avatar belongs to the person's platform account and is the same in every
store and fair. It stores **only catalog IDs and `#RRGGBB` colours** — never
images, roles or speed — so a fair room can relay it safely.

- `catalog.json` — the single source of IDs: body, facial hair, ten hair styles,
  tops, bottoms, dresses, shoes, bags, accessories (one per group, at most four)
  and wheelchair models, with tintable flags, default colours, palettes and the
  example looks. **The store backend vendors a copy** (`be/store-be/app/data/avatar_catalog.json`,
  hash-pinned in its tests); copy it again whenever this file changes.
- `schema.ts` — `AvatarProfile` version 2 (with `height` and `weight`, −2…2: altura and peso like a Mii), `DEFAULT_AVATAR`, `migrateV1` (the
  first Account avatar: hair/outfit/accessory), `normalizeAvatar` (any stored
  value → drawable profile) and `validateAvatar` (what the server would refuse).
- `compose.ts` — the layered composer on a 36 × 47 cell grid: body → shoes →
  bottom/dress → top → bag → hair → accessories, with the wheelchair split behind
  and in front. Four directions (left mirrors right), standing and seated poses
  (a wheelchair always sits), two idle and six walking frames: 32 positions per
  pose. Altura adds or removes rows in the shins and torso (the feet stay on the
  floor); peso adds or removes a column on each side below the neck. `layers`
  draws single pieces for option thumbnails.
- `scene.ts` — the editor's paved isometric tile, the client panel's garden card,
  the portrait and the fair banner sides.
- Components — `AvatarSprite`, `AvatarPortrait`, `AvatarGarden`, `AvatarStage`
  (turn left/right), `AvatarFigure` and the controlled `AvatarEditor`
  (categories, skin tone, options, examples, Restablecer / Vista previa / save
  slot). Motion respects `prefers-reduced-motion`.

For Phaser: compose frames with `composeAvatar(profile, { direction, pose, motion, frame })`,
paint the `cells` into a canvas texture (or a `Raster`) and use `anchorX/anchorY`
as the foot point on the isometric tile.

## Releasing

Bump `version`, run `pnpm test && pnpm build`, tag `vX.Y.Z` and publish
(`.github/workflows/publish.yml`, or `npm publish` with a `write:packages` token).
