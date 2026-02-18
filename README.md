# Store Sales Tracker

A simple web app to track store sales – add items, see today's and monthly totals, view history in a calendar, and print lists.

## Access on your phone

Once you upload this to GitHub and enable GitHub Pages, you can use the app from any device (including your phone) at:

**`https://YOUR_USERNAME.github.io/sales/`**

---

## How to upload to GitHub

### 1. Install Git (if needed)
Download: https://git-scm.com/download/win

### 2. Open a terminal in the sales folder
Right‑click the `sales` folder → **Open in Terminal** (or **Open PowerShell here**)

### 3. Initialize and commit

```bash
git init
git add .
git commit -m "Initial commit - Store Sales Tracker"
```

### 4. Create a new repo on GitHub
- Go to https://github.com/new
- Name it: **sales**
- Leave it empty (no README, no .gitignore)
- Create the repository

### 5. Push your code

```bash
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/sales.git
git push -u origin main
```
(Replace `YOUR_USERNAME` with your GitHub username)

### 6. Turn on GitHub Pages
- On your repo page: **Settings** → **Pages**
- Under **Source**: choose **Deploy from a branch**
- Under **Branch**: choose **main** and **/ (root)**
- Click **Save**

After a minute or two, your app will be at:
**`https://YOUR_USERNAME.github.io/sales/`**

You can bookmark that URL on your phone and use it anywhere.

---

## Note about data

The app uses **localStorage** in the browser. That means:
- Data is saved per device/browser
- Your phone and computer will have separate data
- Clearing browser data will clear the sales history
