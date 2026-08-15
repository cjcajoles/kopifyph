# Kopify PH — Website MVP

Standalone, self-hosted rebuild of the Kopify PH sales page. Plain HTML + Tailwind CSS (CDN) + vanilla JS. No build step — deploy by dragging this folder into [Netlify Drop](https://app.netlify.com/drop).

## Before launch — config to update

All in `index.html`:

| What | Where | Current value |
|---|---|---|
| Checkout links | `<script>` near bottom, `CHECKOUT_URL_1/3/10` | `https://kopify.shop/...` placeholders — swap for real/Xendit links |
| Meta Pixel ID | `<head>`, `META_PIXEL_ID` | `"REPLACE_ME"` — pixel snippet is wired (fires `PageView` on load, `InitiateCheckout` on the 3 order buttons) but inert until a real ID is set |

## Known limitation: images and some copy are placeholders

This build could not reach `kopify.shop` (network egress to that domain — and its related `kopify.ph` / `buy.kopify.ph` domains — was blocked in the build environment), so live-site content could not be scraped 1:1. What's real vs. placeholder:

**Real / from spec (verbatim):**
- All hero, product intro, benefits grid, distributor section, and pricing copy — taken directly from Spec.md.
- The 20-ingredient list (Moringa/Malunggay, Glutathione, Collagen, Mangosteen, L-Carnitine, Turmeric, Garcinia Cambogia, Inulin Fiber, Green Coffee Extract, Lemon, Barley, Coffee, Non-Dairy Creamer, Chlorella, Vitamin C, Goji Berry, Grape Seed, Spirulina, Acai Berry, Stevia) — confirmed via public search results, not scraped.
- FAQ distributor answer — verbatim from spec: "Yes. Email us at support@kopify.ph or message our Facebook Page to resell our brand."
- Testimonial names (Cathy Lim-Domingo, Ots Jimenez, Mara Gaviola, Direk Paul, Joana Lazaro, Cilebritee Shop) — from spec.

**Placeholder — search for `TODO` in `index.html` to find every instance:**
- All product/hero/testimonial/founder photos are rendered as labeled brown/gold placeholder blocks (per spec's fallback instruction). The spec's CDN filenames are noted in HTML comments next to each placeholder so real URLs can be dropped in quickly once available.
- Testimonial quotes, the founders' letter body, and most FAQ answers (other than the distributor one) are best-effort placeholder copy in the site's voice — not scraped from the live page. Re-sync with the live site before this replaces kopify.shop in production.
- Ingredient grouping into "Moringa / Turmeric / Barley / Goji Berry" groups is this build's own organization of the real 20-ingredient list, not confirmed against the live page's exact grouping.
- Benefit icons are original inline SVGs (not the live site's icon images).

## PWA

`manifest.json` + meta tags make the site installable to a home screen. App icons are generated placeholder brand marks, inlined as base64 `data:` URIs directly in `manifest.json` and `index.html` (no separate binary asset files, keeping the whole site push/deploy-friendly as plain text).

## Structure

```
index.html      — entire site (single file, Tailwind via CDN)
manifest.json   — PWA manifest
```
