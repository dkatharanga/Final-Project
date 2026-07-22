// src/pages/Staff.jsx — Real API
import { useState } from 'react'
import { staffService } from '../api/services'
import { usePaginated } from '../hooks/useApi'
import { Avatar, Btn, Card, Icon } from '../components/ui/index.jsx'
import { useNotifications } from '../context/NotificationContext.jsx'

const AV_COLORS = ['#E11D2E','#3F4350','#9B1C2E','#6B7280','#C4142B','#E11D2E','#3F4350']

const ROLE_OPTIONS = [
  { value: 'SUPER_ADMIN',  label: 'Super Admin' },
  { value: 'ADMIN',        label: 'Admin' },
  { value: 'MANAGER',      label: 'Manager' },
  { value: 'TRAINER',      label: 'Trainer' },
  { value: 'RECEPTIONIST', label: 'Receptionist' },
  { value: 'READ_ONLY',    label: 'Read only' },
]
const roleLabel = (r) => ROLE_OPTIONS.find(o => o.value === r)?.label || (r ? r.replace('_', ' ') : '')

function RoleBadge({ role, t }) {
  const map = { SUPER_ADMIN: t.accent, ADMIN: t.accent, MANAGER: t.green, TRAINER: t.purple, RECEPTIONIST: t.orange, READ_ONLY: t.textSub }
  return <span style={{ fontSize: 11, color: map[role] || t.textSub, fontWeight: 600 }}>{roleLabel(role)}</span>
}

