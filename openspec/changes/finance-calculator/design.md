# Design: Financial Calculator for Leads

## Architecture

```
LeadsPage.jsx (3121 lines)
  └── LeadDetailModal (inline, ~700 lines)
       ├── Info Grid (lead data)
       ├── Status Actions
       ├── Status History
       ├── ▶ FinanceCalculator ◀  ← NEW
       │    ├── TabNav (Hipoteca / Inversión / Amortización)
       │    ├── MortgageTab
       │    │    ├── Inputs: price, rate, term, currency
       │    │    └── Outputs: monthly payment, total, interest
       │    ├── InvestmentTab
       │    │    ├── Inputs: price, rent, expenses
       │    │    └── Outputs: gross/net ROI, cap rate, cash flow
       │    └── AmortizationTab
       │         └── Year-by-year table (expandable to monthly)
       ├── Timeline
       └── Contracts Section
```

## File Changes

### 1. Refactor: Extract LeadDetailModal → own file
**Why**: 3121-line file is unsustainable. Extracting the modal makes the calculator easier to add.

| Action | File |
|--------|------|
| **EXTRACT** | `frontend/src/components/leads/LeadDetailModal.jsx` |
| **IMPORT** in LeadsPage.jsx | `import LeadDetailModal from '../components/leads/LeadDetailModal'` |

### 2. Create: FinanceCalculator component
| File | Purpose |
|------|---------|
| `frontend/src/utils/financialCalc.js` | Pure functions: `calcMortgage()`, `calcAmortization()`, `calcROI()` |
| `frontend/src/components/leads/FinanceCalculator.jsx` | Container with tabs |
| `frontend/src/components/leads/MortgageTab.jsx` | Mortgage form + results |
| `frontend/src/components/leads/InvestmentTab.jsx` | ROI form + results |
| `frontend/src/components/leads/AmortizationTab.jsx` | Amortization table |

### 3. Modify: LeadsPage.jsx
- Import `LeadDetailModal` from new location
- Remove the inline definition (lines 2356-3040)
- Pass property price data to the modal

## Module Design

### financialCalc.js — Pure Functions

```js
/**
 * Calculate monthly mortgage payment using PMT formula
 * @param {number} price - Property price
 * @param {number} annualRate - Annual interest rate (percentage, e.g. 6.5)
 * @param {number} termYears - Loan term in years
 * @returns {{ monthlyPayment, totalPaid, totalInterest }}
 */
export function calcMortgage(price, annualRate, termYears) {
  const monthlyRate = annualRate / 100 / 12
  const numPayments = termYears * 12
  const payment = price * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) 
                / (Math.pow(1 + monthlyRate, numPayments) - 1)
  const totalPaid = payment * numPayments
  return {
    monthlyPayment: round2(payment),
    totalPaid: round2(totalPaid),
    totalInterest: round2(totalPaid - price)
  }
}

/**
 * Generate amortization schedule
 * @returns {Array<{year, payment, principal, interest, balance}>}
 */
export function calcAmortization(price, annualRate, termYears) { ... }

/**
 * Calculate ROI metrics
 * @returns {{ grossROI, netROI, capRate, monthlyCashFlow }}
 */
export function calcROI(price, monthlyRent, monthlyExpenses) { ... }

function round2(n) { return Math.round(n * 100) / 100 }
```

### Locale / Currency Map

```js
export const CURRENCY_CONFIG = {
  USD: { locale: 'en-US', symbol: '$' },
  ARS: { locale: 'es-AR', symbol: '$' },
  EUR: { locale: 'de-DE', symbol: '€' },
  MXN: { locale: 'es-MX', symbol: '$' },
}

export function formatCurrency(amount, currency = 'USD') {
  const config = CURRENCY_CONFIG[currency] || CURRENCY_CONFIG.USD
  return new Intl.NumberFormat(config.locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}
```

## Data Flow

```
User types → React state updates → calcMortgage() called
  → returns { monthlyPayment, totalPaid, totalInterest }
  → setState(new results) → re-render
  → Intl.NumberFormat formats output
```

No API calls. No backend. Instant.

## State Shape (within FinanceCalculator)

```js
const [inputs, setInputs] = useState({
  price: lead.property?.price || '',
  annualRate: 5,      // default 5%
  termYears: 30,      // default 30 years
  currency: 'USD',
  monthlyRent: '',
  monthlyExpenses: '',
})

const [results, setResults] = useState(null)
const [activeTab, setActiveTab] = useState('mortgage') // 'mortgage' | 'investment' | 'amortization'
const [amortTable, setAmortTable] = useState([])
```

## Risks

| Risk | Mitigation |
|------|-----------|
| Price is Decimal from Prisma → string | Convert to number: `Number(lead.property.price)` |
| Floating point 0.1 + 0.2 errors | `round2()` on every output, never compare raw floats |
| Large amort table (360 rows) | Lazy rendering: show yearly by default, expand on click |
| Refactor breaks existing modal | Keep old code commented until new component is verified |
