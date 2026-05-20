# technicalmarketing.org

A quarterly index of current thinking on technical marketing — the work that sits between engineering, product, and the people who buy what they build.

## Stack

- **Static site**: Plain HTML, CSS. No build step. No JavaScript dependencies.
- **Hosting**: Cloudflare Pages.
- **DNS**: Cloudflare.
- **Forms**: Formspree for email capture (free tier).
- **Fonts**: Fraunces (serif) and Inter (sans), loaded from Google Fonts.

## File structure

```
.
├── index.html        # The main page
├── 404.html          # Custom 404
├── favicon.svg       # Typographic mark
├── robots.txt        # Search engine directives
├── sitemap.xml       # URL inventory for search engines
├── feed.xml          # RSS feed
├── _headers          # Cloudflare Pages security and caching headers
├── _redirects        # Cloudflare Pages redirect rules
└── README.md         # This file
```

## Before deploying

### 1. Replace Formspree form ID

In `index.html`, find:

```html
<form class="subscribe__form" action="https://formspree.io/f/YOUR_FORM_ID" method="POST" novalidate>
```

Replace `YOUR_FORM_ID` with your actual Formspree form ID. Get one free at [formspree.io](https://formspree.io). Free tier supports 50 submissions/month.

### 2. Add Open Graph image

Create a 1200x630 PNG named `og-image.png` and place it at the root. This is the image that shows when the site is shared on LinkedIn, X, or in iMessage. Recommended content: centered "Technical Marketing" wordmark in Fraunces over a neutral background, with subtitle "A quarterly index" below.

Until you have a custom image, the meta tags reference `og-image.png` but the file won't exist. Shares will fall back to a text-only preview.

### 3. Verify the schema markup

The page includes JSON-LD structured data for `Periodical` and `ItemList`. After deploying, run the page through [Google's Rich Results Test](https://search.google.com/test/rich-results) to confirm the schema is parseable. Fix any warnings.

## Deploy to Cloudflare Pages

### Option A: GitHub integration (recommended)

1. Push this repository to GitHub.
2. In Cloudflare dashboard → Workers & Pages → Create application → Pages → Connect to Git.
3. Select the repository.
4. Build settings:
   - **Framework preset**: None
   - **Build command**: (leave empty)
   - **Build output directory**: `/`
5. Click "Save and Deploy."
6. Cloudflare assigns a `*.pages.dev` URL. Verify the site loads.
7. In Pages → Custom domains → add `technicalmarketing.org` and `www.technicalmarketing.org`.
8. Cloudflare provisions SSL certificates automatically.

### Option B: Direct upload

1. Zip the contents of this directory.
2. In Cloudflare dashboard → Workers & Pages → Create application → Pages → Upload assets.
3. Drop the zip.
4. Configure custom domain as above.

## DNS setup (Namecheap → Cloudflare)

If the domain is registered at Namecheap but you want Cloudflare DNS:

1. In Cloudflare → Add a site → enter `technicalmarketing.org`.
2. Cloudflare provides two nameservers (e.g., `xxx.ns.cloudflare.com`).
3. In Namecheap → Domain List → Manage → Nameservers → Custom DNS → paste the Cloudflare nameservers.
4. Wait 5–30 minutes for propagation.
5. Cloudflare confirms the domain is active via email.

## SEO checklist post-deploy

- [ ] Verify site loads at `https://technicalmarketing.org` with valid SSL
- [ ] Submit `sitemap.xml` to [Google Search Console](https://search.google.com/search-console)
- [ ] Submit `sitemap.xml` to [Bing Webmaster Tools](https://www.bing.com/webmasters)
- [ ] Run the page through [Google PageSpeed Insights](https://pagespeed.web.dev) — target 95+ on all metrics
- [ ] Run [Lighthouse](https://developer.chrome.com/docs/lighthouse) audit — target 100 on Accessibility and SEO
- [ ] Verify structured data with [Rich Results Test](https://search.google.com/test/rich-results)
- [ ] Test the social preview with [opengraph.xyz](https://www.opengraph.xyz)

## Editorial workflow

This is a quarterly publication. Each volume:

1. Branch from `main`: `git checkout -b volume-02`
2. Update entries in `index.html`
3. Update the volume label in the hero kicker (`Vol. 02 — Summer 2026`)
4. Update the stats: pieces indexed, next update quarter
5. Update `feed.xml` with a new item for the volume
6. Update `sitemap.xml` lastmod date
7. Commit and merge to main when ready to publish

## Independence

This index is edited independently. It is not affiliated with or endorsed by any vendor, employer, or organization referenced in the index.

## License

Content: All rights reserved.
Code: MIT
