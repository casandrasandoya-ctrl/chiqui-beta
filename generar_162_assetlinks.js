const fs = require('fs');
const path = require('path');

const content = `[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "com.chiqui.app",
      "sha256_cert_fingerprints":
        ["0C:1B:47:40:4B:FF:59:3D:52:4A:29:CF:52:2E:DA:6B:4C:F7:3A:C5:59:C8:B5:A5:6C:49:E4:FA:BE:B4:AA:9A"]
    }
  }
]
`;

const dir = path.join('public', '.well-known');
fs.mkdirSync(dir, { recursive: true });

const filePath = path.join(dir, 'assetlinks.json');
fs.writeFileSync(filePath, content, 'utf8');

console.log('OK:', filePath);
