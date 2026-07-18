# Industry Light Mode Color Palettes Analysis Report

This document contains a comprehensive analysis of the light mode design systems and color palettes of 13 industry-leading web applications. The goal is to identify design patterns, color codes, and best practices that can be adopted to elevate the user interface of **TalentFlow**.

---

## 1. Individual Application Analysis

### 1. Vercel (Geist Design System)
*   **Design Philosophy**: Minimalist, high-contrast, black-and-white centric, modern, and geometric. Geist relies heavily on absolute darks and lights to establish structure.
*   **Text Contrast Levels**:
    *   **Primary Text**: `#000000` (Pure Black) or `#111111` for high-density elements.
    *   **Secondary Text**: `#444444` (Dark Gray) for captions, labels, and secondary labels.
    *   **Muted Text**: `#888888` (Medium Gray) for inactive descriptions, disabled states, or timestamps.
    *   **Interactive/Links**: `#0070f3` (Geist Blue) or `#000000` (bold underlines).
*   **Border Structure & Colors**:
    *   **Dividers/Borders**: `#eaeaea` (extremely light gray) or `#dddddd`. Usually `1px solid`.
    *   **Form Inputs**: `#eaeaea` default border; `#888888` on hover; `#000000` on focus (no glow, simple transition).
    *   **Cards/Containers**: `#eaeaea` border with no box shadow, emphasizing a flat grid aesthetic.
*   **Card/Container Shading & Backgrounds**:
    *   **Page Background**: `#ffffff` (Pure White).
    *   **Card/Container Background**: `#ffffff` (identical to page bg, separated strictly by `#eaeaea` borders).
    *   **Hover/Select Background**: `#fafafa` (extremely light gray) or `#eaeaea`.
    *   **Elevation & Shadows**: Geist eschews shadows where possible. Hovering on a card either changes the border to `#000000` or applies a very light shadow: `0 4px 12px rgba(0, 0, 0, 0.05)`.
*   **Accent Harmony**:
    *   **Primary Accent**: `#000000` (Pure black for primary CTA buttons and active tab markers).
    *   **Secondary Accent**: `#0070f3` (Vercel Blue for links, code blocks, and deployment highlights).
    *   **Gradients**: Very sparse in UI. Limited to marketing banners (e.g., `#0070f3` to `#f81ce5`).
*   **Status Colors**:
    *   **Success**: Text `#0070f3` (Geist historically uses blue for success/info) or `#10b981` (Green); BG `#e6f4ea`; Border `#a7f3d0`.
    *   **Error**: Text `#ee0000` (Vercel Red); BG `#fee2e2`; Border `#fecaca`.
    *   **Warning**: Text `#f5a623` (Vercel Orange); BG `#fffbeb`; Border `#fef3c7`.
    *   **Info**: Text `#0070f3`; BG `#eff6ff`; Border `#bfdbfe`.

---

### 2. Linear (Linear UI)
*   **Design Philosophy**: Highly refined, pixel-perfect, keyboard-centric, utilizing semi-transparent overlays and subtle depth.
*   **Text Contrast Levels**:
    *   **Primary Text**: `#0f172a` (Slate-950) or `#111827` (Slate-900) for headers and core body text.
    *   **Secondary Text**: `#4b5563` (Slate-600) for secondary details and navigational links.
    *   **Muted Text**: `#9ca3af` (Slate-400) or `#6b7280` (Slate-500) for metadata and shortcut labels.
    *   **Interactive/Links**: `#5e6ad2` (Linear Brand Purple).
*   **Border Structure & Colors**:
    *   **Dividers/Borders**: `#f1f5f9` (Slate-100) or `#e2e8f0` (Slate-200).
    *   **Form Inputs**: `#e2e8f0` default; `#cbd5e1` on hover; `#5e6ad2` on focus (often accompanied by a 2px outline-offset or soft purple shadow).
    *   **Cards/Containers**: `#e2e8f0` with small border-radius (`6px` or `8px`).
*   **Card/Container Shading & Backgrounds**:
    *   **Page Background**: `#f7f8fa` (a cool, custom light gray/blue-gray that provides high contrast against white containers).
    *   **Card/Container Background**: `#ffffff` (Pure White, making cards pop out).
    *   **Hover/Select Background**: `#f1f5f9` (Slate-100) or `#f3f4f6`.
    *   **Elevation & Shadows**: Uses extremely soft, elegant shadows to denote depth:
        *   *Default Card*: `0 1px 2px rgba(0, 0, 0, 0.02), 0 4px 12px rgba(0, 0, 0, 0.03)`
        *   *Dropdowns/Modals*: `0 12px 30px rgba(0, 0, 0, 0.06), 0 4px 12px rgba(0, 0, 0, 0.03)`
