# Procure to Pay portal (prototype)

A single self-contained page: `index.html` holds the whole clickable prototype (OneCart 360, CreditIQ, DealFlow AI and the Anya AI concept tabs), with its art, icons and fonts embedded. No build step and no external requests.

This branch exists so a separate Vercel project can serve the portal at the root of its own address. The source of truth is `p2p/index.html` on the main working branch; this branch is updated from it.

Vercel settings: Framework Preset "Other", no build command, Root Directory "./", Production Branch `p2p-portal`.
