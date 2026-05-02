## Making an App Responsive

Responsiveness means your UI adapts gracefully to different screen sizes. Here are the core techniques:

---

### 1. Use a Fluid Layout (not fixed widths)
```css
/* ❌ Avoid */
.container { width: 1200px; }

/* ✅ Better */
.container { width: 90%; max-width: 1200px; margin: 0 auto; }
```

---

### 2. CSS Media Queries
Target specific breakpoints to apply different styles:
```css
/* Mobile first approach */
.card { width: 100%; }

@media (min-width: 768px) {   /* Tablet */
  .card { width: 48%; }
}

@media (min-width: 1024px) {  /* Desktop */
  .card { width: 30%; }
}
```

---

### 3. Flexbox & CSS Grid
These handle layout reflow naturally:
```css
/* Flexbox — wraps items automatically */
.row {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}

/* Grid — auto-fill columns based on space */
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 16px;
}
```

---

### 4. Responsive Typography
Use `clamp()` or relative units (`rem`, `em`, `vw`):
```css
h1 {
  font-size: clamp(1.5rem, 4vw, 3rem); /* min, preferred, max */
}
```

---

### 5. Responsive Images
```css
img {
  max-width: 100%;
  height: auto;
}
```

---

### 6. Set the Viewport Meta Tag (HTML)
Without this, mobile browsers zoom out by default:
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
```

---

### 7. If Using a Framework

| Framework | Approach |
|---|---|
| **Tailwind** | Prefix classes: `md:w-1/2 lg:w-1/3` |
| **Bootstrap** | Grid system: `col-12 col-md-6 col-lg-4` |
| **React Native** | `Dimensions` API + `flexbox` |
| **Flutter** | `LayoutBuilder`, `MediaQuery` |

---

### Key Principle: **Mobile-First**
Design for the smallest screen first, then scale up with `min-width` media queries. It's easier to expand a layout than to shrink one.

Want a specific example — a dashboard, a data table, a nav bar, or something else?