*   **Accent Harmony**:
    *   **Primary Accent**: `#5e6ad2` (Linear Purple, representing active states, selection focus, and major actions).
    *   **Secondary Accent**: `#6b7280` (Medium Slate Gray) or `#f4f5f6` for secondary buttons.
    *   **Gradients**: Uses subtle top-to-bottom white-to-gray gradients on buttons: `linear-gradient(180deg, #ffffff 0%, #f9fafb 100%)` with a border.
*   **Status Colors**:
    *   **Success**: Text `#09825d` (Emerald); BG `#e6f7f0`; Border `#b2edd8`.
    *   **Error**: Text `#e5484d` (Linear Red); BG `#ffe8ec`; Border `#ffb8c5`.
    *   **Warning**: Text `#e99a1b` (Linear Amber); BG `#fff7e6`; Border `#fbe2a3`.
    *   **Info**: Text `#0090ff` (Blue) or `#5e6ad2` (Purple); BG `#e6f0ff`; Border `#b3d1ff`.

---

### 3. Stripe (Dashboard Design System)
*   **Design Philosophy**: Professional, high-density, mathematically precise, vibrant, clean dashboard structure with high information density.
*   **Text Contrast Levels**:
    *   **Primary Text**: `#30313d` (Dark slate-charcoal, softer than pure black to reduce eye strain).
    *   **Secondary Text**: `#697386` (Slate-gray) for subtitles, labels, and helper texts.
    *   **Muted Text**: `#8792a2` (Light slate) for timestamps, table column headers, and secondary labels.
    *   **Interactive/Links**: `#635bff` (Stripe Blurple).
*   **Border Structure & Colors**:
    *   **Dividers/Borders**: `#e3e8ee` (cool border gray) or `#f0f2f5`.
    *   **Form Inputs**: `#e3e8ee` default; `#c0c9d9` on hover; `#635bff` on focus with a glowing shadow: `0 0 0 3px rgba(99, 91, 255, 0.15)`.
    *   **Cards/Containers**: `#e3e8ee` with subtle box-shadows.
*   **Card/Container Shading & Backgrounds**:
    *   **Page Background**: `#f6f9fc` (very cool, crisp blue-gray).
    *   **Card/Container Background**: `#ffffff` (Pure White).
    *   **Hover/Select Background**: `#f6f9fc` or `#edf2f7`.
    *   **Elevation & Shadows**: Structured, multi-layered shadow offsets:
        *   *Card Shadow*: `0 1px 3px rgba(0, 0, 0, 0.08), 0 2px 5px rgba(0, 0, 0, 0.03)`
        *   *Popover/Modal*: `0 50px 100px -20px rgba(50, 50, 93, 0.25), 0 30px 60px -30px rgba(0, 0, 0, 0.3)`
*   **Accent Harmony**:
    *   **Primary Accent**: `#635bff` (Stripe Blurple for core actions and active selections).
    *   **Secondary Accent**: `#00d4b2` (Mint/Teal for financial increments or positive stats).
    *   **Gradients**: The dashboard uses solid colors, but primary buttons feature a slight gradient: `linear-gradient(180deg, #635bff 0%, #5951e5 100%)`.
*   **Status Colors**:
    *   **Success**: Text `#00875a` (Forest Green); BG `#e6f4ea`; Border `#a7f3d0`.
    *   **Error**: Text `#df1b41` (Stripe Red); BG `#fef2f2`; Border `#fecaca`.
    *   **Warning**: Text `#9a3412` (Amber-Brown); BG `#fffbeb`; Border `#fef3c7`.
    *   **Info**: Text `#635bff` (Blurple); BG `#eff6ff`; Border `#bfdbfe`.

---

### 4. Tailwind CSS (Tailwind UI Default Theme)
*   **Design Philosophy**: Utility-first, scale-based, highly balanced neutral palettes (Slate, Gray, Zinc) offering highly configurable variables.
*   **Text Contrast Levels**:
    *   **Primary Text**: `#111827` (Gray-900) or `#0f172a` (Slate-900) for standard layout headers.
    *   **Secondary Text**: `#374151` (Gray-700) or `#4b5563` (Gray-600) for paragraph text.
    *   **Muted Text**: `#6b7280` (Gray-500) or `#9ca3af` (Gray-400) for sub-metadata.
    *   **Interactive/Links**: `#4f46e5` (Indigo-600) or `#3b82f6` (Blue-500).
*   **Border Structure & Colors**:
    *   **Dividers/Borders**: `#f3f4f6` (Gray-100) or `#e5e7eb` (Gray-200).
    *   **Form Inputs**: `#d1d5db` (Gray-300) default; `#9ca3af` on hover; `#4f46e5` on focus with a ring wrapper.
    *   **Cards/Containers**: `#e5e7eb` (Gray-200) or `#cbd5e1` (Slate-300).
