# Product Research: Splitwise

Splitwise is a popular expense-sharing application that helps users split bills and track debts within groups or between individuals. This document contains the reverse-engineering research and core mechanics identified in the product.

## 1. Core Concepts & Entities

*   **Users**: Individuals identified by an email address and a name. Users can have relationships with other users (friends) or participate in shared groups.
*   **Groups**: Spaces containing multiple users where expenses can be posted. Expenses logged in a group are split among members, affecting each member's net balance within that specific group.
*   **Expenses**: Individual transactions logged by a user (the payer). Each expense consists of:
    *   Description (e.g., "Dinner at Italian Restaurant")
    *   Total Amount (e.g., $150.00)
    *   Payer (the person who paid the upfront cost)
    *   Split Rules (how the cost is distributed among group members)
*   **Settlements**: Record of payments made to reduce or resolve debts. For example, if Bob owes Alice $50, Bob can pay Alice $50 outside the app, and log a settlement inside the app to return their mutual balance to $0.
*   **Comments/Chat**: Sub-thread inside an expense where group members can ask questions or coordinate payments.

---

## 2. Expense Splitting Mechanics

Splitwise supports four core types of splits:

1.  **Equal Split**:
    *   The total amount is divided equally among all selected participants.
    *   *Math*: $\text{Owed Amount} = \frac{\text{Total Amount}}{N}$ where $N$ is the number of participants.
    *   *Edge Case*: Rounding errors (e.g., splitting $10.00 among 3 users leads to $3.33 each, leaving $0.01 unallocated). Usually, the system assigns the extra penny to the payer or the first participant.

2.  **Unequal Split (Exact Amounts)**:
    *   Each participant is assigned a specific amount.
    *   *Validation Rule*: The sum of all individual split amounts must equal the total expense amount.

3.  **Percentage Split**:
    *   Each participant is assigned a percentage of the total.
    *   *Validation Rule*: The sum of all percentages must equal exactly 100%.
    *   *Math*: $\text{Owed Amount} = \text{Total Amount} \times \frac{\text{Percentage}}{100}$.

4.  **Share Split**:
    *   Each participant is assigned a number of shares (integers).
    *   *Math*: $\text{Owed Amount} = \text{Total Amount} \times \frac{\text{User's Shares}}{\text{Total Shares}}$.
    *   *Example*: Alice has 2 shares, Bob has 1 share, Charlie has 1 share (Total = 4 shares). On a $100 expense, Alice owes $50, Bob owes $25, and Charlie owes $25.

---

## 3. Balance Calculations & Aggregations

Splitwise tracks balances at multiple levels:

*   **Group Balance Matrix**: A list of who owes whom within a specific group.
*   **Individual Balance Summary**: A user's total net balance aggregated across all groups and direct friendships.
    *   **"You are owed"**: Sum of all positive balances.
    *   **"You owe"**: Sum of all negative balances.
    *   **"Total balance"**: Sum of all positive and negative balances.

### Balance Formula
For any user $U$ in group $G$, their net balance is computed as:
$$\text{Balance}_U = \sum (\text{Expenses Paid by } U) - \sum (\text{Splits Owed by } U) + \sum (\text{Settlements Paid by } U) - \sum (\text{Settlements Received by } U)$$

---

## 4. Workflows

### Creating an Expense
1.  User enters an expense description and amount.
2.  User selects the payer (defaults to themselves).
3.  User selects the group (or individual).
4.  User selects the split method (default: Equal split among all members).
5.  If non-equal, the user enters exact amounts, percentages, or shares.
6.  The system validates the inputs, saves the expense and splits, and updates balances.

### Settling Debts
1.  User clicks "Settle Up".
2.  User selects who is paying whom and the amount.
3.  System saves a settlement record, updating the group and individual balances.
