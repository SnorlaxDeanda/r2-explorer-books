# Mobile Download Fix

## Issue
Downloads can be saved as `.html` on iOS/Android devices when the mobile browser follows the app route instead of treating the response as a file download.

## Solution
Added mobile user agent detection with direct navigation to a `?download=true` URL, plus Worker response headers that force the object response to be saved as an attachment.

## Changes Made

### Files Modified
- `src/index.ts` - wraps the R2 Explorer fetch handler and adds download-safe headers for `?download=true` object responses
- `node_modules/r2-explorer/dashboard/assets/index.706c4d3e.js` - `downloadObject` function
- `node_modules/r2-explorer/dashboard/assets/EmailFilePage.ccbeefd3.js` - `downloadAtt` function

### Mobile Detection Regex
```javascript
/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i
```

### Implementation
For both file downloads and email attachments:
```javascript
if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
  window.location.href = downloadUrl + "?download=true";
  return;
}
// Fall back to standard anchor.click() for desktop
const a = document.createElement("a");
a.download = filename;
a.href = downloadUrl;
document.body.appendChild(a);
a.click();
document.body.removeChild(a);
```

## Notes
- These changes apply to the r2-explorer@1.1.10 package in node_modules
- The changes are automatically included when the app is built/deployed
- The install script reapplies the dashboard patch after dependencies are installed
