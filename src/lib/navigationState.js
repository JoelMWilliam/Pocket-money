let _pendingAccountFilter = null

export function setPendingAccountFilter(accountId) {
  _pendingAccountFilter = accountId
}

export function consumePendingAccountFilter() {
  const val = _pendingAccountFilter
  _pendingAccountFilter = null
  return val
}
