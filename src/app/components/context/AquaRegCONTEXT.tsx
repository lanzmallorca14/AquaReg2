import { createContext, useContext, useState, useEffect, type Dispatch, type SetStateAction, type ReactNode } from 'react';
import type { SupabaseClient, AuthChangeEvent, Session } from '@supabase/supabase-js';

// --- Interfaces ---

export interface Inspector {
  id: string;
  idNumber: string;
  inspector_name?: string | null;
  name: string;
  email: string;
  password?: string; 
  status: 'pending' | 'approved' | 'rejected';
  position: string;
  barangay: string;
  password_recovered?: boolean;
  password_changed_at?: string | null;
  age: number;
  sex: 'Male' | 'Female';
  yearsInService: number;
  cellphone: string;
  contact_number ?: string | null;    
  phone ?: string | null; 
  createdAt: string;
  cp_number?: string | null;
  municipalIdImage: string | null;
  role: 'admin' | 'inspector' | 'officer';
}

export interface Vessel {
  id: string;
  vessel_name: string | null;
  owner_name: string;
  owner_age: number;
  asset_category: string; // 'vessel' | 'pangulong' | 'payao' | 'gears'
  type: string;
  gear_type?: string | null;
  barangay: string;
  certificate_no?: string | null;
  barangay_clearance?: string | null;
  cedula?: string | null;
  valid_id?: string | null;
  bfar_permit?: string | null;
  marina_permit?: string | null;
  sitio?: string | null;
  cp_number?: string | null;
  is_motorized: boolean;
  hull_length: number;
  hull_width: number;
  hull_depth: number;
  tonnage_gross: number;
  tonnage_net: number;
  status:
    | "Pending"
    | "Passed"
    | "Flagged"
    | "Scheduled"
    | "Rejected"
    | "Expired"
    | "To Follow"
    | "PAID"
    | "REGISTERED"
    | "READY";
  assigned_inspector?: string | null;
  inspected_by?: string | null;
  inspector_name?: string | null;
  inspection_date?: string | null;
  or_number?: string | null;
  remarks?: string | null;
  place_of_built?: string | null;
  year_built?: string | number | null;
  updated_at?: string;
  created_at: string;
  engine_make?: string | null;
  engine_hp?: string | null;
  serialNumber?: string | null;
  registration_no: string | null;
  official_no: string | null;
  payment_date: string | null;
  number_of_boats: string;
  boat_name: string;
  permit_fee: string;
  boat_builder_no: string;
  units_in_words: string;
}

export interface UserSession {
  email: string;
  role: "admin" | "inspector" | "officer";
  isAuthenticated: boolean;
  name: string;
  idNumber: string;
  id: string;
}

interface ExpirationStatus {
  label: string;
  color: string;
  urgent: boolean;
  daysRemaining: number;
}

interface AquaRegContextType {
  supabase: SupabaseClient;
  currentUser: UserSession | null;
  loading: boolean;
  authInitialized: boolean;
  login: (email: string, password: string, role: 'admin' | 'inspector' | 'officer') => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string, newPassword: string) => Promise<boolean>; 
  Vessels: Vessel[];
  setCurrentUser: Dispatch<SetStateAction<UserSession | null>>;
  addVessel: (vData: any) => Promise<Vessel | null>;
  updateVessel: (id: string, data: Partial<Vessel>) => Promise<boolean>;
  updateVesselStatus: (id: string, newStatus: Vessel['status']) => Promise<void>;
  deleteVessel: (id: string) => Promise<boolean>; 
  inspectors: Inspector[];
  requestRegistration: (data: any, userId: string, idFile?: File | Blob, signatureFile?: File | Blob | string) => Promise<boolean>; 
  updateInspectorStatus: (id: string, status: Inspector['status']) => Promise<void>;
  deleteInspector: (id: string) => Promise<void>;
  approveVessel: (id: string, adminOrInspectorName: string, remarks?: string) => Promise<boolean>;
  completeInspection: (id: string, orNumber: string, remarks?: string) => Promise<boolean>; // <-
  removeVessel: (id: string) => Promise<boolean>; 
  scheduleInspection: (id: string, inspectorIdNumber: string, dateStr: string) => Promise<any>;
  finalizeRegistry: (id: string, orNumber: string, date: string, remarks?: string) => Promise<boolean>;
  getExpirationStatus: (expiryDate: string | undefined) => ExpirationStatus;
  isDuplicateName: (name: string, currentId?: string) => Promise<boolean>;
  generatePermitNo: () => Promise<string>;

}


