# Build Plan: Splitwise Clone App

This document details the build plan, architecture design, and development process for the Splitwise Clone application.

---

## 1. Product Research

### How We Studied Splitwise
Splitwise is a leading debt-simplification app that tracks shared expenses, maintains group balances, and resolves debts efficiently. We mapped Splitwise's features against the requirements for this assignment.

### Workflows Identified
1.  **Group Lifecycle**: A group forms around a common theme (e.g., Roommates, Trip). Members can join or leave, but leaving is restricted if their balance is non-zero.
2.  **Expense Lifecycle**: A member records an expense, listing description, total amount, date, who paid (payer), and who shares it (split).
3.  **Split Mechanics**:
    *   *Equal*: Split amount is divided evenly.
    *   *Unequal*: Precise amounts are specified for each user; their sum must equal the total.
    *   *Percentage*: Proportions are defined as percentages; they must sum to 100%.
    *   *Share*: Proportions are defined as parts; each member owes `total * (shares / sum_shares)`.
4.  **Settlement Lifecycle**: A member pays another member directly. This is recorded as a "Settlement" transaction, which offsets their net balance.
5.  **Expense Chat**: Members discuss details within an expense. Real-time notifications ensure comments show up immediately.

### Key Product Assumptions
*   **Single Currency**: To prevent currency exchange complexity, the app assumes a single global currency (e.g., USD / $).
*   **Single Payer**: Although real Splitwise supports multiple payers (e.g., Alice paid $10 and Bob paid $20), this MVP assumes exactly **one payer** per expense.
*   **Simple Debt Resolution**: Instead of automated multi-group simplification, balances are calculated per-group and summarized individually. Within a group, we resolve balances directly (who owes what based on splits vs. payments).

---

## 2. Architecture Summary

### Tech Stack
*   **Frontend**: React (Vite) + Tailwind CSS + React Router + TanStack Query.
*   **Backend**: Node.js + Express.js + Socket.io.
*   **Database & ORM**: Neon Serverless PostgreSQL + Prisma ORM.
*   **Auth**: JSON Web Tokens (JWT) for secure session authentication.

### Database Design
The schema uses relational tables:
*   `User`: Registered accounts.
*   `Group`: Group records created by a user.
*   `GroupMember`: Connects users to groups.
*   `Expense`: Records description, total, and payer.
*   `ExpenseSplit`: Records the specific amount, percentage, or share each user owes.
*   `Settlement`: Records direct transfer payments between members.
*   `Comment`: Chat messages for an expense.

### API Design
*   Auth: `/api/auth/register`, `/api/auth/login`, `/api/auth/me`
*   Groups: `/api/groups` (GET/POST), `/api/groups/:id` (GET), `/api/groups/:id/members` (POST/DELETE)
*   Expenses: `/api/expenses` (POST), `/api/expenses/:id` (DELETE)
*   Settlements: `/api/settlements` (POST)
*   Comments: `/api/comments` (GET/POST)

### Deployment Approach
*   **Database**: Neon Console hosting PostgreSQL.
*   **Backend & Websockets**: Deployed to Render (using a single port to handle both Express and WebSockets).
*   **Frontend**: Deployed to Vercel.

---

## 3. AI Collaboration Process

### Instruction Strategy
*   Pastes initial junior-engineer prompt to avoid immediate assumptions.
*   Requires interactive reviews and updates to `AI_CONTEXT.md` as requirements expand.
*   We maintain a strict separation of concerns, designing the schema, mock APIs, and components before writing functional code.

### Plan Evolution
*   *Phase 1*: Established research guidelines and created documentation skeletons.
*   *Phase 2*: Wrote core database schemas and API routes.
*   *Phase 3*: Implement backend logic and split calculations.
*   *Phase 4*: Develop frontend React layouts, state management, and sockets.
*   *Phase 5*: Deploy and perform end-to-end user testing.

---

## 4. Tradeoffs

### Simplifications
1.  **Single Payer**: Restricting expenses to a single payer simplifies the database schema and splitting calculations.
2.  **No Expense History Edit**: Expenses can be created or deleted, but editing is disabled to avoid complex split-redistribution and history-tracking logic.
3.  **Group Leaving Rule**: A user can be removed from a group if they have zero net balance, preventing orphaned debts.

### Future Improvements
1.  **Multi-currency Support**: Store currencies on a per-group level and perform conversion.
2.  **OCR Receipt Scanning**: Allow users to upload receipt images and use OCR to prefill description and amounts.
3.  **Settle Up Recommendation Engine**: Automate calculation of the minimum cash transfers required to settle the group.
