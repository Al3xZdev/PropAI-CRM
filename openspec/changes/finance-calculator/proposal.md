# Proposal: Financial Calculator for Leads

## Intent
Add a mortgage/ROI calculator inside the lead detail modal so agents can instantly compute monthly payments, amortization, and rental profitability without leaving the CRM.

## Scope
- Frontend only: pure JS financial math (PMT formula), no backend microservice needed
- Three tabs inside the lead detail: Mortgage, Investment, Amortization
- Auto-fill property price when the lead has a linked property
- Save simulations via existing backend patterns (optional, stretch goal)

## Why Now
Agents currently leave the CRM to use external calculators during calls. This adds friction and makes them look unprepared. Instant feedback builds trust with buyers.

## Approach

### Frontend
In `LeadsPage.jsx`, inside `LeadDetailModal`:
1. Add a new section between "Status History" and "Timeline" with three tab buttons
2. Create a pure JS `calcMortgage()` function (PMT formula) in a shared utils file
3. Create `calcAmortization()` (table generator) and `calcROI()` functions
4. No new dependencies — financial math is pure JS, use `Intl.NumberFormat` for currency

#### Tab 1 — Mortgage
| Input | Source |
|-------|--------|
| Property price | Auto-filled from `lead.property.price`, editable |
| Annual interest rate | User input (default 5%) |
| Term (years) | User input (default 30) |
| Currency | Dropdown: USD, ARS, EUR, MXN |

Output: Monthly payment, total paid, total interest — updated in real-time as user types.

#### Tab 2 — Investment (ROI)
| Input | Source |
|-------|--------|
| Property price | Auto-filled from mortgage tab |
| Monthly rent | User input |
| Monthly expenses | User input (taxes, maintenance, etc.) |

Output: Gross ROI %, Net ROI %, Cap Rate, Monthly Cash Flow.

#### Tab 3 — Amortization
- Table showing year-by-year breakdown: payment #, principal, interest, remaining balance
- Option to expand to monthly view
- Scrollable inside the tab

### Backend
- No new tables needed initially — can use existing `AuditLog` for tracking
- Optional: add `POST /simulations/save` and `GET /leads/:id/simulations` endpoints

### Risks
| Risk | Mitigation |
|------|-----------|
| Large LeadsPage.jsx (3121 lines) | Extract LeadDetailModal to own file first |
| Floating point precision in financial math | Use `Math.round()` to 2 decimal places consistently |
| Multi-currency formatting | `Intl.NumberFormat` with locale map |

## Non-Goals
- No backend microservice (pure math)
- No PDF generation in v1
- No notification/alerts based on financial thresholds
