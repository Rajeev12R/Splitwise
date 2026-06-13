# SCOPE.md: Anomaly Log & Database Schema

This document details the anomaly log for `expenses_export.csv` containing deliberate data problems, how they are detected and resolved by the importer, and the underlying PostgreSQL database schema design.

---

## 1. CSV Anomaly Log

Below is the detailed list of deliberate data problems found in the `expenses_export.csv` file, and the policy we implemented to resolve them.

| Anomaly Type | Row(s) | Detected Data Problem | Policy & Resolution Action taken |
| :--- | :--- | :--- | :--- |
| **Duplicate Entry** | Row 5 & 6 | Date, amount (3200), splits, and payer are identical, but descriptions slightly differ (`Dinner at Marina Bites` vs `dinner - marina bites`). | **Policy**: Filter out duplicates. The importer flags candidates. We suggest excluding the duplicate row while retaining the descriptive row. |
| **Number Format (Commas)** | Row 7 | Amount is wrapped in quotes with a comma (`"1,200"`). | **Policy**: Auto-detect quotes and commas, remove them, and parse the remaining string into a float (`1200`). |
| **Case Inconsistency** | Row 9 & 27 | Payer name is lowercase (`priya`, `rohan `) instead of standard casing (`Priya`, `Rohan`). | **Policy**: Normalize all payer name cases to match database names using trim and capital casing. |
| **Rounding/Decimals** | Row 10 | Amount has three decimal places (`899.995`). | **Policy**: Round all float values to exactly 2 decimal places (`900.00`) to prevent database cents calculation issues. |
| **Name Alias Mismatch** | Row 11 | Payer name logged as `Priya S` instead of `Priya`. | **Policy**: Use a custom name-mapping dictionary to resolve aliases to the primary user entity. |
| **Missing Payer** | Row 13 | Payer field is blank (`paid_by` is empty) with note `can't remember who paid`. | **Policy**: Flag as incomplete. Surface it in the review UI, requiring the user to select the correct payer manually before confirmation. |
| **Settlement Logged as Expense** | Row 14 | Settlement transaction (`Rohan paid Aisha back`) logged with blank `split_type` and `Aisha` as `split_with`. | **Policy**: Convert the transaction type from **Expense** to **Settlement**, bypassing expense split logic. |
| **Invalid Percentage Sum** | Row 15 & 32 | Split percentages sum to 110% (`Aisha 30%; Rohan 30%; Priya 30%; Meera 20%`). | **Policy**: Flag as error. In the review screen, automatically normalize percentages proportionally to equal 100% or allow manual correction. |
| **Mixed Date Formats** | Row 16, 27, 34 | Formats are mixed: `YYYY-MM-DD`, `DD/MM/YYYY`, and `MMM DD` (`Mar 14`). | **Policy**: Try parsing using multiple regex date patterns. `DD/MM/YYYY` is chosen as the default for `/` separations. |
| **Multi-currency** | Row 20, 21, 23, 26 | Transactions in USD instead of INR (`540 USD`, `84 USD`, `150 USD`, `-30 USD`). | **Policy**: Apply fixed exchange rate (1 USD = 83 INR) to convert to base currency, preserving the original USD details in notes. |
| **Unregistered Member** | Row 23 | Split includes `"Dev's friend Kabir"`, who is not in the group. | **Policy**: Exclude unregistered guests from the split. Charge their proportional share to the inviter (`Dev`), or split among flatmates. |
| **Conflicting Duplicates** | Row 24 & 25 | Aisha logged `Dinner at Thalassa` (₹2400) and Rohan logged `Thalassa dinner` (₹2450) on same date. | **Policy**: Flag conflict to user in UI. User selects which transaction is correct to import. |
| **Negative Amount (Refund)** | Row 26 | `Parasailing refund` amount is negative (`-30`). | **Policy**: Parse as negative value, reversing split contributions (credit split members, debit payer). |
| **Missing Currency** | Row 28 | Currency column is empty for `Groceries DMart`. | **Policy**: Automatically fall back to the group's default currency (`INR`). |
| **Leading/Trailing Spaces** | Row 29 | Amount contains spaces (` 1450 `). | **Policy**: Trim whitespaces from numeric fields prior to casting. |
| **Zero Amount** | Row 31 | `Swiggy dinner` amount is `0` INR. | **Policy**: Flag as warning, allow user to set correct amount or ignore row from import. |
| **Ambiguous Date** | Row 34 | Date `04/05/2026` could mean 5th April or 4th May. | **Policy**: Parse using standard DD/MM/YYYY, flagging as ambiguous for user confirmation in UI. |
| **Inactive Member split** | Row 36 | Meera is included in split on April 2, after moving out on March 31. | **Policy**: Exclude Meera from the split since she had already left, reallocating her share to active members. |
| **Split / Detail Mismatch** | Row 42 | Split type is `equal` but `split_details` is provided as shares. | **Policy**: Standardize to `EQUAL` since all shares are `1`, discarding the redundant details. |

---

## 2. Database Schema

The database uses PostgreSQL with Prisma ORM.

```prisma
model User {
  id                  String         @id @default(uuid())
  email               String         @unique
  passwordHash        String
  name                String
  createdAt           DateTime       @default(now())
  updatedAt           DateTime       @updatedAt
  memberships         GroupMember[]
  createdGroups       Group[]        @relation("GroupCreator")
  paidExpenses        Expense[]      @relation("ExpensePayer")
  expenseSplits       ExpenseSplit[]
  sentSettlements     Settlement[]   @relation("SettlementPayer")
  receivedSettlements Settlement[]   @relation("SettlementPayee")
  comments            Comment[]
}

model Group {
  id          String        @id @default(uuid())
  name        String
  description String?
  creatorId   String
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt
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
  leftAt    DateTime? // Dynamic membership support for leave/join timelines
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
  expense   Expense  @relation(fields: [expenseId], references: [id], onDelete: Cascade)
  user      User     @relation(fields: [userId], references: [id])
  @@unique([expenseId, userId])
}

model Settlement {
  id        String   @id @default(uuid())
  groupId   String
  payerId   String   // Debtor who paid
  payeeId   String   // Creditor who received
  amount    Float
  createdAt DateTime @default(now())
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
  expense   Expense  @relation(fields: [expenseId], references: [id], onDelete: Cascade)
  user      User     @relation(fields: [userId], references: [id])
}
```
