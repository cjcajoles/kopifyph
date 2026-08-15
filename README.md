# Kopify PH — Website MVP

Standalone, self-hosted rebuild of the Kopify PH sales page. Plain HTML + Tailwind CSS (CDN) + vanilla JS. No build step — deploy by dragging this folder into [Netlify Drop](https://app.netlify.com/drop).

## Before launch — config to update

All in `index.html`:

| What | Where | Current value |
|---|---|---|
| Checkout links | `<script>` near bottom, `CHECKOUT_URL_1/3/10` | `https://kopify.shop/...` placeholders — swap for real/Xendit links |
| Meta Pixel ID | `<head>`, `META_PIXEL_ID` | `"REPLACE_ME"` — pixel snippet is wired (fires `PageView` on load, `InitiateCheckout` on the 3 order buttons) but inert until a real ID is set |

## Known limitation: photos are placeholders; a few text blocks need a final proofread

This build could not reach `kopify.shop` directly (network egress to that domain, and its related `kopify.ph` / `buy.kopify.ph` domains, was blocked in the build environment). Most of the real copy below was instead transcribed from a screenshot of the live page the client provided partway through the build. What's real vs. still-uncertain:

**Real / high confidence:**
- All hero, product intro, benefits grid, distributor section, and pricing copy — from Spec.md.
- Founders' letter (Randave & CJ), hero callout ("Your coffee is boring..."), benefits/testimonials/ingredients CTA taglines and stats row (5.0★, 10K+ Ratings, 10K+ Sold), and the "It's not just coffee...It's Kopify" benefits list — transcribed from the client's screenshot.
- The 20-ingredient list and its 4 groupings (Moringa, Turmeric, Barley, Goji Berry groups) — transcribed from the screenshot and cross-checked against public search results.
- FAQ distributor answer — verbatim from spec: "Yes. Email us at support@kopify.ph or message our Facebook Page to resell our brand."
- Testimonial names (Cathy Lim-Domingo, Ots Jimenez, Mara Gaviola, Direk Paul, Joana Lazaro, Cilebritee Shop) — from spec.

**Needs a final proofread — search for `TODO` in `index.html`:**
- The 6 testimonial quotes were transcribed from small print in the screenshot and may have small wording errors — worth a quick compare against the live page before launch.
- Most FAQ answers (other than the distributor one) are still best-effort copy in the site's voice, not transcribed from a source — the FAQ wasn't visible in the screenshot.

**Still placeholder:**
- All product/hero/testimonial/founder/collage/benefit photos are rendered as labeled brown/gold placeholder shapes (per spec's fallback instruction) — screenshots let us recover the *text* and layout, but not usable image files. If you can share the individual image files (not a full-page screenshot), they can be dropped in directly.

## FDA Approved section

New section added after the founders' letter, per client request, showing the certificate with an arrow callout. Registration details (FDA Reg. No. FR-4000015029346, brand/product name, packaging, validity 13 Mar 2026 – 13 Mar 2029) are transcribed from the certificate the client shared and are real. The **manufacturer name and address are intentionally left redacted** — the client said this is not allowed to be shown publicly. The certificate itself is still a placeholder card (text only); swap in the real certificate image when available, and keep the manufacturer field blurred/cropped out of that image too, not just the text summary.

## PWA

`manifest.json` + meta tags make the site installable to a home screen. App icons are generated placeholder brand marks, inlined as base64 `data:` URIs directly in `manifest.json` and `index.html` (no separate binary asset files, keeping the whole site push/deploy-friendly as plain text).

## Structure

```
index.html      — entire site (single file, Tailwind via CDN)
manifest.json   — PWA manifest
```
