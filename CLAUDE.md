# Tsuru design system

Standalone package repository `chepelcr/tsuru-design-system`; the workspace checkout lives at `fe/design-system` and the root monorepo ignores it. Consumers: Tsuru Account (`fe/customer-portal`) now, the virtual-fairs app next.

- Tokens first: components read only `--tsr-*` variables. Add a token instead of a literal colour; keep `tokens.ts` in sync with `tokens.css` (light values).
- Components are plain `tsr-*` classes plus thin React wrappers, so non-React surfaces (a Phaser overlay) can reuse them. Choices are native radios/checkboxes; status is never colour alone.
- The avatar stores catalog IDs and `#RRGGBB` colours only — no images, roles, speed or permissions. Every catalog item must draw in all four directions, standing and seated (tests enforce it).
- `src/avatar/catalog.json` is mirrored in `be/store-be/app/data/avatar_catalog.json` (hash-pinned in `tests/test_customer_portal.py`). Changing the catalog means copying it there and updating the hash in the same session.
- Check with `pnpm test && pnpm build`; look at the demo (`pnpm dev`) before publishing art changes.
- The ecosystem roadmap is `docs/roadmap/tsuru_roadmap.md` in the workspace; update it in the same session.
