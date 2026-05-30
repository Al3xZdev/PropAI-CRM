# Tasks: Financial Calculator for Leads

## Sprint 1 — Foundation + Refactor + Core Calculator

### T-01: Extract LeadDetailModal to own file
**Files:** `frontend/src/pages/LeadsPage.jsx`, `frontend/src/components/leads/LeadDetailModal.jsx`
**Acceptance:** LeadDetailModal works identically after extraction. LeadsPage.jsx imports it.
**Risks:** Missing prop, broken import. Mitigation: test open/close modal after extraction.

### T-02: Create financialCalc.js with pure functions
**File:** `frontend/src/utils/financialCalc.js`
**Functions:**
- `calcMortgage(price, annualRate, termYears)` — PMT formula
- `calcAmortization(price, annualRate, termYears)` — full schedule
- `calcROI(price, monthlyRent, monthlyExpenses)` — ROI metrics
- `formatCurrency(amount, currency)` — Intl.NumberFormat wrapper
- `CURRENCY_CONFIG` map
**Acceptance:** All functions return correct values. Test with known bank examples.

### T-03: Create FinanceCalculator component with tabs
**Files:** 
- `frontend/src/components/leads/FinanceCalculator.jsx`
- `frontend/src/components/leads/MortgageTab.jsx`
- `frontend/src/components/leads/InvestmentTab.jsx`
- `frontend/src/components/leads/AmortizationTab.jsx`
**Acceptance:** Three tabs switch correctly. Inputs update results in real time.

### T-04: Integrate FinanceCalculator into LeadDetailModal
**File:** `frontend/src/components/leads/LeadDetailModal.jsx`
**Action:** Add `<FinanceCalculator lead={lead} />` after the Status History section.
**Acceptance:** Calculator appears inside the modal. Price auto-fills when property is linked.

## Sprint 2 — Polish + Save Simulations

### T-05: Add simulation save to backend
**Files:** `backend/routes/simulations.js`, `backend/server.js`
**Endpoints:**
- `POST /api/simulations/save` — saves { leadId, propertyId, price, rate, term, monthlyPayment, currency }
- `GET /api/leads/:id/simulations` — returns saved list
**Acceptance:** Simulations are persisted and retrievable per lead.

### T-06: Add "Save" button and history to FinanceCalculator
**Files:** `FinanceCalculator.jsx`, `LeadDetailModal.jsx`
**Action:** "Guardar" button calls POST endpoint. History list shows previous simulations.
**Acceptance:** Saved simulations appear in list with timestamp and result summary.

## Task Dependencies

```
T-01 (refactor)
  └── T-02 (calc functions) ──┐
                              ├── T-03 (UI component) ── T-04 (integration)
                              │
T-05 (backend) ── T-06 (save)
```

## Review Workload Forecast

**Estimated changed lines:** ~350
- T-01: +200 / -700 (net -500, large delete)
- T-02: +80
- T-03: +180
- T-04: +20
- T-05: +60
- T-06: +110

**Total new code:** ~650 lines (minus 700 deleted = net -50)
**Decision:** Within 400-line budget. Single PR.
