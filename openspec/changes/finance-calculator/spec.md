# Spec: Financial Calculator for Leads

## Requirements

### REQ-01 — Mortgage Calculator (PMT)
The system SHALL compute a monthly mortgage payment using the standard PMT formula:

```
PMT = P * [r(1+r)^n] / [(1+r)^n - 1]
```

Where:
- P = principal (property price)
- r = monthly interest rate (annual rate / 12 / 100)
- n = total months (term years × 12)

Outputs:
- Monthly payment (to 2 decimal places)
- Total paid over full term
- Total interest paid

### REQ-02 — ROI / Investment Calculator
The system SHALL compute investment returns:
- **Gross ROI**: (annual rent / price) × 100
- **Net ROI**: ((annual rent − annual expenses) / price) × 100
- **Cap Rate**: (net operating income / price) × 100
- **Monthly Cash Flow**: monthly rent − monthly expenses

### REQ-03 — Amortization Table
The system SHALL generate a year-by-year amortization schedule:
- Year, Payment #, Principal paid, Interest paid, Remaining balance
- Expandable to monthly rows
- Max 30 years (360 rows monthly)

### REQ-04 — Auto-fill from Property
If `lead.property` exists with a `price` value, the calculator SHALL pre-fill the price field. The agent MAY override it.

### REQ-05 — Multi-currency Support
Supported currencies: USD, ARS, EUR, MXN.
- All numeric output SHALL use `Intl.NumberFormat` with the appropriate locale
- The agent MAY switch currency at any time — all values recalculate

### REQ-06 — Real-time Calculation
All outputs SHALL update as the user types (debounced 300ms). No submit button needed for calculation.

### REQ-07 — Save Simulations (v2)
- `POST /simulations/save` — persists current simulation to DB
- `GET /leads/:id/simulations` — returns saved history
- Each simulation stores: price, rate, term, monthly payment, currency, timestamp

## Scenarios

### SC-01: Agent checks mortgage affordability
```
Given a lead with linked property (price = $200,000)
When the agent opens the lead detail modal
And clicks the "Calculadora" section
Then the price field is pre-filled with 200,000
When the agent enters 6.5% rate and 30-year term
Then the monthly payment displays as $1,264.14
```

### SC-02: Agent checks investment ROI
```
Given the mortgage tab shows a property price of $200,000
When the agent switches to the "Inversión" tab
Then the price is already filled from the mortgage tab
When the agent enters $1,500 monthly rent and $300 monthly expenses
Then gross ROI shows 9.0%
And net ROI shows 7.2%
And Cap Rate shows 7.2%
```

### SC-03: Agent reviews amortization
```
Given the mortgage tab has calculated a $1,264 monthly payment
When the agent switches to "Amortización"
Then year 1 shows principal paid, interest paid, and remaining balance
And the table is scrollable
```

### SC-04: Currency switch
```
Given the mortgage tab shows results in USD ($)
When the agent switches currency to ARS
Then all values update to ARS format ($12,345.67 → $1,234,567.89 ARS)
```

### SC-05: Lead without property
```
Given a lead with no linked property
When the agent opens the calculator section
Then the price field is empty (placeholder: "Ingresá el precio")
And all calculations are disabled until a valid price is entered
```

## Acceptance Criteria

| ID | Criterion | Status |
|----|-----------|--------|
| AC-01 | PMT formula matches bank calculators (validated against AR, MX, ES, US examples) | ❌ |
| AC-02 | ROI calculations are mathematically correct to 2 decimal places | ❌ |
| AC-03 | Amortization table total principal = original price | ❌ |
| AC-04 | All currencies format with correct locale symbols | ❌ |
| AC-05 | Real-time update within 300ms of last keystroke | ❌ |
| AC-06 | Works offline (no API call for calculation) | ❌ |
| AC-07 | LeadDetailModal extracted to own file < 400 lines | ❌ |
