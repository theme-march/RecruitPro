# 🎨 RecruitPro Design System - Quick Reference

## 🎯 Color Palette

### Primary Colors

```css
--blue-600: #3b82f6 --indigo-600: #6366f1
  --gradient-primary: linear-gradient(to right, #3b82f6, #6366f1);
```

### Status Colors

```css
--success: #10b981 (Emerald) --warning: #f59e0b (Amber) --danger: #ef4444 (Red)
  --info: #3b82f6 (Blue) --pending: #f59e0b (Amber);
```

### Neutral Colors

```css
--gray-50: #f9fafb --gray-100: #f3f4f6 --gray-200: #e5e7eb --gray-600: #4b5563
  --gray-900: #111827;
```

---

## 📐 Spacing Scale

```css
xs: 0.25rem (4px)
sm: 0.5rem (8px)
md: 1rem (16px)
lg: 1.5rem (24px)
xl: 2rem (32px)
2xl: 2.5rem (40px)
3xl: 3rem (48px)
```

---

## 🔤 Typography

### Font Sizes

```css
text-xs: 0.75rem (12px)
text-sm: 0.875rem (14px)
text-base: 1rem (16px)
text-lg: 1.125rem (18px)
text-xl: 1.25rem (20px)
text-2xl: 1.5rem (24px)
text-3xl: 1.875rem (30px)
```

### Font Weights

```css
font-normal: 400
font-medium: 500
font-semibold: 600
font-bold: 700
```

---

## 🎨 Common Components

### Button

```tsx
// Primary Button
<button className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg">
  Click Me
</button>

// Secondary Button
<button className="bg-white text-gray-700 px-6 py-3 rounded-xl border-2 border-gray-200 hover:bg-gray-50 transition-all font-medium">
  Cancel
</button>
```

### Input

```tsx
<input
  type="text"
  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
  placeholder="Enter text..."
/>
```

### Badge

```tsx
// Success Badge
<span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold">
  Active
</span>

// Warning Badge
<span className="px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-semibold">
  Pending
</span>

// Danger Badge
<span className="px-3 py-1 rounded-full bg-red-100 text-red-700 text-xs font-semibold">
  Inactive
</span>
```

### Card

```tsx
<div className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all">
  <h3 className="text-xl font-bold mb-4">Card Title</h3>
  <p className="text-gray-600">Card content goes here...</p>
</div>
```

### Avatar

```tsx
<div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold shadow-lg">
  A
</div>
```

### Progress Bar

```tsx
<div className="w-full bg-gray-200 rounded-full h-2">
  <div
    className="bg-gradient-to-r from-emerald-500 to-emerald-600 h-2 rounded-full transition-all"
    style={{ width: "75%" }}
  />
</div>
```

---

## 🎭 Animations

### Framer Motion - Fade In

```tsx
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.3 }}
>
  Content
</motion.div>
```

### Framer Motion - Stagger Children

```tsx
<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
  {items.map((item, i) => (
    <motion.div
      key={item.id}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: i * 0.1 }}
    >
      {item.content}
    </motion.div>
  ))}
</motion.div>
```

### CSS Transitions

```css
.transition-all {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.hover:scale-110 {
  transform: scale(1.1);
}
```

---

## 📱 Responsive Breakpoints

```css
sm: 640px   /* Mobile landscape */
md: 768px   /* Tablet */
lg: 1024px  /* Desktop */
xl: 1280px  /* Large desktop */
2xl: 1536px /* Extra large */
```

### Usage

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
  {/* Responsive grid */}
</div>
```

---

## 🎯 Icons (Lucide React)

### Common Icons

```tsx
import {
  Users, // People/Candidates
  UserPlus, // Add User
  Search, // Search
  Filter, // Filter
  Settings, // Settings
  Bell, // Notifications
  LogOut, // Logout
  Edit2, // Edit
  Trash2, // Delete
  Check, // Success
  X, // Close/Cancel
  AlertCircle, // Error/Warning
  TrendingUp, // Growth
  DollarSign, // Money
  Clock, // Time
  Phone, // Phone
  Mail, // Email
} from "lucide-react";
```

---

## 🎨 Gradient Examples

### Background Gradients

```css
.gradient-primary {
  background: linear-gradient(135deg, #3b82f6 0%, #6366f1 100%);
}

.gradient-success {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
}

.gradient-warning {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
}
```

### Text Gradients

```tsx
<h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
  Gradient Text
</h1>
```

---

## 🔍 Search & Filter Pattern

```tsx
const [search, setSearch] = useState("");
const [filter, setFilter] = useState("all");

// Apply filters
useEffect(() => {
  let result = [...data];

  if (search) {
    result = result.filter((item) =>
      item.name.toLowerCase().includes(search.toLowerCase()),
    );
  }

  if (filter !== "all") {
    result = result.filter((item) => item.status === filter);
  }

  setFilteredData(result);
}, [search, filter, data]);
```

---

## 📊 Table Pattern

```tsx
<div className="bg-white rounded-2xl shadow-lg overflow-hidden">
  <table className="w-full">
    <thead className="bg-gradient-to-r from-gray-50 to-blue-50">
      <tr>
        <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase">
          Column
        </th>
      </tr>
    </thead>
    <tbody className="divide-y divide-gray-100">
      <tr className="hover:bg-blue-50 transition-colors">
        <td className="px-6 py-4">Data</td>
      </tr>
    </tbody>
  </table>
</div>
```

---

## 🎯 Loading States

### Spinner

```tsx
<div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
```

### Skeleton

```tsx
<div className="space-y-4">
  <div className="h-12 bg-gray-200 rounded animate-pulse" />
  <div className="h-12 bg-gray-200 rounded animate-pulse" />
  <div className="h-12 bg-gray-200 rounded animate-pulse" />
</div>
```

---

## 🎨 Modal Pattern

```tsx
<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    className="bg-white rounded-2xl shadow-2xl w-full max-w-lg"
  >
    <div className="p-6">{/* Modal content */}</div>
  </motion.div>
</div>
```

---

## 🎯 Toast Notification

```tsx
// Success Toast
<div className="fixed top-4 right-4 bg-emerald-50 border border-emerald-200 text-emerald-700 p-4 rounded-xl shadow-lg">
  Success message
</div>

// Error Toast
<div className="fixed top-4 right-4 bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl shadow-lg">
  Error message
</div>
```

---

## ⚡ Performance Tips

1. **Use memo for expensive components**

```tsx
const MemoizedComponent = React.memo(Component);
```

2. **Debounce search inputs**

```tsx
useEffect(() => {
  const timeout = setTimeout(() => {
    fetchData(search);
  }, 400);
  return () => clearTimeout(timeout);
}, [search]);
```

3. **Lazy load heavy components**

```tsx
const HeavyComponent = lazy(() => import("./HeavyComponent"));
```

---

## 📦 Package Versions

```json
{
  "react": "^18.x",
  "react-router-dom": "^6.x",
  "tailwindcss": "^3.x",
  "framer-motion": "^11.x",
  "lucide-react": "latest",
  "date-fns": "^2.x"
}
```

---

**Pro Tips**:

- Always use consistent spacing (multiples of 4px)
- Keep animations subtle (300ms or less)
- Use semantic HTML elements
- Test on mobile devices
- Optimize images before uploading
- Use proper TypeScript types

---

Happy Coding! 🚀
