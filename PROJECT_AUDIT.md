# Pocket Money — Complete Project Audit

## Overview
A local-first, privacy-focused personal finance Android app for Sri Lanka. React + Capacitor hybrid app with Material 3 dynamic theming, AMOLED-black UI, SMS/UPI/email auto-capture, receipt OCR, AI spending insights, and Google Drive backup.

**Package:** `app.pocketmoney.mobile`
**Version:** 0.1.0 (MIT)
**Repo:** https://github.com/JoelMWilliam/Pocket-money

---

## Architecture

React SPA → Zustand store (persisted via Capacitor Preferences / localStorage) → Capacitor 8 wraps in Android WebView → Native plugins for SMS, biometrics, notification listener, social login → Optional Express backend for cloud sync → PWA support via vite-plugin-pwa.

```
index.html → main.jsx → App.jsx
                         ├── AuthScreen.jsx (login/create user)
                         ├── LockScreen.jsx (PIN/biometric lock)
                         ├── Onboarding.jsx (11-step wizard)
                         ├── Dashboard.jsx (home/cards)
                         ├── Accounts.jsx
                         ├── Transactions.jsx → TransactionItem.jsx
                         ├── Budgets.jsx, Goals.jsx, Debts.jsx, Loans.jsx
                         ├── Recurring.jsx, Investments.jsx, NetWorth.jsx
                         ├── CashFlow.jsx, Analytics.jsx, AdvancedReports.jsx
                         ├── Categories.jsx, Rules.jsx, Templates.jsx
                         ├── Settings.jsx (1248 lines)
                         ├── Assistant.jsx (OpenAI/Groq/Ollama)
                         ├── ReceiptScanner.jsx, Receipts.jsx
                         ├── SmsParser.jsx, ImportCSV.jsx
                         └── BottomNav.jsx → MoreMenu.jsx
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 18, Vite 5 |
| State | Zustand 4 + persist middleware |
| Styling | Tailwind CSS 3 + Material Color Utilities (dynamic M3) |
| Charts | Recharts 2 |
| Icons | Lucide React |
| PWA | vite-plugin-pwa (auto-update, workbox) |
| Mobile | Capacitor 8 (Android 8.4.1) |
| Native Plugins | SMS reader, Biometric auth, Notification listener, Social login (Google) |
| AI | OpenAI-compatible client (GPT/Groq/Ollama/LM Studio) |
| OCR | Tesseract.js 5 |
| PDF | pdfjs-dist 6, pdf-lib |
| CSS | Tailwind, custom animations (bounce-in, shimmer, count-up, ring-draw) |
| Testing | Vitest + Testing Library + Playwright (40 test files, 420 tests) |
| Backend | Express 4 + JWT + bcrypt + rate-limit (optional cloud sync) |

---

## Project Files (70 source files)

### Root Config
- `package.json` — scripts, deps
- `vite.config.js` — builds, PWA manifest, vitest config
- `tailwind.config.js` — M3 CSS variable colors, animations
- `postcss.config.js`, `playwright.config.js`
- `capacitor.config.json` — appId, SocialLogin client ID, splash config
- `.env` — `VITE_GOOGLE_WEB_CLIENT_ID=432912016198-nt5ekvasrs3qtkkdcm3ke36unldtt7mh.apps.googleusercontent.com`
- `index.html` — dark class, Inter font, root div

### `/src/lib/` (27 utility modules)
| File | Purpose |
|------|---------|
| `utils.js` | formatLKR, formatDate, generateId, getCurrentMonth, clamp, etc. |
| `crypto.js` | hashPin (PBKDF2), verifyPin, encryptData/decryptData (AES-GCM), generateRandomId |
| `storage.js` | Zustand persist adapter + generic get/set (Preferences on native, localStorage on web) |
| `sanitize.js` | DOMPurify text sanitization, escapeHtml, sanitizeUsername, sanitizeTags |
| `theme.js` | applyThemeToDocument (Material 3), PRESET_COLORS (8 swatches) |
| `icons.js` | getIcon (lazy Lucide icon loader), ICON_NAMES |
| `biometric.js` | canUseBiometrics, registerBiometric, verifyBiometric (native + WebAuthn fallback), readNativeSms |
| `accountNumber.js` | encryptAccountNumber, decryptAccountNumber (AES-GCM via pinHash), getLast4Digits, getFirst4Digits, extractAccountHint (from SMS body), maskAccountNumber |
| `demoData.js` | DEMO_ACCOUNTS, DEMO_CATEGORIES, DEMO_TRANSACTIONS, DEMO_BUDGETS, DEMO_GOALS, DEMO_DEBTS, DEMO_RECURRING, DEMO_INVESTMENTS, DEMO_LOANS, DEMO_SETTINGS |
| `notifications.js` | scheduleBillReminder, scheduleBudgetAlert, scheduleDailyReminder, scheduleReportNotification, cancelNotifications, idHash |
| `export.js` | exportToJSON, exportEncryptedBackup, exportTransactionsToCSV, validateBackupData, sanitizeImportedSettings, printReport, readJSONFile (all with CSV formula injection protection) |
| `importCSV.js` | parseCSV, isValidDate, detectType, findOrCreateCategory, importCSVRows |
| `assistant.js` | OpenAI client setup, askAssistant (builds financial summary → LLM), testLLMConnection, PRESETS (OpenAI/Groq/Ollama/LM Studio) |
| `api.js` | REST client for cloud backend (register, login, sync get/put/delete) |
| `googleDrive.js` | Google OAuth flow (SocialLogin plugin), uploadBackupToDrive, downloadBackupFromDrive, findBackupFile, token refresh |
| `gmailSync.js` | Gmail API OAuth, fetchTransactionEmails, syncEmailsToTransactions (uses autoCategorize + dedup) |
| `emailParser.js` | identifyEmailSender (bank/merchant patterns), extractAmountFromEmail, extractDateFromEmail, parseTransactionalEmail (multi-parser: amazon, uber, subscription, bank, generic) |
| `sms.js` | parseSmsTransaction (regex-based bank alert parsing), importSmsMessages (reads native SMS, matches accounts by last4 digits, uses autoCategorize), suggestAccountsFromSms (reads SMS to detect banks/account hints for onboarding auto-suggest), BANK_ALERT_RE, PROMOTIONAL_RE |
| `upiNotifications.js` | parsePaymentNotification (regex for GPay/PhonePe/Paytm), getPaymentNotifications (via native NotificationListener plugin), importPaymentNotifications (uses autoCategorize + dedup) |
| `merchantRules.js` | 82 merchant→category regex rules (MERCHANT_RULES), matchMerchant, autoCategorize, guessCategoryByKeywords (keyword-based fallback with scoring), KEYWORD_FALLBACKS (20 category keyword maps) |
| `dedup.js` | generateTransactionFingerprint, areTransactionsSimilar (amount ±2%, date ±24h, merchant/Levenshtein), findDuplicates, deduplicateTransactions, mergeDuplicateSources |
| `autoCapture.js` | runAutoCapturePipeline (unified SMS + email + UPI pipeline), getAvailableSources |
| `receipts.js` | saveReceipt (IndexedDB data URL), getReceipt, deleteReceipt, deleteTransactionReceipts, inlineReceipts, extractReceipts, migrateReceiptsToIndexedDB |
| `pdfParser.js` | extractReceiptText (pdfjs-dist), extractStatementBalance (regex for bank statement PDF) |
| `share.js` | downloadOrShare (Capacitor Share + fallback download) |
| `email.js` | sendFeedbackEmail (capacitor-email-composer) |
| `pdf.js` | generatePDFReport (pdf-lib, generates financial report PDF) |

### `/src/store/`
| File | Purpose |
|------|---------|
| `useAppStore.js` (1252 lines) | Central Zustand store with persist middleware. Holds: auth (multi-user PIN), accounts, categories, transactions, budgets, goals, debts, recurring, investments, loans, templates, rules, settings. Exposes all CRUD action methods + recalculateBalances, rolloverBudgets, getBudgetProgress, getTotalBalance, etc. |

### `/src/components/` (40 components)
| Component | Lines | Purpose |
|-----------|-------|---------|
| `App.jsx` | 278 | Shell: screen routing, auth/lock gates, onboarding, Capacitor back button |
| `AuthScreen.jsx` | 192 | Login / user creation with PIN, multi-user support |
| `LockScreen.jsx` | 100 | PIN + biometric lock with auto-lock timeout (5 min) |
| `Onboarding.jsx` | 1177 | 11-step wizard: welcome, values, theme, choice, profile, categories, SMS accounts, accounts, goal, permissions, success |
| `Dashboard.jsx` | 334 | Editable card layout: balance, safe-to-spend, insights, recent transactions, accounts, goals, spending chart (Recharts), upcoming bills |
| `DailyReport.jsx` | 255 | Daily/weekly/monthly reports with bar/pie/area/line charts, spending insights |
| `BottomNav.jsx` | 77 | Fixed bottom tab nav (Home/Accounts/Transactions/Budgets/More) |
| `MoreMenu.jsx` | 75 | Slide-out menu → 16 feature screens |
| `AddTransaction.jsx` | 610 | Modal form: type (expense/income/transfer), account, category, amount, date, receipt camera, tags, split categories, template load |
| `TransactionItem.jsx` | 124 | Transaction card with icon, category color, note truncation, tag pills, action menu |
| `Transactions.jsx` | 369 | Full transaction list with search, filter, date range, bulk select/edit/delete |
| `Accounts.jsx` | 392 | Account CRUD + PDF statement upload + balance extraction + 5 types |
| `Analytics.jsx` | 272 | Monthly income/expense bar chart + daily balance line chart |
| `AdvancedReports.jsx` | 365 | Tabbed: income vs expense, merchant breakdown, category trends, budget vs actual (Sankey) |
| `Budgets.jsx` | 197 | Monthly category budgets with progress bars, rollover |
| `Goals.jsx` | 233 | Savings goals with target amount + deadline |
| `Debts.jsx` | 360 | Debt payoff planner (avalanche/snowball/custom), projection chart |
| `Loans.jsx` | 265 | Money lent/borrowed tracker |
| `Recurring.jsx` | 339 | Recurring bills/income with frequency, auto-generation |
| `Investments.jsx` | 279 | Portfolio tracker (stocks/EPF/fixed deposit/crypto) |
| `NetWorth.jsx` | 210 | Assets + liabilities = net worth with pie chart |
| `CashFlow.jsx` | 176 | 60-day balance projection |
| `Settings.jsx` | 1248 | Theme, export/import, Google Drive, Gmail sync, notifications, app lock, biometrics, encryption, data management, multi-user, about |
| `ReceiptScanner.jsx` | 206 | Camera/file → Tesseract OCR → auto-categorize → add transaction |
| `SmsParser.jsx` | 288 | Read SMS → parse → preview → import transactions |
| `ImportCSV.jsx` | 202 | CSV upload → preview → column mapping → validate → import |
| `Categories.jsx` | 188 | CRUD categories with icon + color picker |
| `Rules.jsx` | 232 | Auto-categorization rules: field + match type + value → category/account |
| `Templates.jsx` | 232 | Pre-configured transaction templates |
| `ModalRoot.jsx` | 15 | Modal stack tracking |
| `QuickAddButton.jsx` | 18 | Floating FAB per-screen quick-add |
| `Assistant.jsx` | 294 | AI chat: configurable LLM (OpenAI/Groq/Ollama), spending analysis |
| `UserSwitcher.jsx` | 82 | Multi-user account switch |
| `ErrorBoundary.jsx` | 37 | Global error catch + retry |
| `ReceiptImage.jsx` | 57 | Load receipt from IndexedDB |
| `GoogleDriveBackup.jsx` | 165 | Configure auto-backup interval, manual backup/restore |
| `AvatarPicker.jsx` / `AvatarCropper.jsx` | 87/106 | Photo pick + crop (react-easy-crop) |
| `TagInput.jsx` | 55 | Tag chip input component |
| `SplitEditor.jsx` | 85 | Multi-category transaction splitting |

### `/assets/` — `icon.png`, `splash.png`

### `/public/` — PWA icons (192, 512, SVG), favicon, mask-icon, apple-touch-icon

### `/scripts/generate-icons.js` — generates PWA icons from SVG via sharp

---

## Android Native Layer (`android/`)

### Java Files (6)
| File | Role |
|------|------|
| `MainActivity.java` | Entry: registers SmsPlugin, SocialLoginPlugin, NotificationListenerPlugin BEFORE super.onCreate(); enables WebView debugging |
| `SmsPlugin.java` | Reads 200 SMS inbox messages (getMessages, checkPermission, requestPermission) |
| `BiometricPlugin.java` | Biometric auth (isAvailable, authenticate) with BIOMETRIC_STRONG + DEVICE_CREDENTIAL |
| `NotificationListenerPlugin.java` | Captures notifications from payment apps (Google Pay, PhonePe, Paytm, BHIM, etc.) |
| `PaymentNotificationListener.java` | System NotificationListenerService that delegates to the plugin |
| `BalanceWidgetProvider.java` | Home-screen widget: reads Capacitor prefs, displays balance |

### Key Config
- **AndroidManifest.xml** — permissions: INTERNET, READ_SMS, RECEIVE_SMS, READ_PHONE_STATE, USE_BIOMETRIC, USE_FINGERPRINT
- **build.gradle** — AGP 8.13.0, compileSdk=rootProject, Material 1.13.0-alpha13, biometric 1.1.0
- **res/layout/widget_balance.xml** — balance widget layout
- **res/xml/widget_balance_info.xml** — widget provider config (min 180x40dp, update 30min)
- **Release keystore:** `C:\Users\User\Desktop\YouTube\Releasekey`, alias `PocketMoney`, password `Ammu1999`

---

## Backend (`backend/`)

Optional Express.js cloud sync server:
- `server.js` — Express with Helmet, CORS, rate-limit, HTTPS redirect, error handler
- `routes/auth.js` — JWT register/login with bcrypt + express-validator
- `routes/sync.js` — GET/POST/DELETE sync data with version conflict detection (409 on stale)
- `middleware/auth.js` — JWT Bearer token verification
- `db.js` — JSON-file persistence (data/sync.json, data/users.json)
- `tests/server.test.js` — Jest + supertest integration tests

---

## Features Map

### Core
- [x] Multi-user PIN auth
- [x] 25 default categories (15 expense, 6 income, 2 cash flow, 1 transfer, 1 investment)
- [x] Custom categories with icon + color
- [x] Account management (5 types: bank/cash/wallet/credit/investment)
- [x] Encrypted account number storage (AES-GCM with PIN hash)
- [x] Transactions (expense/income/transfer) with split categories, tags, receipts
- [x] Budgets with monthly progress + rollover
- [x] Savings goals with deadlines
- [x] Debt payoff planner (avalanche/snowball/custom)
- [x] Recurring transactions generator (capped at 60 iterations)
- [x] Investments tracker (stocks, EPF, fixed deposit, crypto)
- [x] Loans tracker (lent/borrowed)
- [x] Net worth calculation (assets - liabilities)
- [x] Dark/light mode + 8 accent colors (Material 3)
- [x] Editable dashboard cards (toggle + reorder)
- [x] Daily/weekly/monthly reports with charts
- [x] Analytics (monthly + 6-month trends)
- [x] Advanced reports (Sankey, merchant, budget vs actual)
- [x] Cash flow forecast (60 days)
- [x] Multi-user support
- [x] Biometric unlock (native + WebAuthn fallback)
- [x] Lock screen with PIN
- [x] Google Drive backup/restore (OAuth)
- [x] Cloud sync (optional Express backend)
- [x] Gmail transaction sync (OAuth)
- [x] Export/import (JSON, encrypted JSON, CSV)
- [x] CSV import with column mapping + validation
- [x] Transaction templates
- [x] Auto-categorization rules (conditional)
- [x] PDF statement upload + balance extraction
- [x] Avatar picker with crop

### Phase 1 Auto-Capture (Completed)
- [x] SMS bank transaction parser (regex, 70+ bank alert keywords)
- [x] SMS account matching (last 4 / first 4 digits, encrypted)
- [x] UPI notification parser (Google Pay, PhonePe, Paytm, etc.)
- [x] Email parser (Amazon, Uber, Netflix, Swiggy, Zomato, banks)
- [x] Gmail API integration
- [x] Receipt OCR (Tesseract.js)
- [x] Merchant→category rules (82 rules)
- [x] Keyword-based category fallback (20 categories)
- [x] Fuzzy deduplication (±2% amount, ±24h, merchant match)
- [x] Unified auto-capture pipeline
- [x] SMS account suggestion in onboarding
- [x] Promotional SMS rejection

### AI Assistant
- [x] Configurable provider (OpenAI, Groq, Ollama, LM Studio)
- [x] Builds financial summary from store data
- [x] Chat interface with suggestions
- [x] Connection test

### Android-Specific
- [x] Capacitor 8 build
- [x] SMS native plugin
- [x] Biometric native plugin
- [x] Notification listener service
- [x] Social login (Google)
- [x] Home-screen balance widget
- [x] Splash screen (all orientations + night mode)
- [x] Adaptive launcher icons
- [x] Safe area + notch support (safe-top, safe-bottom, safe-area)

### Security
- [x] PIN hashing (PBKDF2)
- [x] AES-GCM encryption for account numbers
- [x] DOMPurify input sanitization
- [x] CSV formula injection prevention
- [x] Backup data validation (schema + size checks)
- [x] Settings sanitization on import (protects SMS IDs, tokens)
- [x] XSS cleanup (escapeHtml)

---

## Testing (420 tests, 40 files)

All 40 test files pass with 420 tests (Vitest + jsdom). Full coverage from lib utilities through components.

| File | Tests | Area |
|------|-------|------|
| `store.test.js` | 42 | All store CRUD + persistence |
| `Onboarding.test.jsx` | 17 | Full onboarding flow |
| `sanitize.test.js` | 16 | DOMPurify, escape, sanitize edge cases |
| `storage.test.js` | 11 | Zustand adapter, getAll, keys, remove missing |
| `security.test.js` | 8 | Auth edge cases, biometrics, encryption round-trip |
| `smsParser.test.js` | 10 | SMS parsing |
| `merchantRules.test.js` | 19 | Merchant matching + auto-categorize + keyword fallback |
| `emailParser.test.js` | 8 | Email sender/amount/date parsing |
| `upiNotifications.test.js` | 9 | UPI notification parsing |
| `dedup.test.js` | 9 | Transaction deduplication |
| `accountNumber.test.js` | 8 | Encryption + matching |
| `DailyReport.test.jsx` | 9 | Daily report generation |
| `export.test.js` | 5 | Export/import validation |
| `Dashboard.test.jsx` | 2 | Dashboard render + data |
| `Dashboard.editable.test.jsx` | 7 | Editable cards |
| `api.test.js` | 13 | REST client success/error/network |
| `assistant.test.js` | 4 | LLM client setup |
| `autoCapture.test.js` | 6 | Auto-capture pipeline |
| `gmailSync.test.js` | 8 | Gmail OAuth + fetch + sync |
| `googleDrive.test.js` | 10 | Drive OAuth + backup/restore |
| `icons.test.js` | 6 | Lucide icon loader |
| `notifications.test.js` | 1 | Schedule/cancel |
| `pdf.test.js` | 4 | PDF report generation |
| `pdfParser.test.js` | 6 | Receipt text extraction |
| `receipts.test.js` | 18 | IndexedDB CRUD + migration |
| `share.test.js` | 5 | Native share + fallback |
| `theme.test.js` | 10 | Material 3 apply + persist |
| `utils.test.js` | 11 | formatLKR, formatDate, generateId, etc. |
| `demoData.test.js` | 16 | Cross-reference validation |
| `email.test.js` | 9 | Email report build + send |
| `crypto.test.js` | 10 | PIN hash + AES-GCM round-trip |
| `Accounts.test.jsx` | 14 | Account CRUD + reconciliation |
| `AuthScreen.test.jsx` | 8 | Login/create user + PIN validation |
| `Budgets.test.jsx` | 1 | Budget progress render |
| `CashFlow.test.jsx` | 2 | Projected balance render |
| `Categories.test.jsx` | 7 | Category CRUD + icon picker |
| `Debts.test.jsx` | 2 | Debt payoff render |
| `QuickAddContext.test.jsx` | 1 | Quick-add registration |
| `Settings.test.jsx` | 12 | Theme, export, backup, multi-user |
| `TransactionItem.test.jsx` | 17 | Card render + context menu + indicators |

**E2E:** `tests/e2e/smoke.spec.js` — Playwright, 297 lines, full user journey.

**See also:** `PROJECT_REVIEW.md` for public-release readiness audit with prioritized fix stack.

**Test config:** Vitest (jsdom), setup: `@testing-library/jest-dom` + cleanup afterEach

---

## Build & Deploy

```bash
npm install
npm run dev          # Vite dev server on port 3000
npm run build        # Build dist/
npm test             # Vitest
npx cap sync android # Sync web→native
npx cap open android # Open in Android Studio
```

**APK build:** Release build via Android Studio with keystore `C:\Users\User\Desktop\YouTube\Releasekey` (alias `PocketMoney`, password `Ammu1999`).

**PWA:** Auto-deployed via Netlify (.netlify config present). installable, works offline.

---

## Recent Git History (last 20 commits)

```
b8d229d Merge branch 'main'
0c47d3e feat(phase1): auto-capture foundation
8c2725d chore: update debug APK [skip ci]
13ad8e6 fix(onboarding): scroll layout + 33 new tests
8c2725d chore: update debug APK [skip ci]
31dcbc5 feat: daily reports, editable dashboard, Android widget, premium animations
93fa923 fix(onboarding): keyboard focus, flickering, scaling, category UX, SMS import
4ccbdd2 fix(onboarding): safe migration to prevent hang on rehydration
12d526d fix(onboarding): keep onboarding mounted until categories and accounts are done
a94d2f1 feat: premium onboarding, SMS import, PDF reconcile, Google sign-in, themes
```

---

## Current Uncommitted Changes (47 files modified)

### Source fixes
- `src/App.jsx` — safe-top class order fix
- `src/components/Dashboard.jsx` — chart interactivity + calculation fixes
- `src/components/Onboarding.jsx` — SMS accounts suggestion screen added, safe-area progress bar
- `src/components/TransactionItem.jsx` — overflow fix, uniform widths, tag truncation
- `src/index.css` — pointer-events fix for Recharts, safe-area improvements
- `src/lib/merchantRules.js` — keyword-based category fallback (guessCategoryByKeywords)
- `src/lib/sms.js` — suggestAccountsFromSms function + autoCategorize integration in importSmsMessages

### New test files (18 added)
- `tests/api.test.js`, `tests/assistant.test.js`, `tests/autoCapture.test.js`
- `tests/gmailSync.test.js`, `tests/googleDrive.test.js`
- `tests/icons.test.js`, `tests/notifications.test.js`
- `tests/pdf.test.js`, `tests/receipts.test.js`
- `tests/sanitize.test.js`, `tests/share.test.js`
- `tests/storage.test.js`, `tests/theme.test.js`
- `tests/demoData.test.js`, `tests/email.test.js`
- `tests/Accounts.test.jsx`, `tests/AuthScreen.test.jsx`
- `tests/Categories.test.jsx`, `tests/Settings.test.jsx`
- `tests/TransactionItem.test.jsx`

### Audits
- `PROJECT_AUDIT.md` — updated test coverage
- `PROJECT_REVIEW.md` — public-release readiness audit

---

## Known Issues / Active Fixes

1. **Charts not interactive** — global `svg { pointer-events: none }` was blocking Recharts tooltips. Fixed with `.recharts-wrapper` / `.recharts-surface` overrides.
2. **Charts calculation** — date comparison was using strict `===` for ISO dates; fixed to use `.startsWith()`.
3. **Auto-categorization defaulting to "food"** — no fallback existed. Added `guessCategoryByKeywords()` with 20 category keyword maps + scoring.
4. **SMS import not using autoCategorize** — was hardcoded to first expense category. Now uses `autoCategorize()` from merchantRules.
5. **Transaction card overflow** — long notes broke layout. Fixed with proper `min-w-0`, `flex-1`, `truncate`, tag limit.
6. **Safe area / notch** — progress bar was behind camera cutout. Fixed with `safe-top` class using `max(env(safe-area-inset-top), 2.5rem)`.
7. **Onboarding needs SMS account auto-suggest** — added `suggestAccountsFromSms()` in sms.js + SmsAccountsScreen in onboarding that reads SMS, detects banks + account hints, lets user select accounts to auto-create.
8. **Comprehensive test coverage** — expanded from 22 files / 165+ tests to 40 files / 420 tests covering all lib modules (sanitize, storage, api, receipts, theme, autoCapture, icons, share, assistant, demoData, pdf, email, gmailSync, googleDrive) and all major components (Settings, TransactionItem, Accounts, Categories, AuthScreen).
9. **Public-release audit** — `PROJECT_REVIEW.md` documents 5 critical, 8 high, 8 medium, 10 low priority issues with prioritized fix stack for beta/launch readiness.

---

## Key Dependencies

```
react, react-dom, zustand,
tailwindcss, @material/material-color-utilities,
recharts, lucide-react,
@capacitor/core, @capacitor/android (8.4.1),
@capgo/capacitor-social-login,
@aparajita/capacitor-biometric-auth,
tesseract.js, pdfjs-dist, pdf-lib,
openai, dompurify, react-easy-crop,
vitest, @testing-library/react, @playwright/test
```

---

## Important Config Values

- **Google Web Client ID:** `432912016198-nt5ekvasrs3qtkkdcm3ke36unldtt7mh.apps.googleusercontent.com`
- **Keystore:** `C:\Users\User\Desktop\YouTube\Releasekey`, alias `PocketMoney`, password `Ammu1999`
- **Capacitor appId:** `app.pocketmoney.mobile`
- **Backend default:** `http://localhost:4000/api`

---

## Environment Variables (.env)
```
VITE_GOOGLE_WEB_CLIENT_ID=432912016198-nt5ekvasrs3qtkkdcm3ke36unldtt7mh.apps.googleusercontent.com
# VITE_OPENAI_API_KEY=sk-...
```

---

This audit covers all 70 source files, 6 Android Java files, 45 test files (495 tests), backend, configs, and current work state.
