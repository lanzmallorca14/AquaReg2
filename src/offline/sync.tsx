import { aquaOfflineDB } from "./db";
import { SupabaseClient } from "@supabase/supabase-js";

// Helper to format payload and ensure primary keys exist
async function formatOfflineData(data: any, supabase: SupabaseClient) {
  const { data: { user } } = await supabase.auth.getUser();

  return {
    id: data.id || crypto.randomUUID(),
    user_id: data.user_id || user?.id || null,
    ...data,
    created_at: data.created_at || new Date().toISOString(),
  };
}

// Helper to strip local IndexedDB metadata before sending to Supabase
function sanitizePayload(data: any) {
  const payload = { ...data };
  delete payload.sync_status;
  return payload;
}

// =================================================
// SAVE OFFLINE VESSEL
// =================================================

export async function saveOfflineVessel(data: any, supabase: SupabaseClient) {
  const db = await aquaOfflineDB;
  const formattedData = await formatOfflineData(data, supabase);

  await db.put("Vessels", {
    ...formattedData,
    sync_status: "pending",
  });

  await db.add("syncQueue", {
    action: "INSERT",
    table: "Vessels",
    data: formattedData,
    created_at: new Date().toISOString(),
  });
}

// =================================================
// SAVE OFFLINE PERMIT
// =================================================

export async function saveOfflinePermit(data: any, supabase: SupabaseClient) {
  const db = await aquaOfflineDB;
  const formattedData = await formatOfflineData(data, supabase);

  await db.put("permit_management", {
    ...formattedData,
    sync_status: "pending",
  });

  await db.add("syncQueue", {
    action: "INSERT",
    table: "permit_management",
    data: formattedData,
    created_at: new Date().toISOString(),
  });
}

// =================================================
// SAVE OFFLINE INSPECTION
// =================================================

export async function saveOfflineInspection(data: any, supabase: SupabaseClient) {
  const db = await aquaOfflineDB;
  const formattedData = await formatOfflineData(data, supabase);

  await db.put("COI", {
    ...formattedData,
    sync_status: "pending",
  });

  await db.add("syncQueue", {
    action: "INSERT",
    table: "COI",
    data: formattedData,
    created_at: new Date().toISOString(),
  });
}

// =================================================
// SYNC OFFLINE DATA
// =================================================

export async function syncOfflineData(supabase: SupabaseClient) {
  const db = await aquaOfflineDB;
  const queue = await db.getAll("syncQueue");

  if (!queue || queue.length === 0) return;

  // 1. Verify active session before running sync loop to prevent 401 & RLS errors
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    console.warn("Sync deferred: No active auth session.");
    return;
  }

  for (const item of queue) {
    try {
      if (!navigator.onLine) {
        console.warn("Device is offline. Halting sync batch.");
        break;
      }

      // 2. Clean local metadata and auto-inject active user_id if missing
      const cleanData = sanitizePayload(item.data);
      if (!cleanData.user_id && session.user) {
        cleanData.user_id = session.user.id;
      }

      const queueId = item.queue_id || item.id;

      // ============================
      // INSERT / UPSERT SYNC
      // ============================
      if (item.action === "INSERT") {
        const { error } = await supabase
          .from(item.table)
          .upsert(cleanData, { onConflict: "id" });

        if (!error) {
          if (queueId) await db.delete("syncQueue", queueId);

          if (["Vessels", "COI", "permit_management"].includes(item.table)) {
            await db.put(item.table, {
              ...item.data,
              sync_status: "synced",
            });
          }
        } else {
          console.error(
            `INSERT Sync failed for [${item.table}]:`,
            error.message || error.details || error
          );
        }
      }

      // ============================
      // UPDATE SYNC
      // ============================
      if (item.action === "UPDATE") {
        const targetId = item.id || cleanData.id;

        const { error } = await supabase
          .from(item.table)
          .update(cleanData)
          .eq("id", targetId);

        if (!error) {
          if (queueId) await db.delete("syncQueue", queueId);

          if (
            item.table === "Vessels" &&
            ["PASSED", "REGISTERED"].includes(
              String(item.data.status || "").toUpperCase()
            )
          ) {
            await db.put("Vessels", {
              ...item.data,
              sync_status: "synced",
            });
          }
        } else {
          console.error(
            `UPDATE Sync failed for [${item.table}]:`,
            error.message || error.details || error
          );
        }
      }
    } catch (err) {
      console.error("Execution error during sync batch:", err);
      break;
    }
  }
}