*   **Card/Container Shading & Backgrounds**:
    *   **Page Background**: `#f9fafb` (Gray-50) or `#f3f4f6` (Gray-100).
    *   **Card/Container Background**: `#ffffff` (Pure White).
    *   **Hover/Select Background**: `#f3f4f6` (Gray-100) or `#f9fafb`.
    *   **Elevation & Shadows**: Follows Tailwind's built-in shadow utility values:
        *   *Shadow-SM*: `0 1px 2px 0 rgba(0, 0, 0, 0.05)`
        *   *Shadow-MD*: `0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)`
*   **Accent Harmony**:
    *   **Primary Accent**: `#4f46e5` (Indigo-600) or `#3b82f6` (Blue-500).
    *   **Secondary Accent**: `#06b6d4` (Cyan-500) or `#10b981` (Emerald-500).
    *   **Gradients**: Highly integrated into badges and banners (e.g., Indigo `#4f46e5` to Violet `#7c3aed`).
*   **Status Colors**:
    *   **Success** (Emerald): Text `#047857` (Emerald-700); BG `#ecfdf5` (Emerald-50); Border `#a7f3d0` (Emerald-200).
    *   **Error** (Red): Text `#b91c1c` (Red-700); BG `#fef2f2` (Red-50); Border `#fecaca` (Red-200).
    *   **Warning** (Amber): Text `#b45309` (Amber-700); BG `#fffbeb` (Amber-50); Border `#fde68a` (Amber-200).
    *   **Info** (Blue): Text `#1d4ed8` (Blue-700); BG `#eff6ff` (Blue-50); Border `#bfdbfe` (Blue-200).

---

### 5. GitHub (Primer Design System)
*   **Design Philosophy**: Dense, developer-focused, highly structured, strict accessibility constraints, clear boundaries, and flat layouts.
*   **Text Contrast Levels**:
    *   **Primary Text**: `#1f2328` (GitHub Off-Black) for standard readables.
    *   **Secondary Text**: `#656d76` (GitHub Medium Gray) for breadcrumbs and minor tags.
    *   **Muted Text**: `#8c959f` (GitHub Light Gray) for line numbers, timestamps, and commit hashes.
    *   **Interactive/Links**: `#0969da` (Primer Blue).
*   **Border Structure & Colors**:
    *   **Dividers/Borders**: `#d0d7de` (Primer default border gray).
    *   **Form Inputs**: `#d0d7de` default; focus border `#0969da` with a soft blue ring: `0 0 0 3px rgba(9, 105, 218, 0.3)`.
    *   **Cards/Containers**: `#d0d7de` with a border-radius of `6px`.
*   **Card/Container Shading & Backgrounds**:
    *   **Page Background**: `#f6f8fa` (Canvas Background).
    *   **Card/Container Background**: `#ffffff` (Default Canvas).
    *   **Hover/Select Background**: `#f3f4f6` or `#eaeef2`.
    *   **Elevation & Shadows**: Minimal elevation. GitHub is mostly flat. Modals and dropdown overlays use a soft gray shadow: `0 8px 24px rgba(140, 149, 159, 0.2)`.
*   **Accent Harmony**:
    *   **Primary Accent**: `#1f2328` (Dark Charcoal) for secondary CTAs and `#2da44e` (Green) for primary actions (e.g., "New repository").
    *   **Secondary Accent**: `#0969da` (Primer Blue) for selection states and link decorations.
    *   **Gradients**: Rare, limited strictly to promotional cards or repository stars counters.
*   **Status Colors**:
    *   **Success**: Text `#1a7f37`; BG `#dafbe1`; Border `#8cd79b`.
    *   **Error**: Text `#cf222e`; BG `#ffebe9`; Border `#f1aeb5`.
    *   **Warning**: Text `#9a6700`; BG `#fff8c5`; Border `#e3b341`.
    *   **Info**: Text `#0969da`; BG `#ddf4ff`; Border `#54aeff`.

---

### 6. Framer (Framer UI)
*   **Design Philosophy**: Artistic, clean, canvas-like. Light mode features sharp borders, crisp contrasts, and dynamic layouts to facilitate high focus.
*   **Text Contrast Levels**:
    *   **Primary Text**: `#111111` (Nearly Pure Black).
    *   **Secondary Text**: `#666666` (Medium Charcoal) for canvas controls and toolbar labels.
    *   **Muted Text**: `#999999` (Light Slate) for shortcuts and empty state placeholders.
    *   **Interactive/Links**: `#0055ff` (Electric Blue).
*   **Border Structure & Colors**:
    *   **Dividers/Borders**: `#e3e3e3` or `#eeeeee`.
    *   **Form Inputs**: `#e5e5e5` default; `#cccccc` on hover; `#0055ff` on focus.
    *   **Cards/Containers**: `#e5e5e5` with `8px` or `12px` border-radius.
