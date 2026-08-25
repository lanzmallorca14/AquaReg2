import { openDB } from "idb";


// =================================================
// AQUA REG OFFLINE DATABASE
// =================================================

export const aquaOfflineDB = openDB(
  "AquaRegOffline",
  5,
  {

    upgrade(db) {

        if (!db.objectStoreNames.contains("Vessels")) {
        const vesselStore = db.createObjectStore("Vessels", {
          keyPath: "id",
        });
        db.createObjectStore("offline_users", {
          keyPath: "email"
           });
        

        vesselStore.createIndex("sync_status", "sync_status");
      }



      // ==========================
      // VESSELS TABLE
      // ==========================

         if (!db.objectStoreNames.contains("personnel_profiles")) {
        const personnelStore = db.createObjectStore(
          "personnel_profiles",
          {
            keyPath: "id",
          }
        );

        personnelStore.createIndex(
          "sync_status",
          "sync_status"
        );
      }


      // ==========================
      // INSPECTION / COI TABLE
      // ==========================

      if (!db.objectStoreNames.contains("COI")) {


        const inspectionStore =
          db.createObjectStore(
            "COI",
            {
              keyPath:"id"
            }
          );


        inspectionStore.createIndex(
          "sync_status",
          "sync_status"
        );


        inspectionStore.createIndex(
          "vessel_id",
          "vessel_id"
        );

      }



         if (!db.objectStoreNames.contains("permit_management")) {

        const permitStore = db.createObjectStore(
          "permit_management",
          {
            keyPath: "id",
          }
        );

        permitStore.createIndex(
          "sync_status",
          "sync_status"
        );
      }




      // ==========================
      // IMAGES TABLE
      // ==========================

      if (!db.objectStoreNames.contains("Images")) {


        const imageStore =
          db.createObjectStore(
            "Images",
            {
              keyPath:"image_id",
              autoIncrement:true
            }
          );


        imageStore.createIndex(
          "vessel_id",
          "vessel_id"
        );


        imageStore.createIndex(
          "sync_status",
          "sync_status"
        );


      }




      // ==========================
      // SYNC QUEUE TABLE
      // ==========================

      if (!db.objectStoreNames.contains("syncQueue")) {


        db.createObjectStore(
          "syncQueue",
          {
            keyPath:"queue_id",
            autoIncrement:true
          }
        );


      }

    }

  }

);




// =================================================
// SAVE IMAGE WHEN OFFLINE
// =================================================

export async function saveOfflineImage(
  vesselId:string,
  key:string,
  file:File
) {


  const db =
    await aquaOfflineDB;


  await db.add(
    "Images",
    {

      vessel_id:vesselId,

      document_key:key,

      file:file,

      sync_status:"pending",

      created_at:
        new Date().toISOString()

    }
  );


}





// =================================================
// SAVE INSPECTION WHEN OFFLINE
// =================================================

export async function saveOfflineInspection(
  inspection:any
){

  const db =
    await aquaOfflineDB;


  await db.put(
    "COI",
    {

      ...inspection,

      sync_status:"pending",

      created_at:
        new Date().toISOString()

    }
  );



  await db.add(
    "syncQueue",
    {

      action:
      "COMPLETE_INSPECTION",


      record_id:
      inspection.id,


      created_at:
      new Date().toISOString()

    }
  );


}