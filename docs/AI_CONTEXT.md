# AI Context: Splitwise Clone App

This document serves as the absolute source of truth for the Splitwise Clone application. It details the product requirements, engineering design, database schema, API design, frontend structure, deployment strategy, and technical decisions.

---

## 1. Product Understanding & Scope

### Goal
To build and deploy a simplified Splitwise-inspired application that allows users to create groups, log and split expenses, track balances, chat in real-time about specific expenses, and settle debts.

### Minimum Product Requirements
1.  **Login Module**: Email-based signup and login with secure authentication (JWT).
2.  **Groups**: Users can create groups, view group listings, and manage group members (add/remove by email).
3.  **Expenses**:
    *   Log expenses with a description, total amount, payer, and split details.
    *   Support splitting modes: **Equally**, **Unequally**, **By Percentage**, and **By Share**.
    *   Real-time chat/comments inside individual expenses.
    *   Group-wise balance summary and individual balance summary.
    *   Settle debts/record payments between members.
4.  **Database**: Relational database (PostgreSQL) mapped using Prisma ORM.

---

## 2. Technical Stack

*   **Frontend**: React (Vite), Tailwind CSS, React Router, TanStack Query (React Query)
*   **Backend**: Node.js, Express.js, Socket.io
*   **Database**: PostgreSQL (Neon Serverless PostgreSQL)
*   **ORM**: Prisma
*   **Authentication**: JWT (JSON Web Tokens) stored in localStorage or Cookies
*   **Deployment**:
    *   Frontend: Vercel
    *   Backend & Socket server: Render
    *   Database: Neon

---

## 3. Database Schema (Prisma Design)

We use a relational structure in PostgreSQL. The entities are: `User`, `Group`, `GroupMember`, `Expense`, `ExpenseSplit`, `Settlement`, and `Comment`.

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model User {
  id            String         @id @default(uuid())
  email         String         @unique
  passwordHash  String
  name          String
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt

  // Relations
  memberships       GroupMember[]
  createdGroups     Group[]          @relation("GroupCreator")
  paidExpenses      Expense[]        @relation("ExpensePayer")
  expenseSplits     ExpenseSplit[]
  sentSettlements   Settlement[]     @relation("SettlementPayer")
  receivedSettlements Settlement[]   @relation("SettlementPayee")
  comments          Comment[]
}

model Group {
  id          String        @id @default(uuid())
  name        String
  description String?
  creatorId   String
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt

  // Relations
  creator     User          @relation("GroupCreator", fields: [creatorId], references: [id])
  members     GroupMember[]
  expenses    Expense[]
  settlements Settlement[]
}

model GroupMember {
  id        String   @id @default(uuid())
  groupId   String
  userId    String
  joinedAt  DateTime @default(now())

  // Relations
  group     Group    @relation(fields: [groupId], references: [id], onDelete: Cascade)
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([groupId, userId])
}

model Expense {
  id          String         @id @default(uuid())
  groupId     String
  description String
  amount      Float
  payerId     String
  splitType   SplitType      @default(EQUAL)
  createdAt   DateTime       @default(now())
  updatedAt   DateTime       @updatedAt

  // Relations
  group       Group          @relation(fields: [groupId], references: [id], onDelete: Cascade)
  payer       User           @relation("ExpensePayer", fields: [payerId], references: [id])
  splits      ExpenseSplit[]
  comments    Comment[]
}

enum SplitType {
  EQUAL
  UNEQUAL
  PERCENTAGE
  SHARE
}

model ExpenseSplit {
  id        String   @id @default(uuid())
  expenseId String
  userId    String
  amount    Float
  percent   Float?
  share     Int?

  // Relations
  expense   Expense  @relation(fields: [expenseId], references: [id], onDelete: Cascade)
  user      User     @relation(fields: [userId], references: [id])

  @@unique([expenseId, userId])
}

model Settlement {
  id        String   @id @default(uuid())
  groupId   String
  payerId   String   // The person who paid to settle up (owes money)
  payeeId   String   // The person who received money
  amount    Float
  createdAt DateTime @default(now())

  // Relations
  group     Group    @relation(fields: [groupId], references: [id], onDelete: Cascade)
  payer     User     @relation("SettlementPayer", fields: [payerId], references: [id])
  payee     User     @relation("SettlementPayee", fields: [payeeId], references: [id])
}