*   **Card/Container Shading & Backgrounds**:
    *   **Page Background**: `#f5f5f5` (Neutral Gray canvas background).
    *   **Card/Container Background**: `#ffffff` (White container grids).
    *   **Hover/Select Background**: `#f0f0f0` or `#e8e8e8`.
    *   **Elevation & Shadows**: Uses modern, smooth shadows:
        *   *Floating Popover*: `0 1px 3px rgba(0, 0, 0, 0.05), 0 10px 20px -5px rgba(0, 0, 0, 0.08)`
*   **Accent Harmony**:
    *   **Primary Accent**: `#0055ff` (Electric Blue for active selection handlers, nodes, and buttons).
    *   **Secondary Accent**: `#000000` (Pure Black buttons) or brand gradients.
    *   **Gradients**: Often uses rich purple/pink-to-blue gradients (`#ff007f` to `#7f00ff`) for pro status items.
*   **Status Colors**:
    *   **Success**: Text `#008f5d`; BG `#e2f6f0`; Border `#b2edd8`.
    *   **Error**: Text `#eb3b5a`; BG `#ffe8ec`; Border `#ffb8c5`.
    *   **Warning**: Text `#d97706`; BG `#fffbeb`; Border `#fef3c7`.
    *   **Info**: Text `#0055ff`; BG `#e6f0ff`; Border `#b3d1ff`.

---

### 7. Figma (Figma UI)
*   **Design Philosophy**: Tool-based, structural, highly dense, keeping the interface as neutral and thin as possible to make the user's canvas elements pop out.
*   **Text Contrast Levels**:
    *   **Primary Text**: `#2c2c2c` (Soft off-black to prevent eye fatigue during long sessions).
    *   **Secondary Text**: `#757575` (Medium Gray) for properties labels and unit guides.
    *   **Muted Text**: `#b3b3b3` (Light Gray) for disabled settings and keyboard guidelines.
    *   **Interactive/Links**: `#0c8de4` (Figma Blue).
*   **Border Structure & Colors**:
    *   **Dividers/Borders**: `#e6e6e6` (subtle border lines, exactly 1px).
    *   **Form Inputs**: `#e6e6e6` default; focus `#0c8de4` with a tight glowing box-shadow: `0 0 0 2px rgba(12, 141, 228, 0.3)`.
    *   **Cards/Containers**: `#e6e6e6` with flat edges (0px or 4px radius).
*   **Card/Container Shading & Backgrounds**:
    *   **Page Background**: `#f5f5f5` (panel sidebar) or `#e5e5e5` (default canvas background).
    *   **Card/Container Background**: `#ffffff` (active panels and context menus).
    *   **Hover/Select Background**: `#f0f0f0` or `#e5f4ff` (light blue select overlay).
    *   **Elevation & Shadows**: Very flat. Drop-shadows are reserved for popovers, dropdown lists, or layers menus: `0 2px 4px rgba(0, 0, 0, 0.1), 0 8px 16px rgba(0, 0, 0, 0.05)`.
*   **Accent Harmony**:
    *   **Primary Accent**: `#0c8de4` (Figma Blue for selected item boundaries and active tabs).
    *   **Secondary Accent**: Multiplayer cursor accents (`#ff7262` for orange, `#10b981` for green).
    *   **Gradients**: Standard interface uses flat solid values exclusively.
*   **Status Colors**:
    *   **Success**: `#10b981` (Green).
    *   **Error**: `#f24822` (Figma Red).
    *   **Warning**: `#ffcd29` (Figma Yellow).
    *   **Info**: `#0c8de4` (Figma Blue).

---

### 8. Notion (Notion UI)
*   **Design Philosophy**: Document-first, warm, human, organic, and clean. Relies on warm undertones, soft edges, and pastel highlights.
*   **Text Contrast Levels**:
    *   **Primary Text**: `#37352f` (Warm charcoal/dark ash - highly distinctive and easy to read).
    *   **Secondary Text**: `#787774` (Warm medium gray).
    *   **Muted Text**: `#acaba9` (Warm light gray).
    *   **Interactive/Links**: `#2383e2` (Notion blue link).
*   **Border Structure & Colors**:
    *   **Dividers/Borders**: `rgba(55, 53, 47, 0.09)` or `#e9e9e8`.
    *   **Form Inputs**: `#e9e9e8` default; focus ring is `rgba(35, 131, 226, 0.5)` with `0 0 0 3px` overlay.
    *   **Cards/Containers**: `#e9e9e8` or transparent borders.
*   **Card/Container Shading & Backgrounds**:
    *   **Page Background**: `#ffffff` (Pure white main page canvas).
    *   **Card/Container Background**: `#f7f7f5` (Warm off-white/gray for sidebars, callout blocks, and tables).
    *   **Hover/Select Background**: `rgba(55, 53, 47, 0.04)` (hover) or `rgba(55, 53, 47, 0.08)` (active selection).
    *   **Elevation & Shadows**: Minimal. Dropdowns use a very light shadow: `0 1px 2px rgba(15, 15, 15, 0.1), 0 3px 6px rgba(15, 15, 15, 0.05)`.
