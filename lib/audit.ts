import { getDb } from "../db";
import { auditEvents } from "../db/schema";

export async function writeAuditEvent(ownerId: string, action: string, entityType: string, entityId: string): Promise<void> {
  await getDb().insert(auditEvents).values({
    id: crypto.randomUUID(), ownerId, action, entityType, entityId, createdAt: new Date(),
  });
}
