import { getSettings } from "./db";

export interface SyncPayload {
  action: string;
  event_type: "submit" | "grade" | "resubmit" | "test_connection";
  timestamp: string;
  student_code: string;
  student_name: string;
  class_name: string;
  assignment_title: string;
  subject: string;
  attempt_number?: number | string;
  is_late?: string;
  score?: number | string | null;
  status?: string;
  teacher_note?: string;
  operator?: string;
}

export function syncToGoogleSheetAsync(payload: SyncPayload) {
  // Fire and forget, does not block the Next.js API response
  setTimeout(async () => {
    try {
      const settings = getSettings();
      const sheetUrl = settings.google_sheet_url?.trim();
      if (!sheetUrl || settings.auto_sync_sheets !== "true") return;

      await fetch(sheetUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      console.log(`[Next.js GoogleSheets Sync] Synced event: ${payload.event_type} for ${payload.student_name}`);
    } catch (error) {
      console.error("[Next.js GoogleSheets Sync Error]:", error);
    }
  }, 10);
}
