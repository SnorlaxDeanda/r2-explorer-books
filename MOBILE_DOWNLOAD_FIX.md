# Mobile Download Fix

## Issue
Downloads fail on iOS/Android devices because programmatic `a.click()` (synthetic click) doesn't work on mobile browsers.

## Solution
Added mobile user agent detection with fallback to `window.location.href` for file downloads.

## Changes Made

### Files Modified
- `node_modules/r2-explorer/dashboard/assets/index.706c4d3e.js` - `downloadObject` function
- `node_modules/r2-explorer/dashboard/assets/EmailFilePage.ccbeefd3.js` - `downloadAtt` function

### Mobile Detection Regex
```javascript
/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i
```

### Implementation
For both file downloads and email attachments:
```javascript
if(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)){
  window.location.href=downloadUrl;
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
- On local development, these changes persist as long as node_modules is not deleted
