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
  Hash,
  Database,
  AlertTriangle,
} from "lucide-react";

/* ============================================================
   TYPES
============================================================ */

interface PermitVerification {
  id?: string | null;

  permit_no: string | null;
  certificate_no: string | null;
  official_no: string | null;
  vessel_name: string | null;
  owner_name: string | null;
  asset_category: string | null;

  expiration_date: string | null;

  /*
    This is the status stored in permit_management.

    Expected examples:
      PASSED
      REGISTERED
      EXPIRED
      REVOKED
      PENDING
  */
  verification_status: string | null;

  qr_token?: string | null;
}

/* ============================================================
   VERIFICATION RESULT
============================================================ */

type VerificationResult =
  | "VALID"
  | "EXPIRED"
  | "NOT_PASSED"
  | "REVOKED"
  | "NOT_FOUND"
  | "ERROR";

/* ============================================================
   NORMALIZE QR TOKEN
============================================================ */

function normalizeToken(value: string | undefined): string {
  if (!value) {
    return "";
  }

  let normalized = value.trim();

  try {
    normalized = decodeURIComponent(normalized);
  } catch {
    // Keep original value if it is not URI encoded.
  }

  normalized = normalized
    .replace(/\/+$/, "")
    .trim();

  return normalized;
}

/* ============================================================
   FORMAT DATE
============================================================ */

