let persistedStateSyncPauseCount = 0;

export function pausePersistedStateSync(): void {
  persistedStateSyncPauseCount += 1;
}

export function resumePersistedStateSync(): void {
  persistedStateSyncPauseCount = Math.max(0, persistedStateSyncPauseCount - 1);
}

export function isPersistedStateSyncPaused(): boolean {
  return persistedStateSyncPauseCount > 0;
}