const AquaRegContext = createContext<AquaRegContextType | undefined>(undefined);

export const AquaRegProvider = ({
  children, supabase
}: {
  children: ReactNode;
  supabase: SupabaseClient;
}) => {
  const [currentUser, setCurrentUser] = useState<UserSession | null>(null);
  const [Vessels, setVessels] = useState<Vessel[]>([]);
  const [inspectors, setInspectors] = useState<Inspector[]>([]);
  const [loading, setLoading] = useState(true);
  const [authInitialized, setAuthInitialized] = useState(false);
  
  const generatePermitNo = async () => {
    const { data, error } = await supabase.rpc("generate_romblon_permit_id");
    if (error) {
      console.error(error);
      throw error;
    }
    return data;
  };

  const generateNextRM = async () => {
    const { data, error } = await supabase.rpc("generate_next_rm");
    if (error) {
      console.error(error);
      throw error;
    }
    return data;
  };

  const fetchDatabaseData = async () => {
    try {
      let vessels: any[] = [];

      if (navigator.onLine) {
        const { data, error } = await supabase.from("Vessels").select("*").order("created_at", { ascending: false });
        if (error) throw error;
        vessels = data || [];

        try {
          const { aquaOfflineDB } = await import("../../../offline/db");
          const db = await aquaOfflineDB;
          if (db.objectStoreNames.contains("Vessels")) {
            for (const vessel of vessels) {
              await db.put("Vessels", { ...vessel, sync_status: "synced" });
            }
          }
        } catch (e) {
          console.warn("Offline DB cache write skipped:", e);
        }
      } else {
        try {
          const { aquaOfflineDB } = await import("../../../offline/db");
          const db = await aquaOfflineDB;
          if (db.objectStoreNames.contains("Vessels")) {
            vessels = await db.getAll("Vessels");
          }
        } catch (e) {
          console.warn("Offline DB read skipped:", e);
        }
      }

      setVessels(vessels || []);

      if (navigator.onLine) {
        const { data: personnel, error: personnelError } = await supabase
          .from("personnel_profiles")
          .select("*")
          .order("created_at", { ascending: false });

        if (personnelError) {
          console.error(personnelError);
        } else {
         setInspectors(
  (personnel ?? []).map((profile): Inspector => ({
    id: profile.id,
    idNumber: profile.id_number || "",
    name: profile.name || "",
    email: profile.email || "",
    status: profile.profile_status || "pending",
    position: profile.position || "Fishery Inspector",
    barangay: profile.barangay || "",
    age: Number(profile.age) || 0,
    sex: profile.sex || "Male",
    yearsInService: Number(profile.years_in_service) || 0,

    // PHONE NUMBER
    cellphone:
      profile.cellphone ||
      profile.contact_number ||
      profile.cp_number ||
      profile.phone ||
      "",

    contact_number: profile.contact_number || null,
    phone: profile.phone || null,
    cp_number: profile.cp_number || null,

    createdAt: profile.created_at || "",

    // MUNICIPAL ID IMAGE
    municipalIdImage: profile.municipal_id_image || null,

    role: profile.role || "inspector",

    password_recovered:
      profile.password_recovered ?? false,

    password_changed_at:
      profile.password_changed_at ?? null,
  }))
);

          try {
            const { aquaOfflineDB } = await import("../../../offline/db");
            const db = await aquaOfflineDB;
            if (db.objectStoreNames.contains("personnel_profiles")) {
              for (const profile of personnel ?? []) {
               await db.put("personnel_profiles", {
  ...profile,
  offline_password: localStorage.getItem(`password_${profile.email}`),
  sync_status: "synced"
});
              }
            }
          } catch (e) {
            console.warn("Offline DB cache write skipped:", e);
          }
        }
      } else {
        try {
          const { aquaOfflineDB } = await import("../../../offline/db");
          const db = await aquaOfflineDB;
          if (db.objectStoreNames.contains("personnel_profiles")) {
            const personnel = await db.getAll("personnel_profiles");

           setInspectors(
  (personnel ?? []).map((profile): Inspector => ({
    id: profile.id,
    idNumber: profile.id_number || "",
    name: profile.name || "",
    email: profile.email || "",
    status: profile.profile_status || "pending",
    position: profile.position || "Fishery Inspector",
    barangay: profile.barangay || "",
    age: Number(profile.age) || 0,
    sex: profile.sex || "Male",
    yearsInService: Number(profile.years_in_service) || 0,

    // PHONE NUMBER
    cellphone:
      profile.cellphone ||
      profile.contact_number ||
      profile.cp_number ||
      profile.phone ||
      "",

    contact_number: profile.contact_number || null,
    phone: profile.phone || null,
    cp_number: profile.cp_number || null,

    createdAt: profile.created_at || "",

    // MUNICIPAL ID IMAGE
    municipalIdImage: profile.municipal_id_image || null,

    role: profile.role || "inspector",

    password_recovered:
      profile.password_recovered ?? false,

    password_changed_at:
      profile.password_changed_at ?? null,
  }))
);
          }
        } catch (e) {
          console.warn("Offline DB read skipped:", e);
        }
      }
    } catch (err) {
      console.error("Database loading failed:", err);
    }
  };

  const initializeUser = async (user: any) => {
    try {
      const email = user.email.toLowerCase().trim();

      if (email === "agricultureoffice@gov.ph" || email === "agricultureoffice@admin.ph") {
        setCurrentUser({
          email,
          role: "admin",
          name: "Admin",
          idNumber: "",
          id: user.id,
          isAuthenticated: true,
        });
        await fetchDatabaseData();
        return;
      }

      let profile = null;
      if (navigator.onLine) {
        const { data, error } = await supabase
          .from("personnel_profiles")
          .select("*")
          .eq("id", user.id)
          .maybeSingle();

        if (error) console.error("Profile loading error:", error);
        profile = data;
      } else {
        try {
          const { aquaOfflineDB } = await import("../../../offline/db");
          const db = await aquaOfflineDB;
          if (db.objectStoreNames.contains("personnel_profiles")) {
            profile = await db.get("personnel_profiles", user.id);
          }
        } catch (e) {
          console.warn("Offline DB read skipped:", e);
        }
      }

    if (!profile) {
   throw new Error("Unauthorized inspector account");
}

      setCurrentUser({
        email: profile.email || email,
        role: profile.role || "inspector",
        name: profile.name || "User",
        idNumber: profile.id_number || "",
        id: user.id,
        isAuthenticated: true,
      });

      await fetchDatabaseData();
    } catch (err) {
      console.error("Initialize User Error:", err);
    }
  };

  useEffect(() => {
    let mounted = true;

    const syncNow = async () => {
      if (navigator.onLine) {
        try {
          const { syncOfflineData } = await import("../../../offline/sync");
        await syncOfflineData(supabase);

        await fetchDatabaseData();
        } catch (error) {
          console.error("Sync failed:", error);
        }
      }
    };

    const startAuth = async () => {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        await initializeUser(session.user);
      } else {
        try {
          const { aquaOfflineDB } = await import("../../../offline/db");
          const db = await aquaOfflineDB;
          if (db.objectStoreNames.contains("offline_users")) {
            const offlineUsers = await db.getAll("offline_users");
            if (offlineUsers && offlineUsers.length > 0) {
              const lastUser = offlineUsers[offlineUsers.length - 1];
              if (lastUser?.user) {
                await initializeUser(lastUser.user);
              }
            }
          }
        } catch (e) {
          console.error("Offline session check failed:", e);
        }
      }

      await syncNow();

      if (mounted) {
        setAuthInitialized(true);
        setLoading(false);
      }
    };

    startAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        if (event === "SIGNED_OUT") {
          setCurrentUser(null);
        }
        if (event === "SIGNED_IN" && session?.user) {
          await initializeUser(session.user);
          await syncNow();
        }
      }
    );

    window.addEventListener("online", syncNow);

    return () => {
      mounted = false;
      subscription.unsubscribe();
      window.removeEventListener("online", syncNow);
    };
  }, [supabase]);

  // Helper function to upload files to private bucket
