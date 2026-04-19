import { getDb } from '../db'

export function logActivity(
  documentId: number,
  caseId: number,
  eventType: string,
  description: string,
  metadata?: Record<string, unknown>
): void {
  try {
    const db = getDb()
    db.prepare(
      `INSERT INTO document_activity (document_id, case_id, event_type, description, metadata)
       VALUES (?, ?, ?, ?, ?)`
    ).run(
      documentId,
      caseId,
      eventType,
      description,
      metadata ? JSON.stringify(metadata) : null
    )
  } catch {
    // アクティビティログの失敗はメイン処理に影響させない
  }
}