*   **Accent Harmony**:
    *   **Primary Accent**: `#37352f` (Charcoal) or `#2383e2` (Notion Blue).
    *   **Secondary Accent**: Pastel accent blocks: `#f1f1ef` (gray), `#f3e5e8` (red), `#faebdd` (orange), `#fbf3db` (yellow), `#ddf3df` (green), `#eae4f2` (purple).
    *   **Gradients**: None. All highlights are solid pastel colors.
*   **Status Colors**:
    *   **Success**: Text `#0f7b4e`; BG `#edf7ed`; Border `#c3e6cb`.
    *   **Error**: Text `#eb5757`; BG `#fdf2f2`; Border `#f5c2c2`.
    *   **Warning**: Text `#df8b00`; BG `#fff9e6`; Border `#ffe89c`.
    *   **Info**: Text `#2383e2`; BG `#f2f7fc`; Border `#c3dbf1`.

---

### 9. Slack (Slack Light UI)
*   **Design Philosophy**: Friendly, highly collaborative, highly active sidebar colors (Eggplant purple) combined with a clean message pane.
*   **Text Contrast Levels**:
    *   **Primary Text**: `#1d1c1d` (Soft off-black).
    *   **Secondary Text**: `#616061` (Medium Charcoal Gray).
    *   **Muted Text**: `#868686` (Light Gray) for user status indicators, timestamps, and attachment details.
    *   **Interactive/Links**: `#1264a3` (Slack Link Blue).
*   **Border Structure & Colors**:
    *   **Dividers/Borders**: `rgba(29, 28, 29, 0.13)` or `#e2e2e2`.
    *   **Form Inputs**: `#868686` default; focus `#1264a3` with `0 0 0 3px rgba(18, 100, 163, 0.25)`.
    *   **Cards/Containers**: `#e2e2e2` with `8px` corner radii.
*   **Card/Container Shading & Backgrounds**:
    *   **Page Background**: `#ffffff` (messages area) or `#f8f8f8` (activity panels).
    *   **Card/Container Background**: `#f8f8f8` (thread blocks and side-panel feeds).
    *   **Hover/Select Background**: `#f8f8f8` (item hover) or `#e2e2e2` (keyboard focus).
    *   **Elevation & Shadows**: Uses soft shadows for overlay components:
        *   *Dropdown Overlay*: `0 5px 15px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.02)`
*   **Accent Harmony**:
    *   **Primary Accent**: `#4a154b` (Aubergine/Eggplant Purple - primary brand sidebar color).
    *   **Secondary Accent**: `#36c5f0` (Sky Blue), `#ecb22e` (Yellow), `#e01e5a` (Red/Pink), `#2eb67d` (Green).
    *   **Gradients**: Rare, limited strictly to branding banners.
*   **Status Colors**:
    *   **Success**: Text `#2eb67d`; BG `#e8f8f1`; Border `#b7ead2`.
    *   **Error**: Text `#e01e5a`; BG `#fde8ee`; Border `#f9b9cd`.
    *   **Warning**: Text `#ecb22e`; BG `#fef7e6`; Border `#fbe2a3`.
    *   **Info**: Text `#1264a3`; BG `#e7f0f6`; Border `#b3d1e6`.

---

### 10. Shopify (Polaris Design System)
*   **Design Philosophy**: Merchant-focused, structured, transactional, and highly accessible. Designed to inspire confidence and ease of use.
*   **Text Contrast Levels**:
    *   **Primary Text**: `#202223` (Charcoal Black, offering high compliance with WCAG AA/AAA).
    *   **Secondary Text**: `#6d7175` (Slate Medium Gray) for minor summaries and help texts.
    *   **Muted Text**: `#8c9196` (Light Gray) for column headings and disabled actions.
    *   **Interactive/Links**: `#008060` (Shopify Green) or `#005ea2` (Blue).
*   **Border Structure & Colors**:
    *   **Dividers/Borders**: `#e1e3e5` (neutral grey divider).
    *   **Form Inputs**: `#8c9196` default; focus `#008060` or `#006fbb` (Blue).
    *   **Cards/Containers**: `#e1e3e5` border with `8px` or `12px` border-radius.
*   **Card/Container Shading & Backgrounds**:
    *   **Page Background**: `#f6f6f7` (Merchant Light Gray, providing a distinct background layout).
    *   **Card/Container Background**: `#ffffff` (Pure white cards stack on the light gray background).
    *   **Hover/Select Background**: `#f1f2f4` (hover item) or `#e4e6e7` (active item).
    *   **Elevation & Shadows**: Uses Polaris structural shadows:
        *   *Shadow-100 (Default Card)*: `0 1px 3px rgba(0, 0, 0, 0.1)`
        *   *Shadow-200 (Active/Floating)*: `0 3px 6px rgba(0, 0, 0, 0.15)`
