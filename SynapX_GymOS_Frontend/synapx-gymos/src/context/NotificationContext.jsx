// src/context/NotificationContext.jsx
// Lightweight app-wide notification feed:
//  • event notifications  (member added / updated, payment received) — pushed via add()
//  • system alerts         (expiring / expired members, overdue payments) — computed via refreshAlerts()
import { createContext, useContext, useState, useCallback, useRef } from 'react'
import { dashboardService, memberService, paymentService } from '../api/services'

const NotificationContext = createContext(null)
const genId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7)

export function timeAgo(date) {
  const d = date instanceof Date ? date : new Date(date)
  const s = Math.floor((Date.now() - d.getTime()) / 1000)
  if (s < 45)    return 'just now'
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function NotificationProvider({ children }) {
  const [items, setItems] = useState([])
  const busy = useRef(false)

  // Push a one-off event notification (always new + unread)
  const add = useCallback((n) => {
    setItems(prev => [{ id: genId(), time: new Date(), read: false, ...n }, ...prev].slice(0, 60))
  }, [])

  // Insert or update a keyed system alert so repeated polls never duplicate it
  const upsertSystem = useCallback((key, n) => {
    setItems(prev => {
      const idx = prev.findIndex(x => x.key === key)
      if (idx >= 0) {
        const copy = [...prev]
        copy[idx] = { ...copy[idx], ...n } // preserve id/time/read
        return copy
      }
      return [{ id: genId(), time: new Date(), read: false, key, ...n }, ...prev]
    })
  }, [])

  const removeSystem = useCallback((key) => {
    setItems(prev => prev.filter(x => x.key !== key))
  }, [])

  const markAllRead = useCallback(() => setItems(prev => prev.map(x => ({ ...x, read: true }))), [])
  const clearAll    = useCallback(() => setItems([]), [])

  // Recompute system alerts from live backend data. Safe to call repeatedly.
  const refreshAlerts = useCallback(async () => {
    if (busy.current) return
    busy.current = true

    try {
      const res = await dashboardService.kpis()
      const k = res?.data ?? res
      const n = Number(k?.expiringIn7 || 0)
      if (n > 0) upsertSystem('expiring', { type: 'expiring', title: 'Memberships expiring soon', message: `${n} membership${n > 1 ? 's' : ''} expire within 7 days.` })
      else removeSystem('expiring')
    } catch { /* not logged in yet / offline */ }

    try {
      const res = await memberService.list({ status: 'EXPIRED', limit: 1 })
      const n = res?.pagination?.total ?? (Array.isArray(res?.data) ? res.data.length : 0)
      if (n > 0) upsertSystem('expired', { type: 'expired', title: 'Expired members', message: `${n} member${n > 1 ? 's have' : ' has'} an expired membership.` })
      else removeSystem('expired')
    } catch {}

    try {
      const res = await paymentService.list({ status: 'OVERDUE', limit: 1 })
      const n = res?.pagination?.total ?? (Array.isArray(res?.data) ? res.data.length : 0)
      if (n > 0) upsertSystem('overdue', { type: 'payment', title: 'Overdue payments', message: `${n} payment${n > 1 ? 's are' : ' is'} overdue.` })
      else removeSystem('overdue')
    } catch {}

    busy.current = false
  }, [upsertSystem, removeSystem])

  const unread = items.filter(x => !x.read).length

  return (
    <NotificationContext.Provider value={{ items, unread, add, upsertSystem, removeSystem, markAllRead, clearAll, refreshAlerts }}>
      {children}
    </NotificationContext.Provider>
  )
}

// Falls back to no-ops if used outside the provider (never crashes a page).
export function useNotifications() {
  return useContext(NotificationContext) ?? {
    items: [], unread: 0,
    add: () => {}, upsertSystem: () => {}, removeSystem: () => {},
    markAllRead: () => {}, clearAll: () => {}, refreshAlerts: () => {},
  }
}
