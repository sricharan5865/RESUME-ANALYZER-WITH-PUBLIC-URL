# 🚀 Antigravity ↔ Figma Live Plugin Bridge

A bidirectional live synchronization bridge connecting **Antigravity AI** directly to your **Figma canvas**. 

With this bridge:
1. **Antigravity Requests Designs**: Antigravity sends component specifications (cards, dashboards, tables, modals) to Figma, and Figma instantly renders pixel-perfect AutoLayout frames with colors, typography, badges, and buttons.
2. **Figma Exports to Antigravity**: Select any frame or layer in Figma and click **Export Selection** to immediately send the design structure and auto-generated **React + Tailwind CSS** code back into your codebase.

---

## 🛠️ Step-by-Step Setup Guide

### Step 1: Open Any File in Figma
1. Open the **Figma Desktop app** or **Figma in your browser** (Chrome / Edge / Brave).
2. Open any existing design file, or click **New design file** (the blue `+ Design file` button in the top right).

> **Important**: The *Plugins* menu is only accessible **inside an open design canvas**, not from the file browser / recents home screen!

---

### Step 2: Import the Plugin Manifest
1. In the top-left toolbar inside your open design file, click the **Figma Main Menu (F icon)** or **Resources (Shift + I)**.
2. Go to: **Plugins** ➔ **Development** ➔ **Import plugin from manifest...**
3. In the file picker dialog, navigate to and select:
   ```
   C:\Users\sri charan\Documents\Projects\hr recruter\figma-bridge\plugin\manifest.json
   ```
4. Click **Open**.

---

### Step 3: Run the Plugin
1. Under **Plugins ➔ Development**, click **Antigravity Bridge** (or press **Run**).
2. A sleek floating window will appear on your canvas showing:
   - 🟢 `Connected` status badge (connected to `ws://localhost:3055`).
   - Quick Render preset buttons.
   - **Export Selection to Antigravity (React)** button.

---

## 🎨 Testing the Bridge

### Option A: From the Figma Plugin Window
Click any quick preset button inside the plugin UI:
- **📇 Candidate Card** – Draws a rich candidate profile card.
- **📊 Full Dashboard** – Draws a recruiter hub with navigation, 4 KPI metric cards, and top candidate recommendations.
- **📋 Data Table** – Draws a candidate pipeline table with badges and status tags.
- **🗓️ Interview Modal** – Draws a modal dialog for scheduling assessments.

### Option B: From the Terminal / Antigravity
Run the CLI script to command Figma to draw any layout:
```bash
cd "C:\Users\sri charan\Documents\Projects\hr recruter\figma-bridge"

# Send candidate card
node send-design.js

# Send full recruiter dashboard
node send-design.js dashboard

# Send candidate data table
node send-design.js table

# Send interview modal
node send-design.js modal
```

### Option C: From the Web Dashboard
Open `http://localhost:3055` in your browser to view the interactive control panel, trigger designs, and inspect live exported React JSX code!

---

## 📤 Exporting Figma Canvas to React Code

1. In Figma, select any frame or component on your canvas.
2. Click **Export Selection to Antigravity (React)** in the plugin window.
3. The bridge server immediately captures the layer hierarchy and generates clean **React + Tailwind CSS** code ready for your application.
