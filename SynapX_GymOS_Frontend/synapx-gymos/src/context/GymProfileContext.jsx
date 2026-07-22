// src/context/GymProfileContext.jsx
// Global gym branding: name + logo image. Set in Settings → General; shown in
// the sidebar (top-left) and on printed invoices/bills. Persisted to
// localStorage (logo is a downscaled data URL).
import { createContext, useContext, useState, useCallback } from 'react'

const GymProfileContext = createContext(null)

export function GymProfileProvider({ children }) {
  const [gymName,    setGymNameState]    = useState(() => localStorage.getItem('synapx_gym_name') || 'FitNation Colombo')
  const [branchName, setBranchNameState] = useState(() => localStorage.getItem('synapx_branch_name') || 'FitNation Colombo')
  const [logo,       setLogoState]       = useState(() => localStorage.getItem('synapx_gym_logo') || '')

  const setGymName = useCallback((v) => {
    const name = v || ''
    setGymNameState(name)
    localStorage.setItem('synapx_gym_name', name)
  }, [])

  const setBranchName = useCallback((v) => {
    const name = v || ''
    setBranchNameState(name)
    localStorage.setItem('synapx_branch_name', name)
  }, [])

  const setLogo = useCallback((dataUrl) => {
    setLogoState(dataUrl || '')
    try {
      if (dataUrl) localStorage.setItem('synapx_gym_logo', dataUrl)
      else localStorage.removeItem('synapx_gym_logo')
    } catch { /* storage full — keep it in memory for this session */ }
  }, [])

  return (
    <GymProfileContext.Provider value={{ gymName, setGymName, branchName, setBranchName, logo, setLogo }}>
      {children}
    </GymProfileContext.Provider>
  )
}

export const useGymProfile = () => {
  const ctx = useContext(GymProfileContext)
  if (!ctx) throw new Error('useGymProfile must be inside GymProfileProvider')
  return ctx
}
