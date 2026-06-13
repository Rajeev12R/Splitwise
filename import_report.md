# Import Report

This report was produced by the **Splitify CSV Importer** when it ingested the CSV export sheet containing deliberate anomalies. It documents the parsing, classification, validation, and resolution rules applied to each transaction row.

## 1. Summary Statistics

* **Total Data Rows Evaluated**: 42
* **Total Anomalies/Warnings Detected**: 35
* **Successfully Configured for Expense Import**: 38
* **Successfully Configured for Settlement Import**: 2
* **Excluded/Awaiting User Input**: 2

---

## 2. Ingestion Log (Row-by-Row)

| Row | Date | Description | Payer | Amount | Currency | Anomalies Detected | Resolution & Action taken |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- |
| **2** | 2026-02-01 | February rent | Aisha | 48000 | INR | *None* | Imported successfully without changes. |
| **3** | 2026-02-03 | Groceries BigBasket | Priya | 2340 | INR | *None* | Imported successfully without changes. |
| **4** | 2026-02-05 | Wifi bill Feb | Rohan | 1199 | INR | *None* | Imported successfully without changes. |
| **5** | 2026-02-08 | Dinner at Marina Bites | Dev | 3200 | INR | **DUPLICATE_CANDIDATE**: Possible duplicate of Row 6 ("dinner - marina bites" vs "Dinner at Marina Bites") | Flagged duplicate candidate Row 6. Imported Row 5 as valid entry. |
| **6** | 2026-02-08 | dinner - marina bites | Dev | 3200 | INR | **DUPLICATE_CANDIDATE**: Possible duplicate of Row 5 ("Dinner at Marina Bites" vs "dinner - marina bites") | Flagged duplicate candidate Row 5. Suggested for exclusion (shouldImport = false). |
| **7** | 2026-02-10 | Electricity Feb | Aisha | 1200 | INR | **AMOUNT_CONTAINED_COMMAS**: Removed commas from amount: "1,200" | Stripped quotes and commas to parse number. |
| **8** | 2026-02-12 | Maid salary Feb | Meera | 3000 | INR | *None* | Imported successfully without changes. |
| **9** | 2026-02-14 | Movie night snacks | Priya | 640 | INR | **PAYER_NORMALIZED**: Normalized payer name from "priya" to "Priya" | Normalized name case/alias to match database member "Priya". |
| **10** | 2026-02-15 | Cylinder refill | Rohan | 900 | INR | **AMOUNT_ROUNDED**: Rounded amount from "899.995" to "900" | Rounded decimal to 2 decimal places (900). |
| **11** | 2026-02-18 | Groceries DMart | Priya | 1875 | INR | **PAYER_NORMALIZED**: Normalized payer name from "Priya S" to "Priya" | Normalized name case/alias to match database member "Priya". |
| **12** | 2026-02-20 | Aisha birthday cake | Rohan | 1500 | INR | *None* | Imported successfully without changes. |
| **13** | 2026-02-22 | House cleaning supplies | *Missing* (raw: "") | 780 | INR | **PAYER_MISSING**: Missing payer field | Unchecked for import by default. Requires user to select active flatmate as payer. |
| **14** | 2026-02-25 | Rohan paid Aisha back | Rohan | 5000 | INR | **LOGGED_AS_SETTLEMENT**: Identified as a settlement payment rather than group expense | Imported as a Settlement type to clear balances, bypassing expense split. |
| **15** | 2026-02-28 | Pizza Friday | Aisha | 1440 | INR | **SPLIT_PERCENTAGE_INVALID**: Percentages sum to 110% instead of 100% | Auto-normalized invalid percentages (110%) to fit 100% proportionally. |
| **16** | 2026-02-28 | March rent | Aisha | 48000 | INR | **DATE_AMBIGUOUS**: Ambiguous date format (interpreted as Sun Mar 01 2026) | Ambiguous date "01/03/2026" parsed using standard DD/MM/YYYY. |
| **17** | 2026-03-02 | Groceries BigBasket | Meera | 2810 | INR | **DATE_AMBIGUOUS**: Ambiguous date format (interpreted as Tue Mar 03 2026) | Ambiguous date "03/03/2026" parsed using standard DD/MM/YYYY. |
| **18** | 2026-03-04 | Wifi bill Mar | Rohan | 1199 | INR | **DATE_AMBIGUOUS**: Ambiguous date format (interpreted as Thu Mar 05 2026) | Ambiguous date "05/03/2026" parsed using standard DD/MM/YYYY. |
| **19** | 2026-03-07 | Goa flights | Aisha | 32400 | INR | **DATE_AMBIGUOUS**: Ambiguous date format (interpreted as Sun Mar 08 2026) | Ambiguous date "08/03/2026" parsed using standard DD/MM/YYYY. |
| **20** | 2026-03-08 | Goa villa booking | Dev | 44820 | INR | **DATE_AMBIGUOUS**: Ambiguous date format (interpreted as Mon Mar 09 2026)<br>**CURRENCY_CONVERTED**: Converted $540 USD to ₹44820 INR (rate: $1 = ₹83) | Ambiguous date "09/03/2026" parsed using standard DD/MM/YYYY. Converted USD to INR at rate of 83 (₹44820). |
| **21** | 2026-03-09 | Beach shack lunch | Rohan | 6972 | INR | **DATE_AMBIGUOUS**: Ambiguous date format (interpreted as Tue Mar 10 2026)<br>**CURRENCY_CONVERTED**: Converted $84 USD to ₹6972 INR (rate: $1 = ₹83) | Ambiguous date "10/03/2026" parsed using standard DD/MM/YYYY. Converted USD to INR at rate of 83 (₹6972). |
| **22** | 2026-03-09 | Scooter rentals | Priya | 3600 | INR | **DATE_AMBIGUOUS**: Ambiguous date format (interpreted as Tue Mar 10 2026) | Ambiguous date "10/03/2026" parsed using standard DD/MM/YYYY. |
| **23** | 2026-03-10 | Parasailing | Dev | 12450 | INR | **DATE_AMBIGUOUS**: Ambiguous date format (interpreted as Wed Mar 11 2026)<br>**CURRENCY_CONVERTED**: Converted $150 USD to ₹12450 INR (rate: $1 = ₹83)<br>**UNREGISTERED_SPLIT_MEMBERS**: Unregistered guest(s) included in split: Dev's friend Kabir | Ambiguous date "11/03/2026" parsed using standard DD/MM/YYYY. Converted USD to INR at rate of 83 (₹12450). Charged unregistered member (Dev's friend Kabir)'s share directly to inviting host. |
| **24** | 2026-03-10 | Dinner at Thalassa | Aisha | 2400 | INR | **DATE_AMBIGUOUS**: Ambiguous date format (interpreted as Wed Mar 11 2026) | Ambiguous date "11/03/2026" parsed using standard DD/MM/YYYY. |
| **25** | 2026-03-10 | Thalassa dinner | Rohan | 2450 | INR | **DATE_AMBIGUOUS**: Ambiguous date format (interpreted as Wed Mar 11 2026) | Ambiguous date "11/03/2026" parsed using standard DD/MM/YYYY. |
| **26** | 2026-03-11 | Parasailing refund | Dev | -2490 | INR | **DATE_AMBIGUOUS**: Ambiguous date format (interpreted as Thu Mar 12 2026)<br>**AMOUNT_NEGATIVE**: Negative amount represents a refund / credit<br>**CURRENCY_CONVERTED**: Converted $-30 USD to ₹-2490 INR (rate: $1 = ₹83) | Ambiguous date "12/03/2026" parsed using standard DD/MM/YYYY. Parsed as negative value, reversing split balances. Converted USD to INR at rate of 83 (₹-2490). |
| **27** | 2026-03-13 | Airport cab | Rohan | 1100 | INR | **PAYER_NORMALIZED**: Normalized payer name from "rohan" to "Rohan" | Normalized name case/alias to match database member "Rohan". |
| **28** | 2026-03-14 | Groceries DMart | Priya | 2105 | INR | **CURRENCY_MISSING**: Missing currency, defaulted to INR | Defaulted missing currency column to INR. |
| **29** | 2026-03-17 | Electricity Mar | Aisha | 1450 | INR | *None* | Imported successfully without changes. |
| **30** | 2026-03-19 | Maid salary Mar | Meera | 3000 | INR | *None* | Imported successfully without changes. |
| **31** | 2026-03-21 | Dinner order Swiggy | Priya | 0 | INR | **AMOUNT_ZERO**: Zero amount logged | Flagged zero amount expense. Exclude or manually correct. |
| **32** | 2026-03-24 | Weekend brunch | Meera | 2200 | INR | **SPLIT_PERCENTAGE_INVALID**: Percentages sum to 110% instead of 100% | Auto-normalized invalid percentages (110%) to fit 100% proportionally. |
| **33** | 2026-03-27 | Meera farewell dinner | Aisha | 4800 | INR | *None* | Imported successfully without changes. |
| **34** | 2026-05-03 | Deep cleaning service | Rohan | 2500 | INR | **DATE_AMBIGUOUS**: Ambiguous date format (interpreted as Mon May 04 2026) | Ambiguous date "04/05/2026" parsed using standard DD/MM/YYYY. |
| **35** | 2026-04-01 | April rent | Aisha | 48000 | INR | *None* | Imported successfully without changes. |
| **36** | 2026-04-02 | Groceries BigBasket | Priya | 2640 | INR | **MEMBERSHIP_INACTIVE**: Meera was inactive on 2026-04-02 (moved out March 31) | Meera excluded from split calculations since she moved out. |
| **37** | 2026-04-05 | Wifi bill Apr | Rohan | 1199 | INR | *None* | Imported successfully without changes. |
| **38** | 2026-04-08 | Sam deposit share | Sam | 15000 | INR | **LOGGED_AS_SETTLEMENT**: Identified as a settlement payment rather than group expense<br>**MEMBERSHIP_INACTIVE**: Payer Sam was inactive on 2026-04-08 (moved in April 10) | Imported as a Settlement type to clear balances, bypassing expense split. |
| **39** | 2026-04-10 | Housewarming drinks | Sam | 3100 | INR | *None* | Imported successfully without changes. |
| **40** | 2026-04-12 | Electricity Apr | Aisha | 1380 | INR | *None* | Imported successfully without changes. |
| **41** | 2026-04-15 | Groceries DMart | Sam | 1990 | INR | *None* | Imported successfully without changes. |
| **42** | 2026-04-18 | Furniture for common room | Aisha | 12000 | INR | **SPLIT_DETAILS_REDUNDANT**: Redundant split details provided for EQUAL split type | Redundant split details ignored for EQUAL split. |
| **43** | 2026-04-20 | Maid salary Apr | Priya | 3000 | INR | *None* | Imported successfully without changes. |

