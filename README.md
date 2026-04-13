# ALE Pricing Hub — Chrome Extension

## Repository Structure

```
/
├── ale-pricing-hub-extension/   ← Load THIS folder in Chrome (unpacked)
│   ├── manifest.json
│   ├── content.js
│   ├── updates.xml
│   └── icons/
├── ale-pricing-hub-extension.zip  ← Chrome fetches THIS for updates
└── ale-pricing-hub.user.js        ← Tampermonkey version (keep for reference)
```

## Installing (first time)

1. Download or clone this repository
2. Open Chrome → `chrome://extensions`
3. Enable **Developer mode** (top right)
4. Click **Load unpacked** → select the `ale-pricing-hub-extension` folder
5. Done — active on all AroFlo pages

## Updating (for users)

1. Go to `chrome://extensions`
2. Click the **Update** button (top left, only visible in Developer mode)

Chrome also checks for updates automatically every few hours.

## Pushing an update (for developers)

1. Make changes to `content.js`
2. Bump the `"version"` number in `manifest.json` (e.g. 1.1 → 1.2)
3. Update the `version=` attribute in `updates.xml` to match
4. Repackage: `zip -r ale-pricing-hub-extension.zip ale-pricing-hub-extension/ --exclude ale-pricing-hub-extension/key.pem`
5. Commit and push all files to GitHub main branch
6. Chrome will auto-update within a few hours, or users can hit Update manually
