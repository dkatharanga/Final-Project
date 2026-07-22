// src/context/CurrencyContext.jsx
// Global display currency. Set once in Settings → General; every money value in
// the app formats through `fmt()` so changing it here changes it everywhere.
import { createContext, useContext, useState, useCallback } from 'react'

export const CURRENCIES = [
  { code: 'USD', symbol: '$'   },
  { code: 'EUR', symbol: '€'   },
  { code: 'GBP', symbol: '£'   },
  { code: 'LKR', symbol: 'Rs'  },
  { code: 'INR', symbol: '₹'   },
  { code: 'AUD', symbol: 'A$'  },
  { code: 'CAD', symbol: 'C$'  },
  { code: 'AED', symbol: 'AED' },
  { code: 'JPY', symbol: '¥'   },
]

const symbolFor = (code) => (CURRENCIES.find(c => c.code === code)?.symbol) || code

const CurrencyContext = createContext(null)

export function CurrencyProvider({ children }) {
  const [currency, setCurrencyState] = useState(() => localStorage.getItem('synapx_currency') || 'USD')

  const setCurrency = useCallback((code) => {
    setCurrencyState(code)
    localStorage.setItem('synapx_currency', code)
  }, [])

  const symbol = symbolFor(currency)

  // fmt(1234.5)      -> "$1,235"   (rounded, thousands separated)
  // fmt(65, 2)       -> "$65.00"
  const fmt = useCallback((amount, decimals = 0) => {
    const n = Number(amount || 0)
    const sym = symbolFor(currency)
    const sep = sym.length > 1 ? ' ' : ''
    return `${sym}${sep}${n.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`
  }, [currency])

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, symbol, fmt }}>
      {children}
    </CurrencyContext.Provider>
  )
}

export const useCurrency = () => {
  const ctx = useContext(CurrencyContext)
  if (!ctx) throw new Error('useCurrency must be inside CurrencyProvider')
  return ctx
}
