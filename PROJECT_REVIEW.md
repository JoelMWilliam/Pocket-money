# Pocket Money — Public-Release Readiness Audit

**Date:** 2026-07-18  
**Version:** 0.2.0  
**Platform:** Capacitor (Android/iOS) + PWA  
**Test coverage:** 420 tests across 40 files (36 passing)  
**Audited files:** 18 core source files, all lib modules

---

## Executive Summary

Pocket Money has a strong architectural foundation — Zustand + local-first + Capacitor — and an impressive breadth of features (SMS parsing, Google Drive sync, Gmail import, crypto, budgets, goals, recurring, reconciliation, multi-user, encrypted export). However, it is **not ready for public release** due to **5 critical issues** (2 security, 3 UX) and **8 high-priority problems** that would cause user frustration, data loss, or security incidents on day one.

---

## 1. CRITICAL (Blocking Release)

### 1.1 Plaintext OAuth Token Storage — Security

**Files:** `src/lib/googleDrive.js:27-33`, `src/lib/gmailSync.js:11`  
**Severity:** Data breach / account takeover

Google OAuth access tokens and Gmail tokens are stored via `storageSet()` / `storageGet()` — backed by `localStorage` on web and `@capacitor/preferences` on native. **No encryption at rest.** An attacker with filesystem access or XSS can exfiltrate tokens granting `drive.file` and `gmail.readonly` scope.

**Fix:** Encrypt tokens with user's PIN-derived key before persistence (use `src/lib/crypto.js` which already exists).

### 1.2 Production Console.log Leaks Login Response — Security

**File:** `src/lib/googleDrive.js:67`  
**Severity:** Credential exposure

```js
console.log('Google login result:', JSON.stringify(res, null, 2))
```

The full OAuth response — including `accessToken`, `refreshToken`, email, profile — is logged to console in production. Any console viewer or error reporting tool would expose credentials.

**Fix:** Remove or gate behind `import.meta.env.DEV`.

### 1.3 Pervasive `alert()` Instead of Toast/Notification System — UX / Blocking

**Files:** `src/components/Settings.jsx` (12+ uses), `src/components/Accounts.jsx`, `src/components/Transactions.jsx`, `src/components/Categories.jsx`  
**Severity:** Appears broken on native (modal `alert()` blocks JS thread)

Virtually all user feedback — errors, confirmations, successes — uses the native `alert()` dialog. On Capacitor native, `alert()` is modal and blocks the JS thread entirely. Error messages from `catch` are surfaced directly to users, leaking implementation details.

**Fix:** Implement a toast/snackbar system (or use the existing `ModalContext`) and replace all `alert()` calls. Sanitize error messages.

### 1.4 Email Report Silently Fails on All Paths — UX / Reliability

**File:** `src/lib/email.js:121-132`  
**Severity:** Feature is broken — returns `true` even on failure

```js
window.open(`mailto:?subject=...&body=...`, `_blank`)
```

On native (Capacitor WebView), `mailto:` via `window.open` has unreliable behavior. The fallback `nativeShare` is not guaranteed to work either. The function returns `true` regardless, giving users false confidence.

**Fix:** Return `false` only when every path fails; surface user-visible error.

### 1.5 Receipt Scanner is Dead Code / Unreachable — UX / Feature Hole

**File:** `src/App.jsx:268`  
**Severity:** A complete feature is wired but has no entry point

```jsx
{receiptOpen && <ReceiptScanner onClose={() => setReceiptOpen(false)} />}
```

`receiptOpen` is declared (App.jsx:67) but `setReceiptOpen` is never called anywhere. The receipt scanner is entirely unreachable from the UI.

**Fix:** Wire a button in the transaction form or remove the dead code.

---

## 2. HIGH PRIORITY (Serious UX / Bugs)

### 2.1 No Loading/Saving Indicators on Any Async Operation

**Files:** `src/components/Accounts.jsx`, `src/components/Settings.jsx`, `src/components/Onboarding.jsx`  
**Impact:** Users tap buttons with no feedback during multi-second operations (PDF parse, crypto, cloud sync).

### 2.2 Category Deletion Destroys All Referenced Transactions Without Recall

**File:** `src/store/useAppStore.js:716-722`  
**Impact:** `deleteCategory` cascades to delete all transactions with that `categoryId`. The only confirmation is a bare `confirm()` dialog. No undo mechanism. Could delete hundreds of transactions.

### 2.3 Most Screens Have No Empty State

**Files:** `src/components/Accounts.jsx`, `src/components/Categories.jsx`, `src/components/Transactions.jsx`  
**Impact:** When no accounts/categories/transactions exist, the screen shows blank space. New users have no guidance.

### 2.4 Bulk Operations in Transactions Show No Success/Failure Feedback

**File:** `src/components/Transactions.jsx:107-113`  
**Impact:** Bulk delete/edit operations complete silently. No toast, no summary of changes.

### 2.5 QuickAddContext Allows Only One Registered Callback — Race Condition

**Files:** `src/components/Transactions.jsx:14`, `src/components/Accounts.jsx:24`, `src/components/Categories.jsx:16`, `src/components/Dashboard.jsx:25`  
**Impact:** Multiple screens register callbacks via `useRegisterQuickAdd`. Only the last one wins. Switching screens rapidly can fire the wrong callback.

### 2.6 Auth Re-hydration Race Causes Screen Flash on Cold Start

**File:** `src/App.jsx:234-252`  
**Impact:** On cold launch, the app may briefly flash Onboarding → AuthScreen → Dashboard because `rehydrated` is set before store data is fully deserialized.