// ── ADD STAFF MODAL ──────────────────────────────────────────────
function AddStaffModal({ t, onClose, onSaved }) {
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', role: 'RECEPTIONIST', password: '', specializations: '' })
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const notify = useNotifications()
  const ch = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const inputStyle = { width: '100%', padding: '11px 14px', background: t.inputBg, border: `1px solid ${t.inputBorder}`, borderRadius: 8, color: t.text, fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }
  const labelStyle = { display: 'block', fontSize: 11, fontWeight: 700, color: t.textSub, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 7 }

  const submit = async (e) => {
    e.preventDefault()
    if (!form.fullName.trim()) { setError('Full name is required.'); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) { setError('Enter a valid email address.'); return }
    if (form.password.length < 6) { setError('Password must be at least 6 characters.'); return }
    setLoading(true); setError('')
    try {
      await staffService.create(form)
      notify.add({ type: 'member', title: 'Staff added', message: `${form.fullName} was added as ${roleLabel(form.role)}.` })
      if (onSaved) await onSaved()
      onClose()
    } catch (err) {
      setError(err.status === 403 ? 'Only a super admin or admin can add staff.' : (err.message || 'Failed to add staff.'))
    } finally { setLoading(false) }
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 300 }} />
      <div style={{ position: 'fixed', inset: 0, zIndex: 301, overflowY: 'auto', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '60px 16px' }}>
        <form onSubmit={submit} style={{ width: '100%', maxWidth: 480, background: t.surface, borderRadius: 16, border: `1px solid ${t.border}`, padding: 30, boxShadow: '0 25px 80px rgba(0,0,0,0.4)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
            <div>
              <div style={{ fontSize: 19, fontWeight: 800, color: t.text }}>Add staff member</div>
              <div style={{ fontSize: 12.5, color: t.textSub, marginTop: 3 }}>They sign in with this email + password.</div>
            </div>
            <button type="button" onClick={onClose} style={{ width: 32, height: 32, background: t.toggleBg, border: `1px solid ${t.border}`, borderRadius: 8, color: t.textSub, cursor: 'pointer' }}>
              <Icon name="x" size={16} color={t.textSub} />
            </button>
          </div>

          {error && <div style={{ padding: '10px 14px', background: t.redSoft, border: `1px solid ${t.red}30`, borderRadius: 8, color: t.red, fontSize: 12, marginBottom: 16 }}>⚠ {error}</div>}

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Full name *</label>
            <input name="fullName" value={form.fullName} onChange={ch} placeholder="e.g. Nuwan Karunaratne" required style={inputStyle} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
            <div>
              <label style={labelStyle}>Email *</label>
              <input name="email" type="email" value={form.email} onChange={ch} placeholder="name@gym.lk" required style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Phone</label>
              <input name="phone" value={form.phone} onChange={ch} placeholder="+94 77 123 4567" style={inputStyle} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
            <div>
              <label style={labelStyle}>Role</label>
              <select name="role" value={form.role} onChange={ch} style={inputStyle}>
                {ROLE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Password *</label>
              <input name="password" type="password" value={form.password} onChange={ch} placeholder="Min 6 characters" required style={inputStyle} />
            </div>
          </div>
          {form.role === 'TRAINER' && (
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Specializations</label>
              <input name="specializations" value={form.specializations} onChange={ch} placeholder="CrossFit, HIIT, Yoga (comma separated)" style={inputStyle} />
            </div>
          )}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
            <Btn v="outline" t={t} type="button" onClick={onClose}>Cancel</Btn>
            <Btn v="primary" t={t} type="submit" disabled={loading}>{loading ? 'Adding…' : 'Add staff'}</Btn>
          </div>
        </form>
      </div>
    </>
  )
}

// ── EDIT STAFF MODAL ─────────────────────────────────────────────
function EditStaffModal({ t, staff, canSetPassword, onClose, onSaved }) {
  const [form, setForm] = useState({ fullName: staff.fullName || '', phone: staff.phone || '', role: staff.role || 'RECEPTIONIST', isActive: staff.isActive !== false, password: '' })
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const notify = useNotifications()
  const ch = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const inputStyle = { width: '100%', padding: '11px 14px', background: t.inputBg, border: `1px solid ${t.inputBorder}`, borderRadius: 8, color: t.text, fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }
  const labelStyle = { display: 'block', fontSize: 11, fontWeight: 700, color: t.textSub, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 7 }

  const submit = async (e) => {
    e.preventDefault()
    if (!form.fullName.trim()) { setError('Full name is required.'); return }
    if (canSetPassword && form.password && form.password.length < 6) { setError('Password must be at least 6 characters.'); return }
    setLoading(true); setError('')
    try {
      const payload = { fullName: form.fullName.trim(), phone: form.phone, role: form.role, isActive: form.isActive }
      if (canSetPassword && form.password) payload.password = form.password
      await staffService.update(staff.id, payload)
      notify.add({ type: 'member_updated', title: 'Staff updated', message: `${form.fullName}'s details were updated${payload.password ? ' (password reset)' : ''}.` })
      if (onSaved) await onSaved()
      onClose()
    } catch (err) {
      setError(err.status === 403 ? (err.message || 'You do not have access to this change.') : (err.message || 'Update failed.'))
    } finally { setLoading(false) }
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 300 }} />
      <div style={{ position: 'fixed', inset: 0, zIndex: 301, overflowY: 'auto', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '60px 16px' }}>
        <form onSubmit={submit} style={{ width: '100%', maxWidth: 460, background: t.surface, borderRadius: 16, border: `1px solid ${t.border}`, padding: 30, boxShadow: '0 25px 80px rgba(0,0,0,0.4)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
            <div>
              <div style={{ fontSize: 19, fontWeight: 800, color: t.text }}>Edit staff</div>
              <div style={{ fontSize: 12.5, color: t.textSub, marginTop: 3 }}>{staff.email}</div>
            </div>
            <button type="button" onClick={onClose} style={{ width: 32, height: 32, background: t.toggleBg, border: `1px solid ${t.border}`, borderRadius: 8, color: t.textSub, cursor: 'pointer' }}>
              <Icon name="x" size={16} color={t.textSub} />
            </button>
          </div>

          {error && <div style={{ padding: '10px 14px', background: t.redSoft, border: `1px solid ${t.red}30`, borderRadius: 8, color: t.red, fontSize: 12, marginBottom: 16 }}>⚠ {error}</div>}

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Full name *</label>
            <input name="fullName" value={form.fullName} onChange={ch} required style={inputStyle} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Phone</label>
            <input name="phone" value={form.phone} onChange={ch} placeholder="+94 77 123 4567" style={inputStyle} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 24 }}>
            <div>
              <label style={labelStyle}>Role</label>
              <select name="role" value={form.role} onChange={ch} style={inputStyle}>
                {ROLE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Status</label>
              <select value={form.isActive ? 'true' : 'false'} onChange={e => setForm({ ...form, isActive: e.target.value === 'true' })} style={inputStyle}>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>
          </div>

          {canSetPassword && (
            <div style={{ marginBottom: 24, padding: '14px', background: t.bg, border: `1px solid ${t.border}`, borderRadius: 10 }}>
              <label style={labelStyle}>Reset Password</label>
              <input name="password" type="password" value={form.password} onChange={ch} placeholder="New password (leave blank to keep current)" autoComplete="new-password" style={inputStyle} />
              <div style={{ fontSize: 11, color: t.textSub, marginTop: 6 }}>Super-admin only. Leave blank to keep the existing password.</div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <Btn v="outline" t={t} type="button" onClick={onClose}>Cancel</Btn>
            <Btn v="primary" t={t} type="submit" disabled={loading}>{loading ? 'Saving…' : 'Save changes'}</Btn>
          </div>
        </form>
      </div>
    </>
  )
}

export default function StaffPage({ t, user }) {
  const { items, loading, error, refetch } = usePaginated((params) => staffService.list(params))
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState(null)
  const notify = useNotifications()
  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN'
  const isSuperAdmin = user?.role === 'SUPER_ADMIN'

  const handleDelete = async (s) => {
    if (!window.confirm(`Delete ${s.fullName}? This cannot be undone.`)) return
    try {
      await staffService.remove(s.id)
      notify.add({ type: 'member', title: 'Staff removed', message: `${s.fullName} was removed.` })
      refetch()
    } catch (err) {
      alert(err.status === 403 ? 'Only an admin can delete staff.' : (err.message || 'Delete failed.'))
    }
  }

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: t.text }}>Staff Management</h2>
          <p style={{ fontSize: 12, color: t.textSub, marginTop: 2 }}>{items.length} staff members</p>
        </div>
        {isAdmin && <Btn t={t} sm onClick={() => setShowAdd(true)}>+ Add Staff</Btn>}
      </div>

      {error && <div style={{ padding: '12px 16px', background: t.redSoft, borderRadius: 8, color: t.red, fontSize: 13, marginBottom: 16 }}>⚠ {error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 14 }}>
        {loading ? Array(6).fill(0).map((_, i) => (
          <Card key={i} t={t}>
            <div style={{ height: 14, background: t.border, borderRadius: 4, width: '70%', marginBottom: 10, animation: 'pulse 1.5s ease-in-out infinite' }} />
            <div style={{ height: 10, background: t.border, borderRadius: 4, width: '40%', animation: 'pulse 1.5s ease-in-out infinite' }} />
          </Card>
        )) : items.map((s, i) => (
          <Card key={s.id} t={t}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 14 }}>
              <Avatar initials={s.fullName.split(' ').map(n => n[0]).join('').slice(0, 2)} color={AV_COLORS[i % AV_COLORS.length]} size={44} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: t.text }}>{s.fullName}</div>
                <RoleBadge role={s.role} t={t} />
                {s.trainerProfile?.specializations?.length > 0 && (
                  <div style={{ fontSize: 10, color: t.textSub, marginTop: 3 }}>
                    {s.trainerProfile.specializations.join(', ')}
                  </div>
                )}
              </div>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.isActive ? t.green : t.red, marginTop: 3, flexShrink: 0 }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7, marginBottom: 14 }}>
              {[
                { l: 'Email', v: s.email },
                { l: 'Last Login', v: s.lastLogin ? new Date(s.lastLogin).toLocaleDateString() : 'Never' },
              ].map(m => (
                <div key={m.l} style={{ background: t.bg, borderRadius: 7, padding: '7px 9px', overflow: 'hidden' }}>
                  <div style={{ fontSize: 9, color: t.textSub, textTransform: 'uppercase', letterSpacing: 1 }}>{m.l}</div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: t.text, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.v}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 7 }}>
              {isAdmin && <Btn v="outline" t={t} sm onClick={() => setEditing(s)}>Edit</Btn>}
              {isAdmin && s.id !== user?.id && (
                <button onClick={() => handleDelete(s)} title="Delete staff"
                  style={{ padding: '5px 10px', borderRadius: 7, border: `1px solid ${t.red}55`, background: t.redSoft, color: t.red, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                  Delete
                </button>
              )}
              {!isAdmin && <Btn v="ghost" t={t} sm disabled>View only</Btn>}
            </div>
          </Card>
        ))}
      </div>

      {showAdd && <AddStaffModal t={t} onClose={() => setShowAdd(false)} onSaved={refetch} />}
      {editing && <EditStaffModal t={t} staff={editing} canSetPassword={isSuperAdmin} onClose={() => setEditing(null)} onSaved={refetch} />}
    </div>
  )
}
