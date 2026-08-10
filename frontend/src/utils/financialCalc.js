// ==========================================
// Financial Calculator — Pure Functions
// ==========================================

/**
 * Round to 2 decimal places
 */
function round2(n) {
  return Math.round(n * 100) / 100
}

/**
 * Calculate monthly mortgage payment using PMT formula
 *   M = P * [r(1+r)^n] / [(1+r)^n - 1]
 *
 * @param {number} price      - Property price (principal)
 * @param {number} annualRate - Annual interest rate in percent (e.g. 6.5 for 6.5%)
 * @param {number} termYears  - Loan term in years
 * @returns {{ monthlyPayment: number, totalPaid: number, totalInterest: number }}
 */
export function calcMortgage(price, annualRate, termYears) {
  const p = Number(price)
  if (!p || p <= 0) return { monthlyPayment: 0, totalPaid: 0, totalInterest: 0 }

  const r = annualRate / 100 / 12   // monthly interest rate
  const n = termYears * 12           // total number of payments

  if (r === 0) {
    // 0% interest — simple division
    const payment = round2(p / n)
    return {
      monthlyPayment: payment,
      totalPaid: p,
      totalInterest: 0,
    }
  }

  const factor = Math.pow(1 + r, n)
  const monthlyPayment = round2(p * (r * factor) / (factor - 1))
  const totalPaid = round2(monthlyPayment * n)
  const totalInterest = round2(totalPaid - p)

  return { monthlyPayment, totalPaid, totalInterest }
}

/**
 * Generate full amortization schedule (year-by-year).
 * Each row shows the aggregate for that year.
 *
 * @param {number} price      - Property price
 * @param {number} annualRate - Annual interest rate in percent
 * @param {number} termYears  - Loan term in years
 * @returns {Array<{ year: number, payment: number, principal: number, interest: number, balance: number }>}
 */
export function calcAmortization(price, annualRate, termYears) {
  const p = Number(price)
  if (!p || p <= 0) return []

  const r = annualRate / 100 / 12
  const n = termYears * 12

  if (r === 0) {
    // 0% interest
    const yearlyPrincipal = round2(p / termYears)
    const schedule = []
    for (let year = 1; year <= termYears; year++) {
      schedule.push({
        year,
        payment: yearlyPrincipal,
        principal: yearlyPrincipal,
        interest: 0,
        balance: round2(p - yearlyPrincipal * year),
      })
    }
    return schedule
  }

  const factor = Math.pow(1 + r, n)
  const monthlyPayment = p * (r * factor) / (factor - 1)

  const schedule = []
  let balance = p
  let yearPrincipal = 0
  let yearInterest = 0

  for (let month = 1; month <= n; month++) {
    const interest = balance * r
    const principal = monthlyPayment - interest
    balance -= principal

    yearPrincipal += principal
    yearInterest += interest

    // Aggregate by year
    if (month % 12 === 0 || month === n) {
      schedule.push({
        year: Math.ceil(month / 12),
        payment: round2(yearPrincipal + yearInterest),
        principal: round2(yearPrincipal),
        interest: round2(yearInterest),
        balance: round2(Math.max(balance, 0)),
      })
      yearPrincipal = 0
      yearInterest = 0
    }
  }

  return schedule
}

/**
 * Calculate ROI metrics for an investment property.
 *
 * @param {number} price           - Property price (purchase price)
 * @param {number} monthlyRent     - Expected monthly rental income
 * @param {number} monthlyExpenses - Expected monthly expenses (taxes, insurance, maintenance, etc.)
 * @returns {{
 *   grossROI: number,
 *   netROI: number,
 *   capRate: number,
 *   monthlyCashFlow: number,
 *   annualRent: number,
 *   annualExpenses: number,
 *   netIncome: number,
 * }}
 */
export function calcROI(price, monthlyRent, monthlyExpenses) {
  const p = Number(price)
  const rent = Number(monthlyRent)
  const expenses = Number(monthlyExpenses)

  if (!p || p <= 0) {
    return {
      grossROI: 0,
      netROI: 0,
      capRate: 0,
      monthlyCashFlow: 0,
      annualRent: 0,
      annualExpenses: 0,
      netIncome: 0,
    }
  }

  const annualRent = rent * 12
  const annualExpenses = expenses * 12
  const netIncome = annualRent - annualExpenses
  const monthlyCashFlow = rent - expenses

  const grossROI = round2((annualRent / p) * 100)
  const netROI = round2((netIncome / p) * 100)
  const capRate = round2(netROI)

  return {
    grossROI,
    netROI,
    capRate,
    monthlyCashFlow: round2(monthlyCashFlow),
    annualRent: round2(annualRent),
    annualExpenses: round2(annualExpenses),
    netIncome: round2(netIncome),
  }
}

// ==========================================
// Locale / Currency Configuration
// ==========================================

export const CURRENCY_CONFIG = {
  USD: { locale: 'en-US', symbol: '$' },
  ARS: { locale: 'es-AR', symbol: '$' },
  EUR: { locale: 'de-DE', symbol: '€' },
  MXN: { locale: 'es-MX', symbol: '$' },
}

/**
 * Format a number as currency using Intl.NumberFormat.
 *
 * @param {number} amount   - The numeric amount
 * @param {string} currency - ISO 4217 currency code (USD, ARS, EUR, MXN)
 * @param {object} [opts]   - Optional overrides
 * @returns {string} Formatted currency string
 */
export function formatCurrency(amount, currency = 'USD', opts = {}) {
  const config = CURRENCY_CONFIG[currency] || CURRENCY_CONFIG.USD
  const num = Number(amount)

  if (isNaN(num)) return `${config.symbol}0`

  return new Intl.NumberFormat(config.locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: opts.minFraction ?? 0,
    maximumFractionDigits: opts.maxFraction ?? 0,
  }).format(num)
}

/**
 * Convert an amount between currencies using a rates map.
 *
 * @param {number} amount
 * @param {string} from    - Source ISO code (USD, ARS, EUR, MXN)
 * @param {string} to      - Target ISO code
 * @param {object} rates   - Exchange rates object (e.g. { USD: 1, ARS: 1400, ... })
 * @returns {number}
 */
export function convertCurrency(amount, from = 'USD', to = 'USD', rates = null) {
  const num = Number(amount)
  if (!rates || !num || from === to) return num
  const fromRate = rates[from] || 1
  const toRate = rates[to] || 1
  return (num / fromRate) * toRate
}