*   **Accent Harmony**:
    *   **Primary Accent**: `#008060` (Shopify Green, conveying success, growth, and trust).
    *   **Secondary Accent**: `#005ea2` (Blue) or `#47c1bf` (Teal).
    *   **Gradients**: Flat colors only to avoid distracting the merchant.
*   **Status Colors**:
    *   **Success**: Text `#008060`; BG `#e2f1eb`; Border `#a3d1c2`.
    *   **Error**: Text `#d82c0d` (Shopify Red); BG `#fff4f2`; Border `#ffd0c8`.
    *   **Warning**: Text `#916a00` (Amber); BG `#fff8e5`; Border `#ffe29a`.
    *   **Info**: Text `#005ea2`; BG `#f0f4f8`; Border `#cbd6e2`.

---

### 11. GitLab (Pajamas Design System)
*   **Design Philosophy**: Open-source, highly detailed, technically dense, and accessibility-first.
*   **Text Contrast Levels**:
    *   **Primary Text**: `#333333` (Neutral Charcoal).
    *   **Secondary Text**: `#5c5c5c` (Medium Gray).
    *   **Muted Text**: `#707070` (Light Gray) or `#89888d`.
    *   **Interactive/Links**: `#1068bf` (GitLab Blue).
*   **Border Structure & Colors**:
    *   **Dividers/Borders**: `#dbdbdb` (Pajamas Neutral Border Gray).
    *   **Form Inputs**: `#89888d` default; `#1068bf` on focus.
    *   **Cards/Containers**: `#dbdbdb` with `4px` or `6px` border-radius.
*   **Card/Container Shading & Backgrounds**:
    *   **Page Background**: `#fafafa` (Neutral Page Canvas).
    *   **Card/Container Background**: `#ffffff` (White container panels).
    *   **Hover/Select Background**: `#ececef` or `#f2f2f5`.
    *   **Elevation & Shadows**: Flat-oriented. Dropdowns and modal overlays use light shadow: `0 2px 4px rgba(0, 0, 0, 0.1)`.
*   **Accent Harmony**:
    *   **Primary Accent**: `#e24329` (GitLab Orange brand color for logos) and `#1068bf` (Blue for primary UI actions).
    *   **Secondary Accent**: `#6b4fbb` (Purple).
    *   **Gradients**: Strictly solid colors in the app dashboard.
*   **Status Colors**:
    *   **Success**: Text `#108548`; BG `#ecfbf3`; Border `#c3f2d6`.
    *   **Error**: Text `#dd2b0e`; BG `#fff5f5`; Border `#fcc5bc`.
    *   **Warning**: Text `#8f4700`; BG `#fdf3e6`; Border `#fad3ad`.
    *   **Info**: Text `#1068bf`; BG `#eff6fb`; Border `#cbe1f5`.

---

### 12. Intercom (Canvas Design System)
*   **Design Philosophy**: Friendly, modern, conversational, customer-centric, utilizing high-contrast blue actions and generous border radii.
*   **Text Contrast Levels**:
    *   **Primary Text**: `#282e38` (Slate Charcoal, very professional).
    *   **Secondary Text**: `#65758c` (Slate Gray) for subheaders and navigation options.
    *   **Muted Text**: `#8d9bb0` (Light Blue-Gray) for chat bubble time indicators and hints.
    *   **Interactive/Links**: `#0057ff` (Intercom Electric Blue).
*   **Border Structure & Colors**:
    *   **Dividers/Borders**: `#eceef2` or `#e3e6eb` (cool borders).
    *   **Form Inputs**: `#d4d8e0` default; `#0057ff` on focus with a glowing ring: `0 0 0 3px rgba(0, 87, 255, 0.25)`.
    *   **Cards/Containers**: `#eceef2` with `12px` or `16px` border-radius.
*   **Card/Container Shading & Backgrounds**:
    *   **Page Background**: `#f4f6f8` (warm slate/gray-blue).
    *   **Card/Container Background**: `#ffffff` (White container panels).
    *   **Hover/Select Background**: `#f0f3f6`.
    *   **Elevation & Shadows**: Uses extremely soft, cloud-like shadows:
        *   *Card Shadow*: `0 2px 5px rgba(0, 0, 0, 0.02), 0 12px 30px rgba(0, 0, 0, 0.04)`
*   **Accent Harmony**:
    *   **Primary Accent**: `#0057ff` (Intercom Blue).
    *   **Secondary Accent**: `#1fb6ff` (Light Sky Blue) or `#00c5a3` (Teal).
    *   **Gradients**: Often integrates blue-to-violet gradients (`#0057ff` to `#7f00ff`) in widget headers.
