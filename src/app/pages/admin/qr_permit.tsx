import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../../../supabaseClient";
import {
  CheckCircle2,
  XCircle,
  ShieldCheck,
  Ship,
  FileText,
  User,
  CalendarDays,
  Hash
} from "lucide-react";

interface PermitVerification {
  permit_no: string | null;
  certificate_no: string | null;
  official_no: string | null;
  vessel_name: string | null;
  owner_name: string | null;
  asset_category: string | null;
  expiration_date: string | null;
  verification_status: string | null;
}

export default function VerifyPermit() {
  const { token } = useParams();

  const [permit, setPermit] =
    useState<PermitVerification | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    const verifyPermit = async () => {
      if (!token) {
        setError("Invalid verification code.");
        setLoading(false);
        return;
      }

      try {
        const { data, error } =
          await supabase.rpc("verify_permit", {
            p_token: token
          });

        if (error) {
          console.error("VERIFY PERMIT ERROR:", error);
          throw error;
        }

        const record =
          Array.isArray(data)
            ? data[0]
            : data;

        if (!record) {
          setError(
            "This permit could not be found or the verification code is invalid."
          );

          return;
        }

        setPermit(record);
      } catch (err) {
        console.error(err);

        setError(
          "Unable to verify this permit at this time."
        );
      } finally {
        setLoading(false);
      }
    };

    verifyPermit();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl shadow-xl p-10 text-center max-w-md w-full">
          <div className="animate-spin mx-auto mb-5 w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full" />

          <h1 className="text-xl font-black uppercase">
            Verifying Permit
          </h1>

          <p className="text-sm text-slate-500 mt-2">
            Please wait while we verify this permit.
          </p>
        </div>
      </div>
    );
  }

  if (error || !permit) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl shadow-xl p-10 text-center max-w-md w-full">

          <XCircle
            size={70}
            className="mx-auto text-red-500 mb-5"
          />

          <h1 className="text-2xl font-black uppercase text-red-600">
            Permit Not Verified
          </h1>

          <p className="text-sm text-slate-500 mt-3 leading-relaxed">
            {error ||
              "The permit information could not be verified."}
          </p>

          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-6">
            AquaReg Permit Verification
          </p>
        </div>
      </div>
    );
  }

  const status =
    String(
      permit.verification_status || "VALID"
    ).toUpperCase();

  const isValid =
    status === "VALID";

  const isExpired =
    status === "EXPIRED";

  return (
    <div className="min-h-screen bg-slate-100 py-8 px-4">

      <div className="max-w-2xl mx-auto">

        {/* HEADER */}

        <div className="bg-slate-900 rounded-t-3xl p-8 text-white text-center">

          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center">
              <ShieldCheck size={34} />
            </div>
          </div>

          <h1 className="text-2xl font-black uppercase italic">
            AquaReg
          </h1>

          <p className="text-xs uppercase tracking-[0.25em] text-slate-300 mt-2">
            Permit Verification
          </p>

        </div>


        {/* STATUS */}

        <div className="bg-white px-6 py-8">

          <div
            className={`rounded-2xl p-6 text-center border ${
              isValid
                ? "bg-emerald-50 border-emerald-200"
                : isExpired
                ? "bg-amber-50 border-amber-200"
                : "bg-red-50 border-red-200"
            }`}
          >

            {isValid ? (
              <CheckCircle2
                size={55}
                className="mx-auto text-emerald-600"
              />
            ) : (
              <XCircle
                size={55}
                className={`mx-auto ${
                  isExpired
                    ? "text-amber-600"
                    : "text-red-600"
                }`}
              />
            )}

            <h2
              className={`text-2xl font-black uppercase mt-4 ${
                isValid
                  ? "text-emerald-700"
                  : isExpired
                  ? "text-amber-700"
                  : "text-red-700"
              }`}
            >
              {isValid
                ? "VALID PERMIT"
                : isExpired
                ? "EXPIRED PERMIT"
                : "REVOKED PERMIT"}
            </h2>

            <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mt-2">
              Official AquaReg Verification
            </p>

          </div>


          {/* INFORMATION */}

          <div className="mt-8 space-y-4">

            <InfoRow
              icon={<FileText size={18} />}
              label="Permit No."
              value={permit.permit_no}
            />

            <InfoRow
              icon={<Hash size={18} />}
              label="Certificate No."
              value={permit.certificate_no}
            />

            <InfoRow
              icon={<Ship size={18} />}
              label="Official No."
              value={permit.official_no}
            />

            <InfoRow
              icon={<Ship size={18} />}
              label="Vessel / Asset"
              value={permit.vessel_name}
            />

            <InfoRow
              icon={<User size={18} />}
              label="Permit Holder"
              value={permit.owner_name}
            />

            <InfoRow
              icon={<FileText size={18} />}
              label="Asset Category"
              value={permit.asset_category}
            />

            <InfoRow
              icon={<CalendarDays size={18} />}
              label="Expiration Date"
              value={
                permit.expiration_date
                  ? new Date(
                      permit.expiration_date
                    ).toLocaleDateString(
                      "en-US",
                      {
                        month: "long",
                        day: "numeric",
                        year: "numeric"
                      }
                    )
                  : "N/A"
              }
            />

          </div>

        </div>


        {/* FOOTER */}

        <div className="bg-slate-50 rounded-b-3xl border-t p-6 text-center">

          <div className="flex items-center justify-center gap-2 text-slate-500">
            <ShieldCheck size={16} />

            <span className="text-[10px] font-black uppercase tracking-widest">
              Digitally Verified by AquaReg
            </span>
          </div>

          <p className="text-[9px] text-slate-400 mt-2">
            Municipality of Romblon
          </p>

        </div>

      </div>

    </div>
  );
}


/* ============================================================
   INFORMATION ROW
============================================================ */

function InfoRow({
  icon,
  label,
  value
}: {
  icon: React.ReactNode;
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100">

      <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-blue-600 shrink-0">
        {icon}
      </div>

      <div className="min-w-0">

        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
          {label}
        </p>

        <p className="font-black uppercase text-sm text-slate-900 break-words">
          {value || "N/A"}
        </p>

      </div>

    </div>
  );
}