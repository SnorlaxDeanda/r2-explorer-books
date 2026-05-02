#!/usr/bin/env node
/**
 * Apply mobile download fix to r2-explorer
 * Fixes EPUB and other files downloading with .html extension on mobile
 */

const fs = require('fs');
const path = require('path');

const r2ExplorerPath = path.join(__dirname, '../node_modules/r2-explorer');

// File paths to patch
const filesToPatch = [
  path.join(r2ExplorerPath, 'dashboard/assets/EmailFilePage.ccbeefd3.js'),
  path.join(r2ExplorerPath, 'dashboard/assets/index.706c4d3e.js'),
];

// Original pattern: downloadAtt function
const originalDownloadAtt = 'downloadAtt:e=>{console.log(e);const t=document.createElement("a");t.download=e.filename,t.href=e.downloadUrl,document.body.appendChild(t),t.click(),document.body.removeChild(t)}';

// Fixed pattern: mobile browsers are most reliable when navigating directly.
const fixedDownloadAtt = 'downloadAtt:e=>{console.log(e);const t=e.downloadUrl;if(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)){window.location.href=t+"?download=true";return}const n=document.createElement("a");n.download=e.filename,n.href=t,document.body.appendChild(n),n.click(),document.body.removeChild(n)}';

// Previous mobile fix used another synthetic click, which mobile browsers may ignore.
const legacyFixedDownloadAtt = 'downloadAtt:e=>{console.log(e);const t=e.downloadUrl;if(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)){const n=document.createElement("a");n.href=t+"?download=true",n.setAttribute("download",e.filename),n.style.display="none",document.body.appendChild(n),n.click(),document.body.removeChild(n);return}const n=document.createElement("a");n.download=e.filename,n.href=t,document.body.appendChild(n),n.click(),document.body.removeChild(n)}';

// Original pattern: downloadObject function
const originalDownloadObject = 'downloadObject:function(){const u=document.createElement("a");u.download=this.prop.row.name,u.href=`${this.mainStore.serverUrl}/api/buckets/${this.selectedBucket}/${encode(this.prop.row.key)}`,document.body.appendChild(u),u.click(),document.body.removeChild(u)}';

// Fixed pattern: mobile browsers are most reliable when navigating directly.
const fixedDownloadObject = 'downloadObject:function(){const u=`${this.mainStore.serverUrl}/api/buckets/${this.selectedBucket}/${encode(this.prop.row.key)}`;if(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)){window.location.href=u+"?download=true";return}const d=document.createElement("a");d.download=this.prop.row.name,d.href=u,document.body.appendChild(d),d.click(),document.body.removeChild(d)}';

// Previous mobile fix used another synthetic click, which mobile browsers may ignore.
const legacyFixedDownloadObject = 'downloadObject:function(){const u=`${this.mainStore.serverUrl}/api/buckets/${this.selectedBucket}/${encode(this.prop.row.key)}`;if(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)){const d=document.createElement("a");d.href=u+"?download=true",d.setAttribute("download",this.prop.row.name),d.style.display="none",document.body.appendChild(d),d.click(),document.body.removeChild(d);return}const d=document.createElement("a");d.download=this.prop.row.name,d.href=u,document.body.appendChild(d),d.click(),document.body.removeChild(d)}';

let patchCount = 0;

filesToPatch.forEach(filePath => {
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  File not found: ${filePath}`);
    return;
  }

  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let patched = false;

    // Try patching downloadAtt
    if (!content.includes(fixedDownloadAtt) && content.includes(originalDownloadAtt)) {
      content = content.replace(originalDownloadAtt, fixedDownloadAtt);
      patched = true;
      patchCount++;
      console.log(`✅ Patched downloadAtt in ${path.basename(filePath)}`);
    } else if (content.includes(legacyFixedDownloadAtt)) {
      content = content.replace(legacyFixedDownloadAtt, fixedDownloadAtt);
      patched = true;
      patchCount++;
      console.log(`✅ Patched downloadAtt in ${path.basename(filePath)}`);
    }

    // Try patching downloadObject
    if (!content.includes(fixedDownloadObject) && content.includes(originalDownloadObject)) {
      content = content.replace(originalDownloadObject, fixedDownloadObject);
      patched = true;
      patchCount++;
      console.log(`✅ Patched downloadObject in ${path.basename(filePath)}`);
    } else if (content.includes(legacyFixedDownloadObject)) {
      content = content.replace(legacyFixedDownloadObject, fixedDownloadObject);
      patched = true;
      patchCount++;
      console.log(`✅ Patched downloadObject in ${path.basename(filePath)}`);
    }

    if (patched) {
      fs.writeFileSync(filePath, content, 'utf8');
    }
  } catch (error) {
    console.error(`❌ Error patching ${filePath}:`, error.message);
  }
});

if (patchCount > 0) {
  console.log(`\n✅ Mobile download fix applied to ${patchCount} location(s)`);
  process.exit(0);
} else {
  console.log('\n⚠️  No patches applied. Files may already be patched or not found.');
  process.exit(0);
}