const uploadFile = async (
  bucket: string,
  path: string,
  fileObject: File | Blob
): Promise<string | null> => {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, fileObject, {
        upsert: true,
        contentType: fileObject.type || "image/png",
      });

    if (error) {
      console.error("Upload error:", error);
      throw error;
    }

    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path);

    console.log("Uploaded image URL:", urlData.publicUrl);

    return urlData.publicUrl;
  } catch (error: any) {
    console.error("File upload failed:", error.message);
    return null;
  }
};

  const isDuplicateName = async (name: string, currentId?: string): Promise<boolean> => {
    const normalized = name.trim().toUpperCase();
    let query = supabase.from("Vessels").select("id").eq("vessel_name", normalized);

    if (currentId) {
      query = query.neq("id", currentId);
    }

    const { data, error } = await query.limit(1);
    if (error) {
      console.error("Duplicate check failed:", error);
      return false;
    }

    return (data?.length ?? 0) > 0;
  };

  const login = async (email: string, password: string) => {
    const sanitizedEmail = email.toLowerCase().trim();
    
    try {
      if (navigator.onLine) {
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email: sanitizedEmail,
          password
        });

        if (authError) throw authError;
        if (!authData.user) throw new Error("No authenticated user found");

        try {
          const { aquaOfflineDB } = await import("../../../offline/db");
          const db = await aquaOfflineDB;
          if (db.objectStoreNames.contains("offline_users")) {
            await db.put("offline_users", {
              email: sanitizedEmail,
              password,
              user: authData.user,
            });
          }
        } catch (dbErr) {
          console.error("Failed storing offline user credential:", dbErr);
        }

       await initializeUser(authData.user);

localStorage.setItem(
  `password_${sanitizedEmail}`,
  password
);

return;
      }
    } catch (onlineErr) {
      console.warn("Online login failed or offline mode triggered, attempting local DB sign-in...", onlineErr);
    }

    try {
      const { aquaOfflineDB } = await import("../../../offline/db");
      const db = await aquaOfflineDB;
      
      let offlineUserRecord = null;
      if (db.objectStoreNames.contains("offline_users")) {
        offlineUserRecord = await db.get("offline_users", sanitizedEmail);
      }

      if (offlineUserRecord && offlineUserRecord.password === password) {
        await initializeUser(offlineUserRecord.user);
        return;
      }

      let personnelProfiles: any[] = [];
      if (db.objectStoreNames.contains("personnel_profiles")) {
        personnelProfiles = await db.getAll("personnel_profiles");
      }
      
      const matchedProfile = personnelProfiles.find(
  (p:any)=>
    p.email?.toLowerCase().trim() === sanitizedEmail &&
    p.offline_password === password
);


if (matchedProfile) {

  if (
    matchedProfile.profile_status !== "approved"
  ) {
    throw new Error(
      "Inspector account is not approved."
    );
  }


  const simulatedUser = {
    id: matchedProfile.id,
    email: matchedProfile.email,
    user_metadata:{
      name: matchedProfile.name,
      id_number: matchedProfile.id_number
    }
  };


  await initializeUser(simulatedUser);
  return;
}

      throw new Error("No offline session credentials found. Please connect to the internet to sign in for the first time.");
    } catch (offlineErr) {
      console.error("Offline login failed:", offlineErr);
      throw offlineErr;
    }
  };

  const logout = async () => {
    if (navigator.onLine) {
      await supabase.auth.signOut();
    }
    setCurrentUser(null);
  };

  const resetPassword = async (email: string, newPassword: string): Promise<boolean> => {
    const sanitizedEmail = email.toLowerCase().trim();
    const userExists = inspectors.some(ins => ins.email.toLowerCase().trim() === sanitizedEmail);
    if (userExists) {
      setInspectors(prev => prev.map(ins => ins.email.toLowerCase().trim() === sanitizedEmail ? { ...ins, password: newPassword } : ins));
      return true;
    }
    return false;
  };

  const getExpirationStatus = (expiryDate: string | undefined): ExpirationStatus => {
    if (!expiryDate) return { label: 'No Date', color: 'text-slate-400', urgent: false, daysRemaining: 0 };
    const diffDays = Math.ceil((new Date(expiryDate).getTime() - new Date().setHours(0,0,0,0)) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return { label: 'Expired', color: 'text-red-600', urgent: true, daysRemaining: diffDays };
    if (diffDays <= 30) return { label: `${diffDays} Days`, color: 'text-amber-500', urgent: true, daysRemaining: diffDays };
    return { label: 'Active', color: 'text-emerald-600', urgent: false, daysRemaining: diffDays };
  };

  const addVessel = async (vData: any): Promise<Vessel | null> => {
    try {
      vData.vessel_name = (vData.vessel_name || "").trim().toUpperCase();
      vData.owner_name = (vData.owner_name || "").trim().toUpperCase();

      let registration_no: string | null = vData.registration_no || null;
      let id: string = vData.id || crypto.randomUUID();

      // Skip duplicate name validation entirely if it's a re-registration (i.e. vData.id is provided)
      if (vData.asset_category === "vessel" && vData.vessel_name && !vData.id) {
        const duplicate = await isDuplicateName(vData.vessel_name);
        if (duplicate) throw new Error("Vessel name already exists.");
      }

      if (vData.asset_category === "vessel") {
        if (!registration_no) {
          registration_no = await generateNextRM();
          id = registration_no ?? id;
        }
      } else if (vData.asset_category === "pangulong") {
        if (!registration_no) {
          const { data } = await supabase.from("Vessels").select("id").like("id", "PG-%");
          const numbers = (data || []).map(v => Number(v.id.replace("PG-", ""))).filter(n => !isNaN(n));
          const next = numbers.length ? Math.max(...numbers) + 1 : 1;
          registration_no = `PG-${String(next).padStart(4, "0")}`;
          id = registration_no ?? id;
        }
      } else if (vData.asset_category === "payao") {
        if (!registration_no) {
          const { data } = await supabase.from("Vessels").select("id").like("id", "PY-%");
          const numbers = data?.map(v => Number(v.id.split("-")[1])).filter(n => !isNaN(n)) ?? [];
          const next = numbers.length ? Math.max(...numbers) + 1 : 1;
          registration_no = `PY-${String(next).padStart(2, "0")}`;
          id = registration_no ?? id;
        }
      } else if (vData.asset_category === "gears") {
        if (!registration_no) {
          const { data } = await supabase.from("Vessels").select("id").like("id", "FG-%");
          const numbers = (data || []).map(v => Number(v.id.replace("FG-", ""))).filter(n => !isNaN(n));
          const next = numbers.length ? Math.max(...numbers) + 1 : 1;
          registration_no = `FG-${String(next).padStart(4, "0")}`;
          id = registration_no ?? id;
        }
      }

      const dbPayload: Vessel = {
        id,
        registration_no,
        vessel_name: vData.vessel_name || null,
        owner_name: vData.owner_name,
        owner_age: Number(vData.owner_age) || 0,
        asset_category: vData.asset_category,
        type: vData.type || vData.asset_category,
        gear_type: vData.gear_type || null,
        barangay: (vData.barangay || "").trim().toUpperCase(),
        sitio: (vData.sitio || "").trim().toUpperCase(),
        cp_number: vData.cp_number || null,
        is_motorized: vData.asset_category === "vessel" ? Boolean(vData.is_motorized) : false,
        place_of_built: vData.place_of_built || null,
        year_built: vData.year_built ? Number(vData.year_built) : null,
        hull_length: vData.asset_category === "vessel" ? Number(vData.hull_length) || 0 : 0,
        hull_width: vData.asset_category === "vessel" ? Number(vData.hull_width) || 0 : 0,
        hull_depth: vData.asset_category === "vessel" ? Number(vData.hull_depth) || 0 : 0,
        tonnage_gross: vData.asset_category === "vessel" ? Number(vData.tonnage_gross) || 0 : 0,
        tonnage_net: vData.asset_category === "vessel" ? Number(vData.tonnage_net) || 0 : 0,
        barangay_clearance: vData.barangay_clearance || null,
        cedula: vData.cedula || null,
        valid_id: vData.valid_id || null,
        bfar_permit: vData.bfar_permit || null,
        marina_permit: vData.marina_permit || null,
        boat_builder_no: vData.boat_builder_no || "",
        units_in_words: vData.units_in_words || "",
        permit_fee: vData.permit_fee || "",
        official_no: vData.official_no || null,
        payment_date: vData.payment_date || null,
        number_of_boats: vData.number_of_boats || "",
        boat_name: vData.boat_name || "",
        status: vData.status || "Pending",
        created_at: vData.created_at || new Date().toISOString()
      };

      if (navigator.onLine) {
        const { data, error } = await supabase.from("Vessels").upsert([dbPayload]).select();
        if (error) throw error;

        if (data) {
          setVessels(prev => [data[0], ...prev.filter(v => v.id !== data[0].id)]);
        }
      } else {
        const { aquaOfflineDB } = await import("../../../offline/db");
        const db = await aquaOfflineDB;
        const offlineVessel = { ...dbPayload, sync_status: "pending_insert" };
        if (db.objectStoreNames.contains("Vessels")) {
          await db.put("Vessels", offlineVessel);
        }
        setVessels(prev => [offlineVessel as Vessel, ...prev.filter(v => v.id !== offlineVessel.id)]);
      }

      return dbPayload as Vessel;
    } catch (error) {
      console.error("Failed adding vessel:", error);
      throw error;
    }
  };

  const updateVessel = async (id: string, updates: Partial<Vessel>): Promise<boolean> => {
    const { id: _, created_at, ...updateData } = updates;
    const sanitizedUpdates = { ...updateData, updated_at: new Date().toISOString() };

    if (navigator.onLine) {
      const { data, error } = await supabase
        .from("Vessels")
        .update(sanitizedUpdates)
        .eq("id", id)
        .select();

      if (error) {
        console.error(error);
        throw error;
      }

      if (!data || data.length === 0) {
        throw new Error(`No vessel found with ID ${id}`);
      }
    } else {
      try {
        const { aquaOfflineDB } = await import("../../../offline/db");
        const db = await aquaOfflineDB;
        if (db.objectStoreNames.contains("Vessels")) {
          const existing = await db.get("Vessels", id);
          if (existing) {
            const updatedRecord = { ...existing, ...sanitizedUpdates, sync_status: "pending_update" };
            await db.put("Vessels", updatedRecord);

            if (sanitizedUpdates.status === 'Passed' || sanitizedUpdates.status === 'REGISTERED') {
              if (db.objectStoreNames.contains("offline_audit_permits")) {
                await db.put("offline_audit_permits", {
                  id: `audit_${id}_${Date.now()}`,
                  vessel_id: id,
                  action: sanitizedUpdates.status,
                  payload: updatedRecord,
                  created_at: new Date().toISOString(),
                  sync_status: "pending"
                });
              }
            }
          }
        }
      } catch (e) {
        console.warn("Offline DB write skipped:", e);
      }
    }
    
    setVessels(prev => prev.map(v => v.id === id ? { ...v, ...sanitizedUpdates } : v));
    return true;
  };

  const updateVesselStatus = async (
    id: string,
    newStatus: Vessel["status"]
  ) => {
    setVessels(prev =>
      prev.map(v =>
        v.id === id
          ? { ...v, status: newStatus }
          : v
      )
    );

    if (navigator.onLine) {
      const { error } = await supabase
        .from("Vessels")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;
    } else {
      try {
        const { aquaOfflineDB } = await import("../../../offline/db");
        const db = await aquaOfflineDB;
        if (db.objectStoreNames.contains("Vessels")) {
        const vessel = await db.get("Vessels", id);
          if (vessel) {
            const updatedVessel = { ...vessel, status: newStatus, updated_at: new Date().toISOString(), sync_status: "pending_update" };
            await db.put("Vessels", updatedVessel);

            setVessels(prev =>
                prev.map(v =>
                  v.id === id
                    ? updatedVessel
                    : v
                )
              );
await db.add("syncQueue", {
  action:"UPDATE",
  table:"Vessels",
  id:id,
  data:updatedVessel,
  created_at:new Date().toISOString()
});

            if (newStatus === 'Passed' || newStatus === 'REGISTERED') {
              if (db.objectStoreNames.contains("offline_audit_permits")) {
                await db.put("offline_audit_permits", {
                  id: `audit_${id}_${Date.now()}`,
                  vessel_id: id,
                  action: newStatus,
                  payload: updatedVessel,
                  created_at: new Date().toISOString(),
                  sync_status: "pending"
                });
              }
            }
          }
        }
      } catch (e) {
        console.warn("Offline DB write skipped:", e);
      }
    }
  };

 const deleteVessel = async (id: string) => {
  // Optimistic UI update: Remove from React state immediately
  setVessels((prev: any[]) =>
    prev.filter((v: any) => String(v.id) !== String(id))
  );

  try {
    if (navigator.onLine) {
      const { error } = await supabase.from('Vessels').delete().eq('id', id);
      if (error) throw error;
    } else {
      try {
        const { aquaOfflineDB } = await import("../../../offline/db");
        const db = await aquaOfflineDB;
        if (db.objectStoreNames.contains("Vessels")) {
          const vessel = await db.get("Vessels", id);
          if (vessel) {
            await db.put("Vessels", { ...vessel, sync_status: "pending_delete" });
          }
        }
      } catch (e) {
        console.warn("Offline DB write skipped:", e);
      }
    }

    return true;
  } catch (error) {
    console.error('deleteVessel error:', error);
    throw error;
  }
};

  const approveVessel = async (id: string, name: string, remarks?: string): Promise<boolean> => {
    return await updateVessel(id, { status: 'Passed', assigned_inspector: name, remarks });
  };

  const completeInspection = async (id: string, orNumber: string, remarks?: string): Promise<boolean> => {
    if (!currentUser) throw new Error("No authenticated inspector found.");

    return await updateVessel(id, {
      status: 'Passed',
      or_number: orNumber,
      inspected_by: currentUser.id,
      assigned_inspector: currentUser.name,
      remarks,
      inspection_date: new Date().toISOString()
    });
  };


  const scheduleInspection = async (
    vesselId: string,
    inspectorIdNumber: string,
    dateStr: string
  ) => {
    const updatePayload: Partial<Vessel> = {
      status: "Scheduled",
      assigned_inspector: inspectorIdNumber,
      inspection_date: dateStr,
    };

    await updateVessel(vesselId, updatePayload);
    return [Vessels.find(v => v.id === vesselId)];
  };

  const finalizeRegistry = async (id: string, orNumber: string, date: string, remarks?: string): Promise<boolean> => {
    return await updateVessel(id, { status: 'REGISTERED', or_number: orNumber, inspection_date: date, remarks });
  };

  const requestRegistration = async (formData: any, userId: string, idFile?: File | Blob) => {
    try {
      let idImageUrl = null;
      if (idFile && navigator.onLine) {
        const idPath = `${userId}/${Date.now()}.png`;
        idImageUrl = await uploadFile('id-scans', idPath, idFile);
      }

      const dbPayload = {
        id: userId,
        id_number: formData.id_number,
        name: formData.name,
        email: formData.email,
        cellphone: formData.cellphone,
        age: Number(formData.age),
        sex: formData.sex,
        barangay: formData.barangay,
        position: formData.position,
        years_in_service: Number(formData.yearsInService),
        profile_status: 'pending',
        municipal_id_image: idImageUrl,
        role: 'inspector',
        created_at: new Date().toISOString()
      };

      if (navigator.onLine) {
        const { error } = await supabase.from('personnel_profiles').insert([dbPayload]);
        if (error) return false;
      } else {
        const { aquaOfflineDB } = await import("../../../offline/db");
        const db = await aquaOfflineDB;
        if (db.objectStoreNames.contains("personnel_profiles")) {
          await db.put("personnel_profiles", { ...dbPayload, sync_status: "pending_insert" });
        }
      }

      await fetchDatabaseData();
      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  const updateInspectorStatus = async (id: string, status: Inspector["status"]) => {
    setInspectors(prev => prev.map(ins => ins.id === id ? { ...ins, status } : ins));

    if (navigator.onLine) {
      const { error } = await supabase.from("personnel_profiles").update({ profile_status: status }).eq("id", id);
      if (error) throw error;
    } else {
      try {
        const { aquaOfflineDB } = await import("../../../offline/db");
        const db = await aquaOfflineDB;
        if (db.objectStoreNames.contains("personnel_profiles")) {
          const profile = await db.get("personnel_profiles", id);
          if (profile) {
            await db.put("personnel_profiles", { ...profile, profile_status: status, sync_status: "pending_update" });
          }
        }
      } catch (e) {
        console.warn("Offline DB write skipped:", e);
      }
    }
  };

  const deleteInspector = async (id: string): Promise<void> => {
    setInspectors(prev => prev.filter(ins => ins.id !== id));

    if (navigator.onLine) {
      const { error } = await supabase.from('personnel_profiles').delete().eq('id', id);
      if (error) throw error;
    } else {
      try {
        const { aquaOfflineDB } = await import("../../../offline/db");
        const db = await aquaOfflineDB;
        if (db.objectStoreNames.contains("personnel_profiles")) {
          const profile = await db.get("personnel_profiles", id);
          if (profile) {
            await db.put("personnel_profiles", { ...profile, sync_status: "pending_delete" });
          }
        }
      } catch (e) {
        console.warn("Offline DB write skipped:", e);
      }
    }
  };

  return (
    <AquaRegContext.Provider value={{ 
      supabase, currentUser, setCurrentUser, loading, authInitialized, login, logout, resetPassword, Vessels, 
      addVessel, updateVessel, updateVesselStatus, removeVessel: deleteVessel, generatePermitNo,
      inspectors, requestRegistration, updateInspectorStatus, deleteInspector, deleteVessel,
      approveVessel, scheduleInspection, finalizeRegistry, getExpirationStatus, isDuplicateName, completeInspection,
    }}>
      {children}
    </AquaRegContext.Provider>
  );
};

export const useAquaReg = () => {
  const context = useContext(AquaRegContext);
  if (!context) {
    throw new Error("AquaRegProvider is missing. Wrap your app with it.");
  }
  return context;
};

export const useAquaAuth = useAquaReg;
export const useAquaData = useAquaReg;