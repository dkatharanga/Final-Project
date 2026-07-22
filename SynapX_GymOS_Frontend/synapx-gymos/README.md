# SynapX GymOS — Admin Dashboard

> Complete Gym Management System Frontend  
> Built with React + Vite + Recharts

---

## ⚡ Quick Start (3 Steps)

### Step 1 — Install Node.js
Download and install Node.js v18+ from:
👉 https://nodejs.org/en/download

Verify installation:
```bash
node -v    # Should show v18.x or higher
npm -v     # Should show 9.x or higher
```

---

### Step 2 — Install Dependencies
Open this folder in VS Code terminal (`Ctrl + `` ` ``), then run:
```bash
npm install
```

---

### Step 3 — Start the App
```bash
npm run dev
```

The app will open automatically at:
👉 **http://localhost:3000**

---

## 📁 Project Structure

```
synapx-gymos/
├── public/
│   └── favicon.svg
├── src/
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Sidebar.jsx       ← Left navigation sidebar
│   │   │   └── TopBar.jsx        ← Top search bar
│   │   └── ui/
│   │       └── index.jsx         ← Reusable: Badge, Avatar, Btn, KpiCard...
│   ├── data/
│   │   └── mockData.js           ← All sample data (replace with API later)
│   ├── pages/
│   │   └── index.jsx             ← All 8 page components
│   ├── App.jsx                   ← Root component + routing
│   ├── index.css                 ← Global styles + animations
│   ├── main.jsx                  ← React entry point
│   └── theme.js                  ← Dark/light theme colors
├── .vscode/
│   ├── settings.json             ← VS Code editor config
│   └── extensions.json           ← Recommended extensions
├── index.html
├── package.json
├── vite.config.js
└── README.md
```

---

## 🖥️ Pages Included

| Page | Route | Description |
|------|-------|-------------|
| Dashboard | `/` | KPIs, revenue charts, live check-ins |
| Members | Members tab | Member table, search, filter |
| Attendance | Attendance tab | Heatmap, biometric log |
| Classes | Classes tab | Class cards, capacity bars |
| Payments | Payments tab | Invoice table, revenue KPIs |
| Reports | Reports tab | Charts + monthly summary |
| Staff | Staff tab | Staff cards with ratings |
| Settings | Settings tab | Toggles, theme, biometric config |

---

## 🔧 Recommended VS Code Extensions

When you open this project, VS Code will suggest installing these extensions:

- **Prettier** — Code formatting
- **ESLint** — Code quality
- **ES7 React Snippets** — Fast React shortcuts
- **Auto Rename Tag** — Rename JSX tags easily
- **GitLens** — Git history in the editor
- **Material Icon Theme** — Better file icons

---

## 🔌 Connecting to Real Backend (Later)

Replace mock data in `src/data/mockData.js` with API calls:

```js
// Example: Replace static members array with API call
import { useEffect, useState } from 'react'

export function useMembers() {
  const [members, setMembers] = useState([])
  useEffect(() => {
    fetch('http://localhost:5000/api/v1/members')
      .then(r => r.json())
      .then(data => setMembers(data))
  }, [])
  return members
}
```

---

## 📦 Build for Production

```bash
npm run build
```

Output goes to `dist/` folder — deploy to any static host.

---

## 🚀 Next Steps

1. ✅ Admin Dashboard (Done!)
2. ⬜ Entry Kiosk Screen
3. ⬜ Member Mobile App (React Native)
4. ⬜ Backend API (Node.js + Express)
5. ⬜ Biometric Service (Python + FastAPI)
6. ⬜ Database (PostgreSQL + MongoDB)

---

**SynapX Technologies** · synapx.io · support@synapx.io
