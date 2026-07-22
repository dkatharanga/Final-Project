// src/pages/Classes.jsx — Real API
import { useState, useEffect } from 'react'
import { classService, staffService } from '../api/services'
import { usePaginated } from '../hooks/useApi'
import { Btn, Card, Icon } from '../components/ui/index.jsx'
import { useNotifications } from '../context/NotificationContext.jsx'

const CLASS_COLORS = ['#E11D2E', '#3F4350', '#15803D', '#B45309', '#6D28D9', '#0E7490']

// ── ADD CLASS MODAL ──────────────────────────────────────────────
function AddClassModal({ t, onClose, onSaved }) {
  const [form, setForm] = useState({ name: '', type: '', trainerId: '', capacity: '15', durationMin: '45', startTime: '07:00', recurrence: '', color: '#E11D2E' })
  const [trainers, setTrainers] = useState([])
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const notify = useNotifications()
  const ch = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  // Trainers = staff with a trainer profile; class.trainerId is the Trainer id.
  useEffect(() => {
    staffService.list().then(res => {
      const list = res?.data ?? res ?? []
      setTrainers((Array.isArray(list) ? list : []).filter(s => s.trainerProfile).map(s => ({ id: s.trainerProfile.id, name: s.fullName })))
    }).catch(() => {})
  }, [])

  const inputStyle = { width: '100%', padding: '11px 14px', background: t.inputBg, border: `1px solid ${t.inputBorder}`, borderRadius: 8, color: t.text, fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }
  const labelStyle = { display: 'block', fontSize: 11, fontWeight: 700, color: t.textSub, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 7 }

  const submit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) { setError('Class name is required.'); return }
    if (!form.startTime) { setError('Start time is required.'); return }
    if (Number(form.capacity) < 1) { setError('Capacity must be at least 1.'); return }
    if (Number(form.durationMin) < 1) { setError('Duration must be at least 1 minute.'); return }
    setLoading(true); setError('')
    try {
      await classService.create({
        name: form.name.trim(), type: form.type.trim(), trainerId: form.trainerId || null,
        capacity: Number(form.capacity), durationMin: Number(form.durationMin),
        startTime: form.startTime, recurrence: form.recurrence.trim(), color: form.color,
      })
      notify.add({ type: 'member', title: 'Class created', message: `${form.name} was added to the schedule.` })
      if (onSaved) await onSaved()
      onClose()
    } catch (err) {
      setError(err.status === 403 ? 'Only a super admin or admin can add classes.' : (err.message || 'Failed to create class.'))
    } finally { setLoading(false) }
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 300 }} />
      <div style={{ position: 'fixed', inset: 0, zIndex: 301, overflowY: 'auto', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '60px 16px' }}>
        <form onSubmit={submit} style={{ width: '100%', maxWidth: 500, background: t.surface, borderRadius: 16, border: `1px solid ${t.border}`, padding: 30, boxShadow: '0 25px 80px rgba(0,0,0,0.4)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
            <div>
              <div style={{ fontSize: 19, fontWeight: 800, color: t.text }}>New class</div>
              <div style={{ fontSize: 12.5, color: t.textSub, marginTop: 3 }}>Add a class to the schedule.</div>
            </div>
            <button type="button" onClick={onClose} style={{ width: 32, height: 32, background: t.toggleBg, border: `1px solid ${t.border}`, borderRadius: 8, color: t.textSub, cursor: 'pointer' }}>
              <Icon name="x" size={16} color={t.textSub} />
            </button>
          </div>

          {error && <div style={{ padding: '10px 14px', background: t.redSoft, border: `1px solid ${t.red}30`, borderRadius: 8, color: t.red, fontSize: 12, marginBottom: 16 }}>⚠ {error}</div>}

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Class name *</label>
            <input name="name" value={form.name} onChange={ch} placeholder="e.g. CrossFit HIIT" required style={inputStyle} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
            <div>
              <label style={labelStyle}>Type</label>
              <input name="type" value={form.type} onChange={ch} placeholder="e.g. CrossFit" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Trainer</label>
              <select name="trainerId" value={form.trainerId} onChange={ch} style={inputStyle}>
                <option value="">Unassigned</option>
                {trainers.map(tr => <option key={tr.id} value={tr.id}>{tr.name}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
            <div>
              <label style={labelStyle}>Capacity *</label>
              <input name="capacity" type="number" min="1" value={form.capacity} onChange={ch} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Duration (min) *</label>
              <input name="durationMin" type="number" min="1" value={form.durationMin} onChange={ch} style={inputStyle} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
            <div>
              <label style={labelStyle}>Start time *</label>
              <input name="startTime" type="time" value={form.startTime} onChange={ch} required style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Recurrence</label>
              <input name="recurrence" value={form.recurrence} onChange={ch} placeholder="e.g. Mon/Wed/Fri" style={inputStyle} />
            </div>
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={labelStyle}>Colour</label>
            <div style={{ display: 'flex', gap: 10 }}>
              {CLASS_COLORS.map(c => (
                <div key={c} onClick={() => setForm({ ...form, color: c })} title={c}
                  style={{ width: 28, height: 28, borderRadius: 8, background: c, cursor: 'pointer', border: form.color === c ? `3px solid ${t.text}` : '3px solid transparent' }} />
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <Btn v="outline" t={t} type="button" onClick={onClose}>Cancel</Btn>
            <Btn v="primary" t={t} type="submit" disabled={loading}>{loading ? 'Creating…' : 'Create class'}</Btn>
          </div>
        </form>
      </div>
    </>
  )
}

export default function ClassesPage({ t, user }) {
  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN'
  const [showAdd, setShowAdd] = useState(false)
  const { items, loading, error, refetch } = usePaginated((params) => classService.list(params))

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: t.text }}>Class Scheduling</h2>
          <p style={{ fontSize: 12, color: t.textSub, marginTop: 2 }}>{items.length} active classes</p>
        </div>
        {isAdmin && <Btn t={t} sm onClick={() => setShowAdd(true)}>+ New Class</Btn>}
      </div>

      {error && <div style={{ padding: '12px 16px', background: t.redSoft, borderRadius: 8, color: t.red, fontSize: 13, marginBottom: 16 }}>⚠ {error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 14 }}>
        {loading ? Array(6).fill(0).map((_, i) => (
          <Card key={i} t={t} noPad>
            <div style={{ height: 4, background: t.border }} />
            <div style={{ padding: '16px 18px' }}>
              <div style={{ height: 14, background: t.border, borderRadius: 4, width: '60%', marginBottom: 8, animation: 'pulse 1.5s ease-in-out infinite' }} />
              <div style={{ height: 10, background: t.border, borderRadius: 4, width: '40%', animation: 'pulse 1.5s ease-in-out infinite' }} />
            </div>
          </Card>
        )) : items.map(c => {
          const booked   = c._count?.bookings || 0
          const full     = booked >= c.capacity
          const trainerName = c.trainer?.staff?.fullName || '—'

          return (
            <Card key={c.id} t={t} noPad>
              <div style={{ height: 4, background: c.color || t.accent }} />
              <div style={{ padding: '16px 18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: t.text }}>{c.name}</div>
                    <div style={{ fontSize: 11, color: t.textSub, marginTop: 2 }}>{trainerName}</div>
                  </div>
                  <span style={{ padding: '3px 9px', borderRadius: 4, fontSize: 10, fontWeight: 700, letterSpacing: 1, background: full ? t.orangeSoft : t.greenSoft, color: full ? t.orange : t.green, textTransform: 'uppercase' }}>
                    {full ? 'FULL' : 'OPEN'}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 11, color: t.textSub }}>🕐 {c.startTime}</span>
                  <span style={{ fontSize: 11, color: t.textSub }}>⏱ {c.durationMin}min</span>
                  {c.recurrence && <span style={{ fontSize: 11, color: t.textSub }}>📅 {c.recurrence}</span>}
                </div>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 10, color: t.textSub }}>Bookings</span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: t.text }}>{booked}/{c.capacity}</span>
                  </div>
                  <div style={{ height: 4, background: t.border, borderRadius: 3 }}>
                    <div style={{ height: '100%', width: `${Math.min((booked / c.capacity) * 100, 100)}%`, background: full ? t.orange : (c.color || t.accent), borderRadius: 3 }} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 7 }}>
                  <Btn v="ghost" t={t} sm>Bookings</Btn>
                  {isAdmin && <Btn v="outline" t={t} sm>Edit</Btn>}
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      {showAdd && <AddClassModal t={t} onClose={() => setShowAdd(false)} onSaved={refetch} />}
    </div>
  )
}
