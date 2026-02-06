# TODO - Fix file upload error ✅ COMPLETED

## Problem (FIXED)
`Cannot destructure property 'files' of 'req.body' as it is undefined`

This happens because file uploads use `multipart/form-data`, not JSON, so `req.body` is undefined.

## Solution Implemented

### Step 1: Install formidable dependency ✅
- [x] Added `formidable` to root `package.json`
- [x] Added `@types/formidable` as dev dependency

### Step 2: Update api/ingest.ts ✅
- [x] Added `export const config = { api: { bodyParser: false } }` to disable Vercel's body parser
- [x] Imported `IncomingForm`, `File`, `Fields` from `formidable`
- [x] Used `form.parse()` to extract files from multipart request
- [x] Handled both array and single file cases
- [x] Passed extracted files to `indexDocuments()`

## Changes Made

**api/ingest.ts:**
```typescript
import { IncomingForm, File, Fields } from "formidable";

export const config = {
  api: {
    bodyParser: false,  // Required for file uploads
  },
};

// Use form.parse() instead of req.body.files
form.parse(req, async (err, fields, files) => {
  // Handle file extraction properly
});
```

## How Frontend Should Send Files

```javascript
const formData = new FormData();
formData.append("file", file);

await fetch("/api/ingest", {
  method: "POST",
  body: formData
  // Don't set Content-Type header - browser does it automatically
});
```

## Next Steps
- Rebuild the backend: `cd backend && npm run build`
- Deploy to Vercel or test locally