*   **Status Colors**:
    *   **Success**: Text `#00875a`; BG `#e3fcef`; Border `#abf5d1`.
    *   **Error**: Text `#de350b`; BG `#ffebe6`; Border `#ffbdad`.
    *   **Warning**: Text `#ff8b00`; BG `#fffae6`; Border `#ffe380`.
    *   **Info**: Text `#0052cc`; BG `#deebff`; Border `#b3d4ff`.

---

### 13. Atlassian (Atlassian Design System - ADS)
*   **Design Philosophy**: Enterprise-grade, clean, structural, and strictly accessible (designed for large-scale workflows like Jira and Confluence).
*   **Text Contrast Levels**:
    *   **Primary Text**: `#172b4d` (Atlassian Navy/Slate-900).
    *   **Secondary Text**: `#42526e` (Slate-700) for UI labels and titles.
    *   **Muted Text**: `#6b778c` (Slate-500) for timestamps and breadcrumbs.
    *   **Interactive/Links**: `#0052cc` (Atlassian Blue).
*   **Border Structure & Colors**:
    *   **Dividers/Borders**: `#dfe1e6` (neutral border light grey).
    *   **Form Inputs**: `#dfe1e6` default; `#4c9aff` or `#0052cc` on focus.
    *   **Cards/Containers**: `#dfe1e6` with `4px` border-radius.
*   **Card/Container Shading & Backgrounds**:
    *   **Page Background**: `#fafbfc` (very light greyish-blue).
    *   **Card/Container Background**: `#ffffff` (White container panels).
    *   **Hover/Select Background**: `#ebecf0`.
    *   **Elevation & Shadows**: Uses elevation constants:
        *   *elevation.card*: `0 1px 1px rgba(9, 30, 66, 0.25), 0 0 1px rgba(9, 30, 66, 0.31)`
        *   *elevation.overlay*: `0 8px 16px -4px rgba(9, 30, 66, 0.25), 0 0 1px rgba(9, 30, 66, 0.31)`
*   **Accent Harmony**:
    *   **Primary Accent**: `#0052cc` (Atlassian Blue).
    *   **Secondary Accent**: `#00875a` (Green) or `#00a3bf` (Teal).
    *   **Gradients**: Rare; interface uses solid colors to maintain strict accessibility standards.
*   **Status Colors**:
    *   **Success**: Text `#006644`; BG `#e3fcef`; Border `#abf5d1`.
    *   **Error**: Text `#bf2600`; BG `#ffebe6`; Border `#ffbdad`.
    *   **Warning**: Text `#a36a00`; BG `#fffae6`; Border `#ffe380`.
    *   **Info**: Text `#0052cc`; BG `#deebff`; Border `#b3d4ff`.

---

## 2. Summary of Color Codes & Ranges

The following table summarizes the light mode color patterns observed across these 13 leading web applications:

| Application | Primary Text | Secondary Text | Divider/Border | Page Background | Card Background | Primary Accent |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Vercel** | `#000000` | `#444444` | `#eaeaea` | `#ffffff` | `#ffffff` | `#000000` |
| **Linear** | `#0f172a` | `#4b5563` | `#e2e8f0` | `#f7f8fa` | `#ffffff` | `#5e6ad2` |
| **Stripe** | `#30313d` | `#697386` | `#e3e8ee` | `#f6f9fc` | `#ffffff` | `#635bff` |
| **Tailwind CSS** | `#111827` | `#4b5563` | `#e5e7eb` | `#f9fafb` | `#ffffff` | `#4f46e5` |
| **GitHub** | `#1f2328` | `#656d76` | `#d0d7de` | `#f6f8fa` | `#ffffff` | `#1f2328` / `#2da44e` |
| **Framer** | `#111111` | `#666666` | `#e5e5e5` | `#f5f5f5` | `#ffffff` | `#0055ff` |
| **Figma** | `#2c2c2c` | `#757575` | `#e6e6e6` | `#f5f5f5` | `#ffffff` | `#0c8de4` |
| **Notion** | `#37352f` | `#787774` | `#e9e9e8` | `#ffffff` | `#f7f7f5` | `#37352f` / `#2383e2` |
| **Slack** | `#1d1c1d` | `#616061` | `#e2e2e2` | `#ffffff` | `#f8f8f8` | `#4a154b` |
| **Shopify** | `#202223` | `#6d7175` | `#e1e3e5` | `#f6f6f7` | `#ffffff` | `#008060` |
| **GitLab** | `#333333` | `#5c5c5c` | `#dbdbdb` | `#fafafa` | `#ffffff` | `#1068bf` / `#e24329` |
| **Intercom** | `#282e38` | `#65758c` | `#eceef2` | `#f4f6f8` | `#ffffff` | `#0057ff` |
| **Atlassian** | `#172b4d` | `#42526e` | `#dfe1e6` | `#fafbfc` | `#ffffff` | `#0052cc` |

