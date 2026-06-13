# AI_USAGE.md: AI Usage & Collaboration Log

This document lists the AI tools used, key prompts, and details three concrete instances where the AI generated incorrect results, how we detected them, and what modifications were made to resolve them.

---

## 1. AI Tools Used & Key Prompts
*   **AI Collaborator**: Gemini 3.5 Flash (via the Antigravity Agentic IDE).
*   **Key Prompts**:
    *   *Schema Design Prompt*: "Design a relational database schema in Prisma to map users, groups, timeline memberships, USD/INR multi-currency transactions, and comment threads."
    *   *CORS Whitelisting Prompt*: "We have deployed our frontend on Vercel and backend on Render. Connect them by writing a CORS configuration that allows both REST APIs and socket handshakes to succeed."
    *   *CSV Anomaly Parsing Prompt*: "Ingest expenses_export.csv. Detect the 12+ anomalies including negative amounts, mixed dates, unregistered members, casing discrepancies, and conflicting duplicates. Return a preview JSON report."

---

## 2. Concrete Cases of AI Hallucinations / Errors

### Case 1: Prisma Client Schema Mismatch (P1012 Validation Failure)
*   **What the AI produced**: Suggested putting `prisma` under `devDependencies` and running `npx prisma generate` directly on Render.
*   **What went wrong**: Render builds node apps under `NODE_ENV=production`, meaning `devDependencies` are omitted during `npm install`. When the build command ran `npx prisma generate`, it defaulted to downloading the latest Prisma version from npm (`7.8.0`). Prisma v7.x has a breaking change that removes `url` from `schema.prisma`, causing a P1012 validation failure.
*   **How we caught it**: The Render build failed with exit code P1012.
*   **What we changed**: We moved `prisma` into `dependencies` in `package.json`, ran a local `npm install` to update `package-lock.json`, and set the build command to `npm install && prisma generate` to force Render to compile schemas using the matching local v6.x compiler.

---

### Case 2: CORS Wildcard socket handshake blockage
*   **What the AI produced**: Set `corsOptions.origin` to `'*'` in `backend/index.js` for both Express and Socket.io.
*   **What went wrong**: While wildcard origins work for simple GET requests, they fail for Socket.io handshakes that pass authorization headers or credentials, causing connections from Vercel to fail.
*   **How we caught it**: Caught via the browser developer console showing CORS blockage during socket connection.
*   **What we changed**: Refined the CORS settings to use an array of explicit whitelisted domains: `['http://localhost:3000', 'http://localhost:5173', 'https://splitwise-gold-seven.vercel.app']`.

---

### Case 3: Cents rounding drift in split computations
*   **What the AI produced**: Calculated splits simply by multiplying percentages or dividing equally, without accounting for floating-point divisions.
*   **What went wrong**: Equal division (e.g. 100 split among 3 users) yielded $33.33 each, leaving $0.01 unallocated. This caused validation failures where the sum of splits ($99.99) did not match the total amount ($100.00).
*   **How we caught it**: API tests for unequal split validation threw errors.
*   **What we changed**: We introduced a rounding adjustment function (`adjustRoundingDiscrepancy`) that calculates the cents difference and redistributes the remainder to the split members so the sum always matches the target total.
