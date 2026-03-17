import type { PersistedState } from "@/store/app-store";

export type BackupPayload = {
  exportedAt: string;
  source: "localStorage";
  data: PersistedState;
};

export function buildBackupPayload(state: PersistedState): BackupPayload {
  return {
    exportedAt: new Date().toISOString(),
    source: "localStorage",
    data: state,
  };
}

export function downloadBackup(state: PersistedState): void {
  const payload = JSON.stringify(buildBackupPayload(state), null, 2);
  const blob = new Blob([payload], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `we-bible-web-backup-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function readBackupFile(file: File): Promise<BackupPayload> {
  const text = await file.text();
  const parsed = JSON.parse(text) as BackupPayload;
  if (!parsed || parsed.source !== "localStorage" || typeof parsed.data !== "object") {
    throw new Error("Invalid backup file.");
  }
  return parsed;
}