---

## 3. Policy Reference & Resolutions

Below is a summary of how the parser enforced policies to sanitize raw entries:

### A. Currency Normalization (USD to INR)
* **Rule**: Base group currency is INR. USD transactions are converted using the fixed rate: `1 USD = 83 INR`.
* **Resolution**: Applied to Goa bookings and beach shack lunches. The original foreign currency details are preserved in the transaction notes.

### B. Timeline-based Membership Filter
* **Rule**: Flatmates are only charged for splits if their occupancy timeline overlays the transaction date.
* Meera moved out on **March 31, 2026**; she is excluded from splits on any expense after March 31 (e.g. Row 36: Groceries BigBasket on April 2).
* Sam moved in on **April 10, 2026**; he is excluded from splits on any expense before April 10 (e.g. Row 38: Sam deposit share on April 8).

### C. Duplicate Resolution
* **Rule**: The system identifies transactions matching in Date, Payer, Amount, and Split Members, flagging them as duplicates.
* **Resolution**: Suggests excluding the duplicates (like row 6 "dinner - marina bites" vs row 5; and flagging conflict on row 24/25 Thalassa dinner) for user review.

### D. Unregistered Members
* **Rule**: Non-group guests are excluded from DB splits. Their share is billed to their host.
* **Resolution**: Kabir's split share in Row 23 (Parasailing) is computed, and Kabir is excluded from database user record creations; his equal share is added directly to Dev (his host).