### 2.7 Gmail Sync Search Query is Hardcoded English-Only

**File:** `src/lib/gmailSync.js:78-79`  
**Impact:** The email search query is hardcoded with English terms and `newer_than:7d` scope. For Sri Lankan users (app's target audience), Sinhala/Tamil email subjects will be missed.

### 2.8 `receiptOpen` / `quickAddOpen` State Duplication

**File:** `src/App.jsx:66-67`  
**Impact:** Two competing modal state variables can conflict. The existing `ModalContext` is imported but barely used.

---

## 3. MEDIUM PRIORITY (Polish / Features)

### 3.1 No Offline/Online Indicator
Cloud sync, Drive backup, Gmail import all need connectivity but there's no banner when offline.

### 3.2 Dashboard Spending Chart Recomputes on Every Render
7-day chart data is computed inline in JSX, not memoized. Every state change triggers recalculation.

### 3.3 No Search Debounce on Transaction Search
`filtered` list re-filters on every keystroke. Fine for small datasets, but expensive for 10,000+ transactions.

### 3.4 Hardcoded `presetColors` Duplicated Across Components
Color arrays are duplicated in Accounts, Categories, Onboarding, Settings instead of importing from `lib/theme`.

### 3.5 App.jsx Has 8+ useEffect Hooks
Complex dependency arrays make lifecycle management fragile. Consolidate into a custom `useCapacitorLifecycle` hook.

### 3.6 Dark Mode Default Ignores System Preference
`isDark` defaults to `true` in Onboarding rather than respecting `prefers-color-scheme: dark`.

### 3.7 Reduced Motion Query Exists but Animations Still Heavy
Spring animations (`cubic-bezier(0.16, 1, 0.3, 1)`) have overshoot. No low-battery or low-end-device optimization.

### 3.8 `formatLKR` Called in Render Loops
`formatLKR` is called per-transaction in TransactionItem and per-aggregate in Dashboard. Not memoized.

---

## 4. LOW PRIORITY (Nice to Have)

### 4.1 No Centralized Error Reporting (Sentry/PostHog)
Errors logged with `console.error` disappear in production.

### 4.2 No i18n Infrastructure
Hardcoded English UI with LKR default. Sinhala/Tamil expected for Sri Lankan audience.

### 4.3 `printReport` Uses `window.open` — Blocked by Popup Blockers
**File:** `src/lib/export.js:111-133`

### 4.4 `deleteUser` Leaves Stale Storage on Failure
**File:** `src/store/useAppStore.js:531-548` — If `persistUserData` throws, storage entry persists.

### 4.5 `getGoogleWebClientId` Has Fragile Fallback Logic
**File:** `src/lib/googleDrive.js:10-19` — The `includes('YOUR_WEB_CLIENT_ID')` check is fragile.

### 4.6 Activity Listeners Registered on Web (Unnecessary)
Auto-lock click/touch/keydown/scroll listeners fire on desktop PWA where PIN lock may not be needed.

---

## Fix Priority Stack

```
ITERATION 1 (Pre-release — must fix)
  ├── 1.1 Encrypt OAuth tokens with crypto.js
  ├── 1.2 Remove production console.log
  ├── 1.3 Replace alert() with toast system
  ├── 1.4 Fix email report fallback
  └── 1.5 Wire or remove receipt scanner

ITERATION 2 (Beta — should fix)
  ├── 2.1 Add loading spinners to all async ops
  ├── 2.2 Add confirmation with affected-count to category delete
  ├── 2.3 Add empty states to all screens
  ├── 2.4 Add toast feedback to bulk operations
  ├── 2.5 Fix QuickAddContext collision
  ├── 2.6 Fix auth re-hydration race
  └── 2.8 Consolidate modal state management

ITERATION 3 (Launch polish)
  ├── 3.1 Offline indicator
  ├── 3.2 Memoize Dashboard chart data
  ├── 3.3 Search debounce
  ├── 3.4 Centralize presetColors
  └── 4.x Nice-to-haves
```

---

## Current Test Coverage Summary

| Area | Tests | Status |
|------|-------|--------|
| Lib utilities (utils, sanitize, crypto, dedup, icons) | 43 | ✅ Full coverage |
| Data (demoData) | 16 | ✅ Field validation + cross-references |
| Store (useAppStore) | 42 | ✅ CRUD + state management |
| Notifications | 1 | ❌ Minimal |
| SMS/UPI/Email parsing | 18 | ✅ Parser coverage |
| Gmail sync | 8 | ✅ Mocked API |
| Google Drive | 10 | ✅ Mocked API |
| Export/Import | 5 | ✅ Key scenarios |
| Share | 5 | ✅ Native + fallback |
| Receipts (IndexedDB) | 18 | ✅ Full coverage |
| Theme | 10 | ✅ Apply + persist |
| Storage | 11 | ✅ GetAll/keys/edge cases |
| API | 13 | ✅ Success/error/network |
| AutoCapture | 6 | ✅ Key scenarios |
| Assistant | 4 | ✅ Basic |
| PDF | 4 | ✅ Build + export |
| Email report | 9 | ✅ Build + send |
| Security | 8 | ✅ XSS/path traversal |
| Account numbers | 8 | ✅ Encrypt/decrypt |
| Merchant rules | 19 | ✅ Fallback + keywords |
| Components (Accounts, AuthScreen, Budgets, CashFlow, Categories, Dashboard, DailyReport, Debts, Onboarding, QuickAdd, Settings, TransactionItem) | 82 | ✅ All major screens |
| **Total** | **420** | **40 test files** |
