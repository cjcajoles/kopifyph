# Kopify PH — Website MVP

Standalone, self-hosted rebuild of the Kopify PH sales page. Plain HTML + Tailwind CSS (CDN) + vanilla JS. No build step — deploy by dragging this folder into [Netlify Drop](https://app.netlify.com/drop).

## Before launch — config to update

All in `index.html`:

| What | Where | Current value |
|---|---|---|
| Checkout links | `<script>` near bottom, `CHECKOUT_URL_1/3/10` | `https://kopify.shop/...` placeholders — swap for real/Xendit links |
| Meta Pixel ID | `<head>`, `META_PIXEL_ID` | `"REPLACE_ME"` — pixel snippet is wired (fires `PageView` on load, `InitiateCheckout` on the 3 order buttons) but inert until a real ID is set |

## Deviations from Spec.md, per client request mid-build

- **Founders' letter section removed entirely** (was spec section 6, "From the Creators of Kopify..."). The client decided it wasn't necessary. Page order is now: Ingredients → 20-in-1 summary graphic → FDA Approved → Pricing.
- **FDA Approved section added** (not in the original spec) — real certificate with a badge + arrow callout, placed where the founders' letter used to be. `assets/fda-certificate.jpg` is the actual FDA Certificate of Product Registration (Reg. No. FR-4000015029346, valid 13 Mar 2026 – 13 Mar 2029), rendered from a PDF the client uploaded. The **manufacturer name and address are pixelated out** in the image itself, per the client's instruction that this must not be shown publicly — do not restore it or re-render from the original PDF without re-applying the redaction.
- **20-in-1 "Powered by Nature" summary graphic added** (not in the original spec) — `assets/ingredients-summary.jpg`, placed right after the "It's not just coffee...It's Kopify" CTA, per client request.

## Pricing pack photos

`assets/pack-1box.jpg`, `pack-3boxes.jpg`, `pack-10boxes.jpg` are the client's real product renders, extracted from a PDF they uploaded and matched to the correct card by content (single pouch + sachet → 1 Box, 3 pouches → 3 Boxes, 10 pouches → 10 Boxes).

## Ingredient group images

`assets/ingredient-{moringa,turmeric,barley,gojiberry}.jpg` are the client's real infographics, extracted from a PDF they uploaded. Each one is self-contained (group title + all 5 ingredient photos baked into the image), so the ingredients section now just displays these directly — the separate HTML titles/bullet lists that stood in for them before were removed to avoid duplicating the same info. The groupings/ingredient lists in these images matched our best-effort transcription exactly, confirming that earlier work was accurate.

## Testimonial photos + corrected quotes

Real photos added for 3 of the 6 testimonials, per client-supplied PDF matched by the client's description (the woman → Cathy, the guy → Ots, the couple selfie → Mara): `assets/testimonial-{cathy,ots,mara}.jpg`. The client also corrected two quotes to the real wording — Cathy Lim Domingo's and Direk Paul's are now verbatim as given by the client. Ots's, Mara's, Joana's, and Cilebritee's quotes are still the earlier best-effort transcription (not corrected/confirmed yet).

## Benefits grid photos

`assets/benefit-lowcalorie.jpg` is a real photo (steaming cup + coffee splash) from a client-supplied PDF, placed in the "Low Calorie Coffee" card per client request. The other 5 benefit cards are still placeholders.

## Known limitation: most other photos are still placeholders

This build could not reach `kopify.shop` directly (network egress to that domain, and its related `kopify.ph` / `buy.kopify.ph` domains, was blocked in the build environment). Most of the real copy was instead transcribed from screenshots of the live page the client provided partway through the build. What's real vs. still-uncertain:

**Real / high confidence:**
- All hero, product intro, benefits grid, distributor section, and pricing copy — from Spec.md.
- Hero callout ("Your coffee is boring..."), benefits/testimonials/ingredients CTA taglines and stats row (5.0★, 10K+ Ratings, 10K+ Sold), and the "It's not just coffee...It's Kopify" benefits list — transcribed from client screenshots.
- The 20-ingredient list and its 4 groupings (Moringa, Turmeric, Barley, Goji Berry groups) — transcribed and cross-checked against public search results, and confirmed again by the FAQ Q1 screenshot and the real ingredient images.
- FAQ Q1 (ingredients) — verbatim from a live-site screenshot. FAQ distributor answer — verbatim from spec.
- FDA certificate, the 3 pricing pack photos, the 4 ingredient group images, the 20-in-1 summary graphic, and 3 of 6 testimonial photos — real files (see above).
- Testimonial names (Cathy Lim-Domingo, Ots Jimenez, Mara Gaviola, Direk Paul, Joana Lazaro, Cilebritee Shop) — from spec. Cathy's and Direk Paul's quotes are client-confirmed verbatim.

**Needs a final proofread — search for `TODO` in `index.html`:**
- Ots's, Mara's, Joana's, and Cilebritee's testimonial quotes are still best-effort transcriptions and may have small wording errors.
- FAQ answers 2–10 (everything except Q1 and the distributor one) are still best-effort copy in the site's voice, not transcribed from a source.

**Still placeholder:**
- Hero/product-intro/collage photos, 5 of 6 benefit-grid photos, and Joana's + Cilebritee's testimonial photos, are labeled brown/gold placeholder shapes (per spec's fallback instruction). The Kopify logo is a hand-recreated SVG, not the source file. If you can share individual image files (not full-page screenshots), they can be dropped in directly.

## PWA

`manifest.json` + meta tags make the site installable to a home screen. App icons are generated placeholder brand marks, inlined as base64 `data:` URIs directly in `manifest.json` and `index.html`.

## Structure

```
index.html                     — entire site (Tailwind via CDN)
manifest.json                  — PWA manifest
assets/fda-certificate.jpg     — real FDA certificate (manufacturer redacted)
assets/pack-1box.jpg           — real product photo, 1 Box card
assets/pack-3boxes.jpg         — real product photo, 3 Boxes card
assets/pack-10boxes.jpg        — real product photo, 10 Boxes card
assets/ingredient-*.jpg         — real ingredient group infographics (4 files)
assets/ingredients-summary.jpg — real "20-in-1, Powered by Nature" summary graphic
assets/testimonial-cathy.jpg   — real photo, Cathy Lim Domingo
assets/testimonial-ots.jpg     — real photo, Ots Jimenez
assets/testimonial-mara.jpg    — real photo, Mara Gaviola
assets/benefit-lowcalorie.jpg  — real photo, "Low Calorie Coffee" benefit card
```