function formatDate(value: string | null): string {
  if (!value) {
    return "N/A";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/* ============================================================
   CHECK EXPIRATION
============================================================ */

function isDateExpired(expirationDate: string | null): boolean {
  if (!expirationDate) {
    return false;
  }

  const expiration = new Date(expirationDate);

  if (Number.isNaN(expiration.getTime())) {
    return false;
  }

  /*
    Compare dates only.

    This prevents a permit from becoming expired in the middle
    of the expiration day because of the current time.
  */
  const today = new Date();

  const todayOnly = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );

  const expirationOnly = new Date(
    expiration.getFullYear(),
    expiration.getMonth(),
    expiration.getDate()
  );

  return expirationOnly < todayOnly;
}

/* ============================================================
   NORMALIZE DATABASE STATUS
============================================================ */

function normalizeStatus(
  value: string | null | undefined
): string {
  return String(value || "")
    .trim()
    .toUpperCase();
}

/* ============================================================
   DETERMINE VERIFICATION RESULT
============================================================ */

function determineVerificationResult(
  permit: PermitVerification
): VerificationResult {
  const status = normalizeStatus(
    permit.verification_status
  );

  /*
    EXPIRED DATE ALWAYS WINS.

    Even if the database still contains REGISTERED,
    the permit cannot be presented as currently valid after
    its expiration date.
  */
  if (isDateExpired(permit.expiration_date)) {
    return "EXPIRED";
  }

  /*
    Explicitly revoked statuses.
  */
  if (
    status === "REVOKED" ||
    status === "CANCELLED" ||
    status === "CANCELED" ||
    status === "INVALID"
  ) {
    return "REVOKED";
  }

  /*
    These are the statuses that AquaReg considers passed/
    successfully registered for QR verification.
  */
  if (
    status === "PASSED" ||
    status === "REGISTERED" ||
    status === "VALID"
  ) {
    return "VALID";
  }

  /*
    Anything else is not considered a valid permit.

    Examples:
      PENDING
      SCHEDULED
      FLAGGED
      TO FOLLOW
      null
      empty
  */
  return "NOT_PASSED";
}

/* ============================================================
   MAIN COMPONENT
============================================================ */

export default function VerifyPermit() {
  const { token } = useParams<{ token: string }>();

  const [permit, setPermit] =
    useState<PermitVerification | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [verificationResult, setVerificationResult] =
    useState<VerificationResult>("ERROR");

  /*
    This is intentionally TRUE only after Supabase successfully
    returned the permit.

    The QR itself is NEVER treated as database confirmation.
  */
  const [isLiveConfirmed, setIsLiveConfirmed] =
    useState(false);

  /* ==========================================================
     VERIFY AGAINST DATABASE
  ========================================================== */

  useEffect(() => {
    let cancelled = false;

    const verifyPermit = async () => {
      setLoading(true);
      setError("");
      setPermit(null);
      setVerificationResult("ERROR");
      setIsLiveConfirmed(false);

      const normalizedToken =
        normalizeToken(token);

      console.log(
        "AquaReg verification token:",
        normalizedToken
      );

      /* --------------------------------------------------------
         INVALID TOKEN
      -------------------------------------------------------- */

      if (!normalizedToken) {
        if (!cancelled) {
          setError(
            "Invalid or missing QR verification code."
          );

          setVerificationResult("NOT_FOUND");
          setLoading(false);
        }

        return;
      }

      /* ========================================================
         STEP 1
         TRY THE VERIFY_PERMIT RPC
      ======================================================== */

      try {
        const {
          data: rpcData,
          error: rpcError,
        } = await supabase.rpc("verify_permit", {
          p_token: normalizedToken,
        });

        if (rpcError) {
          console.error(
            "AquaReg verify_permit RPC error:",
            rpcError
          );

          throw rpcError;
        }

        const rpcRecord =
          Array.isArray(rpcData)
            ? rpcData[0]
            : rpcData;

        if (rpcRecord) {
          const databasePermit =
            rpcRecord as PermitVerification;

          if (!cancelled) {
            const result =
              determineVerificationResult(
                databasePermit
              );

            setPermit(databasePermit);
            setVerificationResult(result);
            setIsLiveConfirmed(true);
            setLoading(false);
          }

          return;
        }

        throw new Error(
          "Verification RPC returned no permit."
        );
      } catch (rpcError) {
        console.warn(
          "RPC verification unavailable. Trying direct database lookup.",
          rpcError
        );
      }

      /* ========================================================
         STEP 2
         DIRECT DATABASE LOOKUP

         This is the important fallback.

         The QR token is matched against the actual
         permit_management.qr_token.
      ======================================================== */

      try {
        const {
          data,
          error: databaseError,
        } = await supabase
          .from("permit_management")
          .select(
            `
              id,
              permit_no,
              certificate_no,
              official_no,
              vessel_name,
              owner_name,
              asset_category,
              expiration_date,
              verification_status,
              qr_token
            `
          )
          .eq("qr_token", normalizedToken)
          .maybeSingle();

        if (databaseError) {
          console.error(
            "AquaReg database verification error:",
            databaseError
          );

          throw databaseError;
        }

        /* ------------------------------------------------------
           NO MATCHING RECORD
        ------------------------------------------------------ */

        if (!data) {
          if (!cancelled) {
            setPermit(null);

            setVerificationResult(
              "NOT_FOUND"
            );

            setError(
              "This QR verification code does not match any permit in the AquaReg database."
            );

            setIsLiveConfirmed(false);
            setLoading(false);
          }

          return;
        }

        /* ------------------------------------------------------
           DATABASE RECORD FOUND
        ------------------------------------------------------ */

        const databasePermit =
          data as PermitVerification;

        const result =
          determineVerificationResult(
            databasePermit
          );

        if (!cancelled) {
          setPermit(databasePermit);
          setVerificationResult(result);
          setIsLiveConfirmed(true);
          setLoading(false);
        }
      } catch (databaseError) {
        console.error(
          "AquaReg live verification failed:",
          databaseError
        );

        if (!cancelled) {
          setPermit(null);

          setVerificationResult("ERROR");

          setError(
            "The AquaReg database could not be reached. This permit cannot be verified at this time."
          );

          setIsLiveConfirmed(false);
          setLoading(false);
        }
      }
    };

    verifyPermit();

    return () => {
      cancelled = true;
    };
  }, [token]);

  /* ============================================================
     LOADING
  ============================================================ */

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl shadow-xl p-10 text-center max-w-md w-full">
          <div className="animate-spin mx-auto mb-5 w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full" />

          <h1 className="text-xl font-black uppercase text-slate-900">
            Verifying Permit
          </h1>

          <p className="text-sm text-slate-500 mt-2 leading-relaxed">
            Connecting to the AquaReg database and
            verifying the certificate.
          </p>

          <div className="flex items-center justify-center gap-2 mt-6 text-blue-600">
            <Database size={15} />

            <span className="text-[10px] font-black uppercase tracking-widest">
              Live Database Verification
            </span>
          </div>
        </div>
      </div>
    );
  }

  /* ============================================================
     NOT FOUND / DATABASE ERROR
  ============================================================ */

  if (
    !permit ||
    verificationResult === "NOT_FOUND" ||
    verificationResult === "ERROR"
  ) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden max-w-md w-full">
          {/* HEADER */}
          <div className="bg-slate-900 p-8 text-white text-center">
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

          {/* ERROR */}
          <div className="p-8 text-center">
            <XCircle
              size={70}
              className="mx-auto text-red-500 mb-5"
            />

            <h2 className="text-2xl font-black uppercase text-red-600">
              Permit Not Verified
            </h2>

            <p className="text-sm text-slate-500 mt-3 leading-relaxed">
              {error ||
                "The permit information could not be verified against the AquaReg database."}
            </p>

            <div className="mt-6 rounded-xl bg-red-50 border border-red-100 p-4">
              <div className="flex items-center justify-center gap-2 text-red-600">
                <AlertTriangle size={16} />

                <span className="text-[10px] font-black uppercase tracking-widest">
                  Database Verification Failed
                </span>
              </div>

              <p className="text-[10px] text-red-500 mt-2 leading-relaxed">
                A QR code alone is not accepted as proof
                of permit validity.
              </p>
            </div>

            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-6">
              AquaReg Permit Verification
            </p>

            <p className="text-[9px] text-slate-400 mt-2">
              Municipality of Romblon
            </p>
          </div>
        </div>
      </div>
    );
  }

  /* ============================================================
     RESULT STATES
  ============================================================ */

  const isValid =
    verificationResult === "VALID";

  const isExpired =
    verificationResult === "EXPIRED";

  const isNotPassed =
    verificationResult === "NOT_PASSED";

  const isRevoked =
    verificationResult === "REVOKED";

  /* ============================================================
     STATUS COLORS
  ============================================================ */

  const statusContainerClass =
    isValid
      ? "bg-emerald-50 border-emerald-200"
      : isExpired
      ? "bg-amber-50 border-amber-200"
      : "bg-red-50 border-red-200";

  const statusTitleClass =
    isValid
      ? "text-emerald-700"
      : isExpired
      ? "text-amber-700"
      : "text-red-700";

  const statusIconClass =
    isValid
      ? "text-emerald-600"
      : isExpired
      ? "text-amber-600"
      : "text-red-600";

  /* ============================================================
     STATUS TEXT
  ============================================================ */

  let statusTitle =
    "PERMIT NOT VERIFIED";

  let statusDescription =
    "This certificate has not been verified as a passed permit.";

  if (isValid) {
    statusTitle = "VALID PERMIT";

    statusDescription =
      "This permit is registered and currently valid in the AquaReg database.";
  }

  if (isExpired) {
    statusTitle = "EXPIRED PERMIT";

    statusDescription =
      "This permit is recorded in AquaReg but its expiration date has already passed.";
  }

  if (isRevoked) {
    statusTitle = "REVOKED PERMIT";

    statusDescription =
      "This permit has been revoked or cancelled in the AquaReg database.";
  }

  if (isNotPassed) {
    statusTitle = "CERTIFICATE NOT PASSED";

    statusDescription =
      "This certificate or permit has not been passed for verification in the AquaReg database.";
  }

  /* ============================================================
     MAIN VERIFIED PAGE
  ============================================================ */

  return (
    <div className="min-h-screen bg-slate-100 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* ======================================================
            HEADER
        ====================================================== */}

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

          {/* LIVE DATABASE BADGE */}

          {isLiveConfirmed && (
            <div className="mt-5 flex justify-center">
              <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-400/30 rounded-full px-4 py-2">
                <Database
                  size={13}
                  className="text-emerald-400"
                />

                <span className="text-[9px] font-black uppercase tracking-widest text-emerald-300">
                  Live Database Confirmed
                </span>
              </div>
            </div>
          )}
        </div>

        {/* ======================================================
            STATUS
        ====================================================== */}

        <div className="bg-white px-6 py-8">
          <div
            className={`rounded-2xl p-6 text-center border ${statusContainerClass}`}
          >
            {/* ICON */}

            {isValid ? (
              <CheckCircle2
                size={55}
                className={`mx-auto ${statusIconClass}`}
              />
            ) : isExpired ? (
              <AlertTriangle
                size={55}
                className={`mx-auto ${statusIconClass}`}
              />
            ) : (
              <XCircle
                size={55}
                className={`mx-auto ${statusIconClass}`}
              />
            )}

            {/* TITLE */}

            <h2
              className={`text-2xl font-black uppercase mt-4 ${statusTitleClass}`}
            >
              {statusTitle}
            </h2>

            {/* DESCRIPTION */}

            <p className="text-sm text-slate-600 mt-3 leading-relaxed max-w-lg mx-auto">
              {statusDescription}
            </p>

            {/* DATABASE CONFIRMATION */}

            {isLiveConfirmed && (
              <div className="flex items-center justify-center gap-2 mt-5 text-emerald-600">
                <Database size={13} />

                <p className="text-[9px] font-black uppercase tracking-widest">
                  Confirmed directly from AquaReg database
                </p>
              </div>
            )}
          </div>

          {/* ====================================================
              INFORMATION
          ==================================================== */}

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
              value={formatDate(
                permit.expiration_date
              )}
            />

            <InfoRow
              icon={<Database size={18} />}
              label="Database Status"
              value={
                normalizeStatus(
                  permit.verification_status
                ) || "N/A"
              }
            />
          </div>

          {/* ====================================================
              IMPORTANT VERIFICATION MESSAGE
          ==================================================== */}

          <div
            className={`mt-8 rounded-2xl border p-5 ${
              isValid
                ? "bg-emerald-50 border-emerald-200"
                : isExpired
                ? "bg-amber-50 border-amber-200"
                : "bg-red-50 border-red-200"
            }`}
          >
            <div className="flex items-start gap-3">
              {isValid ? (
                <CheckCircle2
                  size={20}
                  className="text-emerald-600 shrink-0 mt-0.5"
                />
              ) : isExpired ? (
                <AlertTriangle
                  size={20}
                  className="text-amber-600 shrink-0 mt-0.5"
                />
              ) : (
                <XCircle
                  size={20}
                  className="text-red-600 shrink-0 mt-0.5"
                />
              )}

              <div>
                <p
                  className={`text-xs font-black uppercase tracking-wider ${
                    isValid
                      ? "text-emerald-700"
                      : isExpired
                      ? "text-amber-700"
                      : "text-red-700"
                  }`}
                >
                  {isValid
                    ? "Official Database Verification"
                    : "Verification Notice"}
                </p>

                <p className="text-[11px] text-slate-600 mt-2 leading-relaxed">
                  {isValid
                    ? "The permit information displayed on this page was retrieved from the AquaReg permit database. The QR code itself is not being used as the source of validity."
                    : "The permit information is based on the current AquaReg database record. The QR code alone cannot establish permit validity."}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ======================================================
            FOOTER
        ====================================================== */}

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

          {isLiveConfirmed && (
            <div className="flex items-center justify-center gap-1.5 mt-3 text-emerald-600">
              <Database size={11} />

              <span className="text-[8px] font-black uppercase tracking-widest">
                Live database verification successful
              </span>
            </div>
          )}
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
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100">
      {/* ICON */}

      <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-blue-600 shrink-0">
        {icon}
      </div>

      {/* DATA */}

      <div className="min-w-0 flex-1">
        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
          {label}
        </p>

        <p className="font-black uppercase text-sm text-slate-900 break-words mt-0.5">
          {value || "N/A"}
        </p>
      </div>
    </div>
  );
}