---

## 3. Identified Patterns and Best Practices for TalentFlow

For an AI-powered resume and recruitment application like **TalentFlow**, the interface must feel clean, highly legible, modern, and trust-inspiring. It should handle complex content like resume parses, candidate metrics, and email communication without causing visual fatigue. 

Based on the research above, here are the core patterns and recommendations for the **TalentFlow Light Mode** design:

### A. Text Contrast & Typography Hierarchy (Readability first)
*   **Avoid pure black text** (`#000000`) for the primary body font, as it causes eye strain on bright white backgrounds.
*   **Recommended Primary Text**: A rich slate charcoal like `#0f172a` (Slate-950) or `#1e293b` (Slate-800). This provides excellent contrast (well above the WCAG 4.5:1 ratio) while looking softer and more polished.
*   **Recommended Secondary Text**: A medium slate gray like `#475569` (Slate-600) for labels, secondary subtitles, and table attributes.
*   **Recommended Muted Text**: `#94a3b8` (Slate-400) or `#64748b` (Slate-500) for secondary metadata, date markers, and empty input placeholders.

### B. Background Layering & Shading (The Layering Pattern)
*   **Recommended Layout Structure**: Adopt the **Linear / Stripe / Shopify** page stacking model:
    *   **Canvas/Page Background**: Use a cool, off-white/light blue-gray like `#f8fafc` (Slate-50) or `#f6f8fa` (GitHub Canvas).
    *   **Container/Card Background**: Pure white `#ffffff`. Cards, tables, and detail panels will pop out visually, creating a natural vertical grid hierarchy.
    *   **Sidebar Background**: Use `#ffffff` or a slightly darker sidebar tone like `#f1f5f9` (Slate-100) or a deep, rich brand color (like Slack) if you want high sidebar separation.
*   **Elevation Shadows**: Use extremely soft, multi-stop shadows to prevent cards from looking blocky:
    *   *Cards*: `box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.02);`
    *   *Modals/Dropdowns*: `box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -2px rgba(0, 0, 0, 0.03);`

### C. Borders, Dividers, and Inputs (Boundary Structure)
*   **Dividers**: Keep layout borders very thin and light to prevent clutter. Use `1px solid #e2e8f0` (Slate-200) or `1px solid #f1f5f9` (Slate-100).
*   **Form Inputs**:
    *   *Default State*: `#cbd5e1` (Slate-300) or `#d1d5db` (Gray-300).
    *   *Hover State*: `#94a3b8` (Slate-400).
    *   *Focus State*: Primary brand color (e.g., `#4f46e5` or `#635bff`) with a soft glow ring: `box-shadow: 0 0 0 3px rgba(99, 91, 255, 0.15)`.

### D. Accent Harmony (Brand Alignment)
*   **Primary Brand Accent**: Choose a color that indicates security, capability, and intelligence:
    *   *Indigo/Purple option*: `#635bff` (Stripe Blurple) or `#4f46e5` (Indigo-600) works exceptionally well for tech-forward HR systems.
    *   *Teal/Emerald option*: `#0d9488` (Teal-600) or `#008060` (Shopify Green) conveys growth and fits recruitment well.
*   **Secondary Buttons**: Follow the Stripe/Linear pattern. Use a light gradient white-to-gray button background with a subtle border:
    *   `background: linear-gradient(180deg, #ffffff, #f8fafc); border: 1px solid #cbd5e1;`

### E. Status Indicators (The Tinted Badge Pattern)
In recruitment, visualizing status is critical (e.g., "Hired", "Rejected", "Reviewing", "Contacted"). Use the **Tinted Badge Pattern** (light background, matching border, dark text) to ensure readability and clear meaning:

*   **Success (Hired / Accepted)**:
    *   *Background*: `#ecfdf5` (Emerald-50)
    *   *Border*: `#a7f3d0` (Emerald-200)
    *   *Text*: `#047857` (Emerald-700)
*   **Error / Danger (Rejected / Archived)**:
    *   *Background*: `#fef2f2` (Red-50)
    *   *Border*: `#fecaca` (Red-200)
    *   *Text*: `#b91c1c` (Red-700)
*   **Warning (Pending / Interviewing)**:
    *   *Background*: `#fffbeb` (Amber-50)
    *   *Border*: `#fde68a` (Amber-200)
    *   *Text*: `#b45309` (Amber-700)
*   **Info (Applied / Screening)**:
    *   *Background*: `#eff6ff` (Blue-50)
    *   *Border*: `#bfdbfe` (Blue-200)
    *   *Text*: `#1d4ed8` (Blue-700)