model Comment {
  id        String   @id @default(uuid())
  expenseId String
  userId    String
  content   String
  createdAt DateTime @default(now())

  // Relations
  expense   Expense  @relation(fields: [expenseId], references: [id], onDelete: Cascade)
  user      User     @relation(fields: [userId], references: [id])
}
```

---

## 4. API Design

All endpoints are prefixed with `/api` and require a `Bearer <token>` in the Authorization header except for auth endpoints.

### Authentication (`/api/auth`)
*   `POST /api/auth/register` - Create user (email, password, name)
*   `POST /api/auth/login` - Login user, return JWT and user details
*   `GET /api/auth/me` - Get current authenticated user info

### Groups (`/api/groups`)
*   `GET /api/groups` - Retrieve all groups the user is a member of
*   `POST /api/groups` - Create a new group
*   `GET /api/groups/:groupId` - Get group detail (members, expenses, settlements, balances)
*   `POST /api/groups/:groupId/members` - Add a member to a group by email
*   `DELETE /api/groups/:groupId/members/:userId` - Remove a member from a group

### Expenses & Settlements (`/api/expenses` & `/api/settlements`)
*   `POST /api/expenses` - Create a new expense (computes and saves splits)
*   `DELETE /api/expenses/:expenseId` - Delete an expense (recalculates balances)
*   `POST /api/settlements` - Record a settlement payment (transfer from payer to payee)

### Comments (`/api/comments`)
*   `GET /api/comments/:expenseId` - Get chat messages for an expense
*   `POST /api/comments` - Post a comment (also triggers real-time broadcast)

---

## 5. Balance Calculation Engine

A user's net balance within a group is determined mathematically from four transaction types:
1.  **Expense Paid**: User paid `amount`. (Increases balance: user is owed)
2.  **Expense Owed (Split)**: User was included in a split for `split.amount`. (Decreases balance: user owes)
3.  **Settlement Paid**: User paid `amount` to settle up. (Increases balance: user reduced their debt)
4.  **Settlement Received**: User received `amount` to settle. (Decreases balance: user was paid back)

$$\text{Net Balance} = (\text{Total Paid for Expenses}) - (\text{Total Owed in Splits}) + (\text{Total Paid in Settlements}) - (\text{Total Received in Settlements})$$

*   If $\text{Net Balance} > 0$, other users owe this user money.
*   If $\text{Net Balance} < 0$, this user owes other users money.
*   A debt-simplification matrix will determine the optimal set of transactions to settle up.

---

## 6. Real-time Communication (Socket.io)

### Expense Room Chat
*   Clients join a specific room for each expense (`room:expense:${expenseId}`).
*   When a user posts a comment, it is written to the database via API, then broadcasted to the expense room.
*   The event payload includes:
    ```json
    {
      "id": "uuid",
      "expenseId": "uuid",
      "content": "message text",
      "createdAt": "timestamp",
      "user": { "id": "uuid", "name": "User Name" }
    }
    ```

### Group Room State Synchronization
*   Clients join a specific room for each group (`room:group:${groupId}`) when viewing group details.
*   Whenever an expense is logged or deleted, a settlement is registered, or a group member is added/removed, the server broadcasts a `'group_updated'` event to the room.
*   Upon receiving this event, active clients immediately trigger a re-fetch of group stats to update lists, balances, and settle-up calculations dynamically without needing page reloads.

---

## 7. Frontend Structure & Routing

```
frontend/src/
├── components/       # Common components (Navbar, Sidebar, Input, Button, Modal, Cards)
├── context/          # Auth Context for user state
├── hooks/            # Custom hooks (e.g., useSocket)
├── pages/
│   ├── Landing.jsx   # Public index/marketing page
│   ├── Login.jsx     # Login screen
│   ├── Register.jsx  # Sign up screen
│   ├── Dashboard.jsx # Main dashboard (aggregates summary, recent activities)
│   ├── GroupDetail.jsx # Group view (expenses list, group balances, settle buttons)
│   └── ExpenseDetail.jsx # Expense view (split breakdown, Socket.io chat room)
├── services/         # API clients (axios setup, react-query queries)
├── App.jsx           # Routing setup
└── main.jsx          # App entry
```

---

## 8. Development Roadmap

1.  **Backend Setup**: Prisma initialization, DB connection, Authentication endpoints.
2.  **Group Management APIs**: Build group creation and member invitation/removal.
3.  **Expense & Split Engine**: Write splitting math for Equal, Unequal, Percent, and Share.
4.  **Settlement & Balance Math**: Build balance aggregation and settlement recording.
5.  **Comments & Sockets**: Integrate Socket.io on the backend.
6.  **Frontend Shell**: Setup layout, Tailwind CSS, routes, and AuthContext.
7.  **Dashboard & Group UI**: Build beautiful dashboard and group management views.
8.  **Expense Form & Split UI**: Create a responsive form allowing customizable splits.
9.  **Real-time Comments UI**: Design chat box inside expense detail.
10. **Deployment & Final Verifications**: Push backend to Render, frontend to Vercel, check end-to-end functionality.
