# DECISIONS.md: Decision Log

This document outlines the core product and engineering decisions made during the design, implementation, and deployment of the Splitwise Clone application.

---

## 1. Monorepo Repository Structure & Subdirectory Routing
*   **Options Considered**: 
    1. Two separate repositories (frontend, backend).
    2. Monorepo (unified repository).
*   **Chosen Option**: Monorepo (unified repository).
*   **Rationale**: Monorepo makes development and AI collaboration simpler because all schemas, documentation, and components reside in a single workspace. We utilized `vercel.json`'s `experimentalServices` configurations to route and build the subfolders (`/frontend` and `/backend`) cleanly on Vercel, and deployed the backend Express listener separately to Render.

---

## 2. Interactive CSV Import Preview vs. Automated Silent Import
*   **Options Considered**: 
    1. Automatically parse, clean, and insert CSV rows directly into the DB with silent heuristic guesses.
    2. Build an interactive **CSV Review UI** showing parsed rows, warnings, anomalies, and allowing the user to select which rows to import, toggle settlement flags, and resolve duplicates manually.
*   **Chosen Option**: Interactive CSV Review UI (Option 2).
*   **Rationale**: Option 2 satisfies Meera's requirement ("Clean up the duplicates — but I want to approve anything the app deletes or changes"). It prevents dirty data corruption in the database by letting the user review normalized fields (like mapped payers and rounded amounts) and approve duplicates or resolve conflicts (like Thalassa dinner) before writing to the database.

---

## 3. Timeline-based Membership (Sam & Meera's Timelines)
*   **Options Considered**:
    1. Ignore date ranges and split all expenses equally among all historical members.
    2. Introduce a membership timeline tracking when users join or leave a group.
*   **Chosen Option**: Membership timeline (Option 2).
*   **Rationale**: This addresses Sam's request ("I moved in mid-April. Why would March electricity affect my balance?") and Meera's move-out date. The `GroupMember` model includes a `leftAt` field. During split calculations and import pre-validation, the system checks if the expense date falls within each member's active interval: `[joinedAt, leftAt || Infinity]`. Inactive members are automatically omitted from EQUAL splits.

---

## 4. Multi-currency (USD vs INR) Handling
*   **Options Considered**:
    1. Multi-currency ledger database schema (storing multiple balances per group).
    2. Convert foreign currency (USD) to base group currency (INR) at import/entry time.
*   **Chosen Option**: Convert to base group currency at entry/import time (Option 2) using a fixed rate of `1 USD = 83 INR`.
*   **Rationale**: Storing multiple balances (USD and INR) in a single group complicates the "one simple number per person" payment requirement. Converting to a single base currency (INR) during the CSV import/creation process allows the transaction-minimization engine to compute a single net balance while preserving the original currency in notes/meta fields.

---

## 5. Unregistered Guest Splitting Policy (Kabir's Share)
*   **Options Considered**:
    1. Throw validation error and crash/block the import.
    2. Exclude the guest and split the amount among the active flatmates.
    3. Charge the guest's split portion directly to their inviting flatmate.
*   **Chosen Option**: Option 3 (Charge Kabir's share directly to Dev).
*   **Rationale**: Crashing imports is a poor user experience. Since Kabir is "Dev's friend" who joined for the day, Dev is the host/inviter. Reallocating Kabir's proportional equal split to Dev's split amount is a fair real-world policy and prevents silent calculations.
