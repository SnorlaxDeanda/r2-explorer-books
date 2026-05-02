# Mobile Download Fix

## Issue
Downloads can be saved as `.html` on iOS/Android devices when the mobile browser follows the app route instead of treating the response as a file download.

## Solution
Downloads navigate directly to a dedicated `/api/download/.../<filename>` URL, plus Worker response headers that force the object response to be saved as an attachment.

## Changes Made

### Files Modified
- `src/index.ts` - adds a dedicated direct-download endpoint and download-safe response headers
- `node_modules/r2-explorer/dashboard/assets/index.706c4d3e.js` - `downloadObject` function
- `node_modules/r2-explorer/dashboard/assets/EmailFilePage.ccbeefd3.js` - `downloadAtt` function

### Implementation
For both file downloads and email attachments:
```javascript
window.location.href = `/api/download/${bucket}/${encodeURIComponent(encodedKey)}/${encodeURIComponent(filename)}`;
```

## Notes
- These changes apply to the r2-explorer@1.1.10 package in node_modules
- The changes are automatically included when the app is built/deployed
- The install script reapplies the dashboard patch after dependencies are installed
