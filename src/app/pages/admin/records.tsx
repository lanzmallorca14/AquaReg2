import { useState, useMemo } from 'react';
import type { ChangeEvent, FormEvent } from 'react';

import {
  User,
  MapPin,
  Phone,
  Box,
  FileText,
  ArrowLeft,
  Edit3,
  Search,
  Eye,
  UserPlus,
  Ship,
  History as HistoryIcon,
  CheckCircle2,
  X,
  Save,
  Waves,
  Settings2,
  Upload,
  Trash2,
  AlertTriangle,
  Printer,
  ClipboardCheck,
  BadgeCheck,
  CalendarDays,
  CreditCard,
  Hash,
  QrCode,
} from 'lucide-react';

import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';

import {
  useAquaData,
  useAquaAuth,
} from '../../components/context/AquaRegCONTEXT';

import { toast } from 'sonner';

/* =========================================================
   TYPES
========================================================= */

type SubType =
  | 'motorized'
  | 'non-motorized'
  | 'pangulong'
  | 'fishing-gear'
  | 'payao-balsa'
  | 'others';

/* =========================================================
   CATEGORY HELPER
========================================================= */

const getAssetCategory = (record: any): SubType => {
  if (!record) return 'fishing-gear';

  const vType = String(
    record.type ||
      record.assetType ||
      record.asset_category ||
      record.assetCategory ||
      record.coi?.vessel_type ||
      record.COI?.vessel_type ||
      ''
  ).toUpperCase();

  const assetCat = String(
    record.assetCategory || record.asset_category || ''
  ).toUpperCase();

  if (vType.includes('PANGULONG') || assetCat.includes('PANGULONG')) {
    return 'pangulong';
  }

  if (
    vType.includes('PAYAO') ||
    vType.includes('BALSA') ||
    assetCat.includes('PAYAO') ||
    assetCat.includes('BALSA')
  ) {
    return 'payao-balsa';
  }

  if (record.isMotorized === true || record.is_motorized === true) {
    return 'motorized';
  }

  if (
    vType.includes('NON-MOTORIZED') ||
    assetCat.includes('NON-MOTORIZED')
  ) {
    return 'non-motorized';
  }

  if (
    assetCat.includes('FISHING-GEAR') ||
    assetCat.includes('FISHING GEAR') ||
    vType.includes('FISHING-GEAR') ||
    vType.includes('FISHING GEAR')
  ) {
    return 'fishing-gear';
  }

  return 'fishing-gear';
};

/* =========================================================
   VESSEL / NON-VESSEL HELPER
   Permit / Payment section is restricted to non-vessel
   asset categories only: fishing-gear, payao-balsa, pangulong.
========================================================= */

const isVesselCategoryOf = (category: SubType) =>
  category === 'motorized' || category === 'non-motorized';

const showsPermitPayment = (category: SubType) =>
  category === 'fishing-gear' ||
  category === 'payao-balsa' ||
  category === 'pangulong';

/* =========================================================
   COI HELPER
========================================================= */

const getCOI = (record: any) => {
  return (
    record?.coi ||
    record?.COI ||
    record?.coiRecord ||
    record?.coi_record ||
    {}
  );
};

/* =========================================================
   ADDRESS HELPER
   Sitio + Barangay are always displayed together as a single
   "Sitio, Barangay" field — never shown separately.
========================================================= */

const formatSitioBarangay = (record: any) => {
  const sitio = record?.sitio || '';
  const barangay = record?.barangay || '';

  const combined = [sitio, barangay].filter(Boolean).join(', ');

  return combined || 'N/A';
};

/* =========================================================
   PERMIT HELPER
   Permit number is intentionally taken from the record/database.
========================================================= */

const getPermitNumber = (record: any) => {
  const permit =
    record?.permit_management || record?.permitManagement || record?.permit || {};

  return (
    permit?.permit_no ||
    permit?.permitNo ||
    permit?.permit_number ||
    record?.permit_no ||
    record?.permitNo ||
    record?.permit_number ||
    record?.coi?.permit_no ||
    record?.COI?.permit_no ||
    ''
  );
};

/* =========================================================
   QR CODE HELPER
   Renders the permit number as a scannable QR code.
========================================================= */

const getPermitQrUrl = (permitNo: string, size = 130) => {
  if (!permitNo) return '';

  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=0&data=${encodeURIComponent(
    permitNo
  )}`;
};

/* =========================================================
   NORMALIZE RECORD
========================================================= */

const normalizeRecord = (v: any) => {
  const coi = getCOI(v);

  const documents = v.documents || v.requirements || v.documentUrls || {};

  const permitManagement =
    v.permit_management || v.permitManagement || v.permit || {};

  const ownerName =
    coi.owner_name || v.ownerName || v.owner_name || v.owner || '';

  const vesselName =
    coi.vessel_name ||
    v.vesselName ||
    v.vessel_name ||
    v.name ||
    v.gear_type ||
    v.gearType ||
    '';

  const inspectorName =
    coi.inspector_name || v.inspector_name || v.inspectorName || '';

  const inspectedBy =
    coi.inspected_by ||
    v.inspected_by ||
    v.inspectedBy ||
    v.assigned_inspector ||
    '';

  const orNumber = coi.or_number || v.or_number || v.orNumber || '';

  const certificateNo =
    coi.certificate_no ||
    v.certificate_no ||
    v.certificateNo ||
    v.coi_no ||
    v.coiNo ||
    '';

  /*
   * IMPORTANT:
   * Permit number is resolved from permit_management first,
   * then from the vessel/COI record.
   */
  const permitNo =
    permitManagement.permit_no ||
    permitManagement.permitNo ||
    permitManagement.permit_number ||
    v.permit_no ||
    v.permitNo ||
    v.permit_number ||
    coi.permit_no ||
    '';

  const inspectionDate =
    coi.date_of_inspection ||
    coi.inspection_date ||
    v.inspection_date ||
    v.inspectionDate ||
    v.inspected_at ||
    null;

  /*
   * COI DATE intentionally removed from display.
   * We still preserve the raw value internally so existing
   * database records are not damaged.
   */
  const coiDate =
    coi.date || coi.coi_date || v.coi_date || v.coiDate || v.coi_issued_at || null;

  const sitio = coi.sitio || v.sitio || v.site || '';

  const barangay = coi.barangay || v.barangay || '';

  return {
    ...v,

    id: v.id,

    permit_management: permitManagement,

    coi: {
      ...coi,

      certificateNo,
      certificate_no: certificateNo,

      permitNo,
      permit_no: permitNo,

      orNumber,
      or_number: orNumber,

      ownerName,
      owner_name: ownerName,

      vesselName,
      vessel_name: vesselName,

      /*
       * Vessel Type kept internally only.
       * No longer displayed anywhere in the UI or print output
       * since it duplicated Asset Category / Category info.
       */
      vesselType: coi.vessel_type || v.vessel_type || v.vesselType || '',

      /*
       * Specific Gear intentionally removed from the UI.
       * The raw database value is preserved in the object.
       */

      barangay,

      sitio,

      engineMake: coi.engine_make || v.engine_make || v.engineMake || '',

      horsePower:
        coi.engine_hp ?? coi.horse_power ?? v.engine_hp ?? v.engineHp ?? '',

      serialNumber:
        coi.engine_serial ||
        coi.serial_number ||
        v.engine_serial ||
        v.engineSerial ||
        '',

      /*
       * Place of inspection is derived from SITIO + BARANGAY,
       * always shown together as one combined value.
       */
      placeOfInspection: [sitio, barangay].filter(Boolean).join(', '),

      dateOfInspection: inspectionDate,

      inspectorName,

      inspectorRole:
        coi.inspector_role || v.inspector_role || 'Fishery Law Enforcer',

      length: coi.hull_length ?? v.hull_length ?? v.hull?.length ?? v.length ?? 0,

      breadth: coi.hull_width ?? v.hull_width ?? v.hull?.width ?? v.width ?? 0,

      depth: coi.hull_depth ?? v.hull_depth ?? v.hull?.depth ?? v.depth ?? 0,

      grossTonnage:
        coi.gross_tonnage ??
        v.tonnage_gross ??
        v.gross_tonnage ??
        v.tonnage?.gross ??
        0,

      netTonnage:
        coi.net_tonnage ??
        v.tonnage_net ??
        v.net_tonnage ??
        v.tonnage?.net ??
        0,

      remarks: coi.remarks || v.remarks || v.remark || '',

      status:
        coi.status ||
        v.coi_status ||
        v.coiStatus ||
        v.certificate_status ||
        v.status ||
        '',
    },

    registrationNo:
      v.registration_no || v.registrationNo || v.registrationNumber || '',

    certificateNo,

    officialNo: v.official_no || v.officialNo || '',

    vesselName,

    ownerName,

    ownerFirstName: v.owner_first_name || v.ownerFirstName || '',

    ownerMiddleName: v.owner_middle_name || v.ownerMiddleName || '',

    ownerLastName: v.owner_last_name || v.ownerLastName || '',

    ownerSuffix: v.owner_suffix || v.ownerSuffix || '',

    ownerAge: v.owner_age ?? v.ownerAge ?? '',

    assetCategory:
      v.assetCategory || v.asset_category || coi.asset_category || '',

    assetType: v.assetType || v.asset_type || v.type || '',

    type: v.type || v.assetType || v.asset_type || '',

    gearType: v.gear_type || v.gearType || coi.specific_gear || '',

    isMotorized:
      v.isMotorized ??
      v.is_motorized ??
      String(coi.vessel_type || '').toLowerCase().includes('motorized'),

    phone: v.phone || v.cp_number || v.cpNumber || '',

    cpNumber: v.cp_number || v.cpNumber || v.phone || '',

    barangay,

    sitio,

    municipality: v.municipality || v.municipal || '',

    hull: {
      length: coi.hull_length ?? v.hull?.length ?? v.hull_length ?? v.length ?? 0,

      width: coi.hull_width ?? v.hull?.width ?? v.hull_width ?? v.width ?? 0,

      depth: coi.hull_depth ?? v.hull?.depth ?? v.hull_depth ?? v.depth ?? 0,
    },

    engine: {
      make: coi.engine_make ?? v.engine_make ?? v.engineMake ?? v.engine?.make ?? '',

      hp: coi.engine_hp ?? v.engine_hp ?? v.engineHp ?? v.engine?.hp ?? '',

      serial:
        coi.engine_serial ??
        v.engine_serial ??
        v.engineSerial ??
        v.engine?.serial ??
        '',
    },

    tonnage: {
      gross:
        coi.gross_tonnage ??
        v.tonnage?.gross ??
        v.tonnage_gross ??
        v.gross_tonnage ??
        v.grossTonnage ??
        0,

      net:
        coi.net_tonnage ??
        v.tonnage?.net ??
        v.tonnage_net ??
        v.net_tonnage ??
        v.netTonnage ??
        0,
    },

    documents,

    requirements: v.requirements || v.documents || v.documentUrls || {},

    createdAt: v.createdAt || v.created_at || null,

    updatedAt: v.updatedAt || v.updated_at || null,

    inspectedBy,

    inspectorName,

    inspectionDate,

    /*
     * Kept internally only.
     * Not displayed in the UI.
     */
    coiDate,

    coiStatus:
      coi.status || v.coi_status || v.coiStatus || v.certificate_status || '',

    coiNumber: certificateNo,

    permitNo,

    /*
     * Permit Processing status is intentionally simplified to a
     * single flat "VERIFIED" label wherever it is shown — see
     * showsPermitPayment() usage in the print + detail views.
     */
    expirationDate:
      v.expiration_date ||
      v.expirationDate ||
      v.permit_expiration ||
      permitManagement.expiration_date ||
      permitManagement.expirationDate ||
      '',

    orNumber,

    paymentStatus:
      v.payment_status ||
      v.paymentStatus ||
      permitManagement.payment_status ||
      permitManagement.paymentStatus ||
      '',

    remarks: coi.remarks || v.remarks || v.remark || '',

    status: v.status || coi.status || 'REGISTERED',
  };
};

/* =========================================================
   SAFE VALUE
========================================================= */

const displayValue = (value: any, fallback = 'N/A') => {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }

  return String(value);
};

/* =========================================================
   DATE FORMAT
========================================================= */

const formatDate = (value: any) => {
  if (!value) return 'N/A';

  try {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return String(value);
    }

    return date.toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return String(value);
  }
};

/* =========================================================
   PRINT HELPERS
========================================================= */

const escapeHtml = (value: any) => {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

const escapeAttribute = (value: any) => {
  return escapeHtml(value);
};

const printField = (label: string, value: any) => {
  return `
    <div class="field">
      <div class="label">${escapeHtml(label)}</div>
      <div class="value">${escapeHtml(displayValue(value))}</div>
    </div>
  `;
};

/* =========================================================
   PRINT RECORD
========================================================= */

const printRecord = (rawRecord: any) => {
  const record = normalizeRecord(rawRecord);

  const coi = record.coi || {};

  const category = getAssetCategory(record);

  const docs = record.requirements || record.documents || {};

  const barangayClearance =
    docs.barangayClearance ||
    docs.barangay_clearance ||
    record.barangay_clearance ||
    '';

  const cedula = docs.cedula || record.cedula || '';

  const validId = docs.validID || docs.valid_id || record.valid_id || '';

 

  const isVessel = isVesselCategoryOf(category);
  const showPermitPayment = showsPermitPayment(category);

  const documentRows = [
    { name: 'Barangay Clearance', value: barangayClearance },
    { name: 'Cedula', value: cedula },
    { name: 'Valid ID', value: validId },
    ...(isVessel
      ? []
      : [
        ]),
  ];

  const documentImages = documentRows
    .filter((doc) => doc.value)
    .map(
      (doc) => `
        <div class="document-card">
          <div class="document-title">${escapeHtml(doc.name)}</div>
          <img src="${escapeAttribute(doc.value)}" alt="${escapeAttribute(doc.name)}" />
        </div>
      `
    )
    .join('');

  const fullOwnerName = [
    record.ownerFirstName,
    record.ownerMiddleName,
    record.ownerLastName,
    record.ownerSuffix,
  ]
    .filter(Boolean)
    .join(' ');

  const ownerDisplay = fullOwnerName || coi.owner_name || record.ownerName;

  const addressDisplay = formatSitioBarangay(record);

  const permitNo = getPermitNumber(record);
  const permitQrUrl = getPermitQrUrl(permitNo);

  const certificateDisplay = record.certificateNo || record.coiNumber || '';

  const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8" />
<title>AquaReg Record - ${escapeHtml(record.id)}</title>
<style>
@page { size: A4; margin: 14mm; }
* { box-sizing: border-box; }
body {
  margin: 0; padding: 0; background: white; color: #0f172a;
  font-family: Arial, Helvetica, sans-serif; font-size: 11px;
}
.page { width: 100%; }
.header { border-bottom: 3px solid #0f172a; padding-bottom: 12px; margin-bottom: 18px; }
.header-top { display: flex; justify-content: space-between; align-items: flex-start; }
.office-title { font-size: 18px; font-weight: 900; text-transform: uppercase; letter-spacing: .5px; }
.office-subtitle { font-size: 9px; color: #64748b; font-weight: bold; text-transform: uppercase; margin-top: 3px; }
.document-title-main { text-align: right; font-size: 15px; font-weight: 900; text-transform: uppercase; }
.document-subtitle { text-align: right; font-size: 9px; color: #64748b; margin-top: 3px; }
.status-box {
  margin-top: 12px; padding: 8px 10px; border: 1px solid #cbd5e1; background: #f8fafc;
  display: flex; justify-content: space-between; gap: 10px; align-items: center;
}
.status-label { color: #64748b; font-size: 8px; font-weight: bold; text-transform: uppercase; }
.status-value { font-size: 11px; font-weight: 900; text-transform: uppercase; }
.section { margin-top: 18px; page-break-inside: avoid; }
.section-title {
  background: #0f172a; color: white; padding: 7px 9px; font-size: 9px; font-weight: 900;
  text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;
}
.grid { display: grid; grid-template-columns: repeat(2, 1fr); border-top: 1px solid #cbd5e1; border-left: 1px solid #cbd5e1; }
.grid.three { grid-template-columns: repeat(3, 1fr); }
.field { border-right: 1px solid #cbd5e1; border-bottom: 1px solid #cbd5e1; padding: 7px 8px; min-height: 43px; }
.label { color: #64748b; font-size: 7px; font-weight: 900; text-transform: uppercase; letter-spacing: .5px; margin-bottom: 4px; }
.value { font-size: 10px; font-weight: 800; text-transform: uppercase; word-break: break-word; }
.coi-box { border: 2px solid #0f172a; padding: 12px; margin-top: 8px; }
.coi-heading { text-align: center; font-size: 15px; font-weight: 900; text-transform: uppercase; margin-bottom: 4px; }
.coi-office { text-align: center; font-size: 8px; color: #64748b; font-weight: bold; text-transform: uppercase; margin-bottom: 12px; }
.coi-status { text-align: center; margin-bottom: 12px; font-size: 12px; font-weight: 900; text-transform: uppercase; }
.documents { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
.document-card { border: 1px solid #cbd5e1; padding: 6px; page-break-inside: avoid; }
.document-title { font-size: 8px; font-weight: 900; text-transform: uppercase; margin-bottom: 6px; text-align: center; }
.document-card img { width: 100%; height: 145px; object-fit: contain; display: block; background: #f8fafc; }
.audit-item { border: 1px solid #cbd5e1; padding: 8px; margin-bottom: 6px; display: flex; justify-content: space-between; align-items: center; }
.audit-label { font-weight: 900; text-transform: uppercase; font-size: 9px; }
.audit-date { color: #64748b; font-size: 8px; }
.signature-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 35px; margin-top: 50px; }
.signature { text-align: center; border-top: 1px solid #0f172a; padding-top: 6px; }
.signature-name { font-size: 9px; font-weight: 900; text-transform: uppercase; }
.signature-role { font-size: 8px; color: #64748b; text-transform: uppercase; }
.footer { border-top: 1px solid #cbd5e1; margin-top: 25px; padding-top: 7px; text-align: center; color: #64748b; font-size: 7px; }
.qr-box { display: flex; flex-direction: column; align-items: center; gap: 4px; }
.qr-box img { width: 78px; height: 78px; }
.qr-caption { font-size: 7px; font-weight: 900; text-transform: uppercase; color: #64748b; }
@media print {
  body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .section { page-break-inside: avoid; }
  .document-card { page-break-inside: avoid; }
}
</style>
</head>
<body>
<div class="page">

  <div class="header">
    <div class="header-top">
      <div>
        <div class="office-title">AQUA REG</div>
        <div class="office-subtitle">Digital Boat Registry</div>
        <div class="office-subtitle">Department of Agriculture • Romblon</div>
      </div>
      <div>
        <div class="document-title-main">OFFICIAL RECORD</div>
        <div class="document-subtitle">MARINE ASSET REGISTRATION RECORD</div>
      </div>
    </div>

    <div class="status-box">
      <div>
        <div class="status-label">Registry ID</div>
        <div class="status-value">${escapeHtml(displayValue(record.id))}</div>
      </div>
      <div>
        <div class="status-label">Registration Status</div>
        <div class="status-value">${escapeHtml(displayValue(record.status))}</div>
      </div>
      <div>
        <div class="status-label">Asset Category</div>
        <div class="status-value">${escapeHtml(category.replace(/-/g, ' '))}</div>
      </div>
      ${
        permitQrUrl
          ? `
      <div class="qr-box">
        <img src="${escapeAttribute(permitQrUrl)}" alt="Permit QR Code" />
        <div class="qr-caption">${escapeHtml(permitNo)}</div>
      </div>
      `
          : ''
      }
    </div>
  </div>


  <div class="section">
    <div class="section-title">Registration Information</div>
    <div class="grid">
      ${printField('Registration Number', record.registrationNo)}
      ${printField('Certificate / COI Number', certificateDisplay)}
      ${printField('Official Number', record.officialNo)}
      ${printField('Permit Number', permitNo)}
      ${printField('Expiration Date', formatDate(record.expirationDate))}
      ${printField('Registration Date', formatDate(record.createdAt))}
    </div>
  </div>


  <div class="section">
    <div class="section-title">Client / Owner Information</div>
    <div class="grid">
      ${printField('Legal Owner', ownerDisplay)}
      ${printField('Owner Age', record.ownerAge)}
      ${printField('Contact Number', record.cpNumber)}
      ${printField('Sitio, Barangay', addressDisplay)}
      ${printField('Municipality', record.municipality)}
    </div>
  </div>


  <div class="section">
    <div class="section-title">Marine Asset Particulars</div>
    <div class="grid">
      ${printField('Vessel / Asset Name', coi.vessel_name || record.vesselName)}
      ${printField('Asset Category', category.replace(/-/g, ' '))}
      ${printField('Asset Type', record.assetType)}
      ${printField('Motorized', record.isMotorized ? 'YES' : 'NO')}
      ${printField('Remarks', coi.remarks || record.remarks)}
    </div>
  </div>


  ${
    isVessel
      ? `
  <div class="section">
    <div class="section-title">Certificate of Inspection</div>
    <div class="coi-box">
      <div class="coi-heading">CERTIFICATION OF INSPECTION</div>
      <div class="coi-office">Republic of the Philippines • Province of Romblon • Office of Municipal Agriculturist</div>
      <div class="coi-status">
        STATUS: ${escapeHtml(displayValue(coi.status || record.coiStatus || record.status, 'COMPLETED'))}
      </div>

      <div class="grid">
        ${printField('Permit No.', permitNo)}
        ${printField('Certificate No.', certificateDisplay)}
        ${printField('O.R. No.', coi.or_number || record.orNumber)}
        ${printField('Owner Name', coi.owner_name || ownerDisplay)}
        ${printField('Sitio, Barangay', addressDisplay)}
        ${printField('Vessel / Asset Name', coi.vessel_name || record.vesselName)}
        ${printField('Engine Make', coi.engine_make || record.engine.make)}
        ${printField(
          'Horse Power',
          (coi.engine_hp ?? record.engine.hp) !== ''
            ? `${displayValue(coi.engine_hp ?? record.engine.hp)} HP`
            : ''
        )}
        ${printField('Serial Number', coi.engine_serial || record.engine.serial)}
        ${printField('Place of Inspection', addressDisplay)}
        ${printField('Date of Inspection', formatDate(coi.date_of_inspection || record.inspectionDate))}
        ${printField('Inspector Name', coi.inspector_name || record.inspectorName)}
        ${printField('Inspector Role', coi.inspector_role || 'Fishery Law Enforcer')}
      </div>

      <div style="margin-top:12px; margin-bottom:8px; font-size:8px; font-weight:900; text-transform:uppercase; color:#64748b;">
        BOAT PARTICULARS
      </div>

      <div class="grid three">
        ${printField(
          'Length',
          (coi.hull_length ?? record.hull.length) !== ''
            ? `${displayValue(coi.hull_length ?? record.hull.length)} meters`
            : ''
        )}
        ${printField(
          'Breadth',
          (coi.hull_width ?? record.hull.width) !== ''
            ? `${displayValue(coi.hull_width ?? record.hull.width)} meters`
            : ''
        )}
        ${printField(
          'Depth',
          (coi.hull_depth ?? record.hull.depth) !== ''
            ? `${displayValue(coi.hull_depth ?? record.hull.depth)} meters`
            : ''
        )}
        ${
          category === 'motorized'
            ? `
        ${printField('Gross Tonnage', coi.gross_tonnage ?? record.tonnage.gross)}
        ${printField('Net Tonnage', coi.net_tonnage ?? record.tonnage.net)}
        `
            : ''
        }
        ${printField('Remarks', coi.remarks || record.remarks)}
      </div>
    </div>
  </div>
  `
      : ''
  }


  ${
    isVessel
      ? `
  <div class="section">
    <div class="section-title">Hull Dimensions</div>
    <div class="grid three">
      ${printField('Length', `${displayValue(record.hull.length, '0')} meters`)}
      ${printField('Breadth / Width', `${displayValue(record.hull.width, '0')} meters`)}
      ${printField('Depth', `${displayValue(record.hull.depth, '0')} meters`)}
    </div>
  </div>
  `
      : ''
  }


  ${
    category === 'motorized'
      ? `
  <div class="section">
    <div class="section-title">Tonnage Particulars</div>
    <div class="grid">
      ${printField('Gross Tonnage', coi.gross_tonnage ?? record.tonnage.gross)}
      ${printField('Net Tonnage', coi.net_tonnage ?? record.tonnage.net)}
    </div>
  </div>
  `
      : ''
  }


  ${
    category === 'motorized'
      ? `
  <div class="section">
    <div class="section-title">Engine Details</div>
    <div class="grid three">
      ${printField('Engine Make', coi.engine_make || record.engine.make)}
      ${printField(
        'Horsepower',
        (coi.engine_hp ?? record.engine.hp) !== ''
          ? `${displayValue(coi.engine_hp ?? record.engine.hp)} HP`
          : ''
      )}
      ${printField('Engine Serial Number', coi.engine_serial || record.engine.serial)}
    </div>
  </div>
  `
      : ''
  }


  ${
    isVessel
      ? `
  <div class="section">
    <div class="section-title">Physical Inspection Record</div>
    <div class="grid">
      ${printField('Inspection Status', coi.status || record.status || 'PASSED')}
      ${printField('Date of Inspection', formatDate(coi.date_of_inspection || record.inspectionDate))}
      ${printField('Inspector Name', coi.inspector_name || record.inspectorName)}
      ${printField('Inspector ID', coi.inspected_by || record.inspectedBy)}
      ${printField('Inspector Role', coi.inspector_role || 'Fishery Law Enforcer')}
      ${printField('Place of Inspection', addressDisplay)}
      ${printField('Inspection Remarks', coi.remarks || record.remarks)}
      ${printField('Last Updated', formatDate(record.updatedAt))}
    </div>
  </div>
  `
      : ''
  }


  ${
    showPermitPayment
      ? `
  <div class="section">
    <div class="section-title">Permit / Payment Information</div>
    <div class="grid">
      ${printField('Permit Number', permitNo)}
      ${printField('Certificate Number', certificateDisplay)}
      ${printField('Official Receipt Number', coi.or_number || record.orNumber)}
      ${printField('Expiration Date', formatDate(record.expirationDate))}
      ${printField('Payment Status', 'VERIFIED')}
      ${printField('Permit Processing', 'VERIFIED')}
    </div>
    ${
      permitQrUrl
        ? `
    <div class="qr-box" style="margin-top:10px;">
      <img src="${escapeAttribute(permitQrUrl)}" alt="Permit QR Code" />
      <div class="qr-caption">Scan to verify Permit No. ${escapeHtml(permitNo)}</div>
    </div>
    `
        : ''
    }
  </div>
  `
      : ''
  }


  <div class="section">
    <div class="section-title">Registered Documents / Requirements</div>
    ${
      documentImages
        ? `<div class="documents">${documentImages}</div>`
        : `<div class="field">No uploaded document images available.</div>`
    }
  </div>


  <div class="section">
    <div class="section-title">System Audit History</div>

    <div class="audit-item">
      <div>
        <div class="audit-label">Registration Initialized</div>
        <div class="audit-date">${formatDate(record.createdAt)}</div>
      </div>
      <strong>COMPLETED</strong>
    </div>

    <div class="audit-item">
      <div>
        <div class="audit-label">Document Verification</div>
        <div class="audit-date">${formatDate(record.createdAt)}</div>
      </div>
      <strong>VERIFIED</strong>
    </div>

    ${
      isVessel
        ? `
    <div class="audit-item">
      <div>
        <div class="audit-label">Physical Inspection</div>
        <div class="audit-date">${formatDate(coi.date_of_inspection || record.inspectionDate)}</div>
      </div>
      <strong>${escapeHtml(displayValue(coi.status || record.status, 'PASSED'))}</strong>
    </div>

    <div class="audit-item">
      <div>
        <div class="audit-label">Certificate of Inspection</div>
        <div class="audit-date">${formatDate(coi.date_of_inspection || record.inspectionDate)}</div>
      </div>
      <strong>${escapeHtml(certificateDisplay || 'COMPLETED')}</strong>
    </div>
    `
        : ''
    }

    ${
      showPermitPayment
        ? `
    <div class="audit-item">
      <div>
        <div class="audit-label">Permit Processing</div>
        <div class="audit-date">${formatDate(record.updatedAt || record.createdAt)}</div>
      </div>
      <strong>VERIFIED</strong>
    </div>
    `
        : ''
    }
  </div>


  <div class="signature-grid">
    <div class="signature">
      <div class="signature-name">${escapeHtml(displayValue(coi.inspector_name || record.inspectorName, '---'))}</div>
      <div class="signature-role">Fishery Law Enforcer</div>
    </div>
    <div class="signature">
      <div class="signature-name">______________________________</div>
      <div class="signature-role">Authorized Officer</div>
    </div>
  </div>


  <div class="footer">
    AQUA REG • DIGITAL BOAT REGISTRY • DEPARTMENT OF AGRICULTURE • ROMBLON
    <br />
    Printed on: ${formatDate(new Date())}
    <br />
    This document is a system-generated record. Verify the official record through the AquaReg system.
  </div>

</div>

<script>
window.onload = function() {
  setTimeout(function() { window.print(); }, 500);
};
window.onafterprint = function() {
  setTimeout(function() { window.close(); }, 300);
};
</script>
</body>
</html>
`;

  const printWindow = window.open('', '_blank', 'width=1000,height=900');

  if (!printWindow) {
    toast.error('Unable to Print', {
      description: 'Please allow pop-ups for AquaReg and try again.',
    });

    return;
  }

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
};

/* =========================================================
   MAIN PAGE
========================================================= */

export default function RecordsPage() {
  const { Vessels = [], deleteVessel } = useAquaData();

  const { currentUser } = useAquaAuth();

  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);

  const [searchTerm, setSearchTerm] = useState('');

  const [isManualEntryOpen, setIsManualEntryOpen] = useState(false);

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDeleteRecord = (id: string, name: string) => {
    if (typeof deleteVessel === 'function') {
      deleteVessel(id);
    }

    toast.success('Record Deleted', {
      description: `${name} (${id}) was removed from the registry.`,
    });

    if (selectedRecord?.id === id) {
      setSelectedRecord(null);
    }

    setDeletingId(null);
  };

  const approvedRecords = useMemo(() => {
    return Vessels.map(normalizeRecord)
      .filter((v: any) => {
        const status = String(v.status || '').toUpperCase();

        const isPassedOrRegistered =
          status === 'PASSED' || status === 'REGISTERED' || status === 'READY';

        if (!isPassedOrRegistered) {
          return false;
        }

        const userIdentifier = String(currentUser?.idNumber || currentUser?.id || '')
          .trim()
          .toUpperCase();

        const userName = String(currentUser?.name || '').trim().toUpperCase();

        const userRole = String(currentUser?.role || '').trim().toUpperCase();

        const isInspectorRole =
          userRole === 'INSPECTOR' ||
          userRole.includes('INSPECTOR') ||
          userRole.includes('LAW ENFORCER');

        if (isInspectorRole && userIdentifier) {
          const recordInspectorId = String(v.inspectedBy || '').trim().toUpperCase();

          const recordInspectorName = String(v.inspectorName || '').trim().toUpperCase();

          const matchesId = recordInspectorId === userIdentifier;

          const matchesName =
            Boolean(userName) && recordInspectorName.includes(userName);

          if (!matchesId && !matchesName) {
            return false;
          }
        }

        return true;
      })
      .filter((v: any) =>
        [
          v.vesselName,
          v.ownerName,
          v.id,
          v.registrationNo,
          v.certificateNo,
          v.officialNo,
          v.permitNo,
        ].some((field) =>
          String(field || '').toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
  }, [Vessels, searchTerm, currentUser]);

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto">
        {selectedRecord ? (
          <DetailView
            record={selectedRecord}
            onBack={() => setSelectedRecord(null)}
            onDelete={(id: string, name: string) => handleDeleteRecord(id, name)}
          />
        ) : (
          <RegistryView
            data={approvedRecords}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            onSelect={setSelectedRecord}
            onOpenManualEntry={() => setIsManualEntryOpen(true)}
            onConfirmDelete={(id: string) => setDeletingId(id)}
          />
        )}
      </div>

      {isManualEntryOpen && (
        <ManualEntryModal onClose={() => setIsManualEntryOpen(false)} />
      )}

      {deletingId && (
        <DeleteConfirmModal
          id={deletingId}
          record={Vessels.find((v: any) => v.id === deletingId)}
          onClose={() => setDeletingId(null)}
          onConfirm={(id: string, name: string) => handleDeleteRecord(id, name)}
        />
      )}
    </div>
  );
}

/* =========================================================
   REGISTRY LIST VIEW
========================================================= */

function RegistryView({
  data,
  searchTerm,
  setSearchTerm,
  onSelect,
  onOpenManualEntry,
  onConfirmDelete,
}: any) {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter leading-none">
            Official Registry
          </h2>
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em] mt-1">
            Management of Certified Marine Assets
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={onOpenManualEntry}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] uppercase rounded-xl h-11 px-6 shadow-lg shadow-blue-200 transition-all active:scale-95"
          >
            <UserPlus size={16} className="mr-2" />
            Manual Entry
          </Button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />

          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by vessel, owner name, RM-ID, certificate, or permit..."
            className="w-full bg-slate-50 border border-slate-100 rounded-xl py-3 pl-12 text-slate-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/10 uppercase"
          />
        </div>

        <div className="px-4 flex items-center bg-slate-50 rounded-xl text-[10px] font-black text-slate-400 uppercase tracking-widest border">
          {data.length} Records Found
        </div>
      </div>

      <div className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b text-[10px] font-black text-slate-400 uppercase tracking-widest">
              <tr>
                <th className="px-8 py-5">Asset Details</th>
                <th className="px-8 py-5">Client / Owner</th>
                <th className="px-8 py-5">Category</th>
                <th className="px-8 py-5">COI</th>
                <th className="px-8 py-5">Permit</th>
                <th className="px-8 py-5 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {data.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-8 py-16 text-center">
                    <Box size={40} className="mx-auto text-slate-200 mb-3" />
                    <p className="text-sm font-black uppercase text-slate-400">
                      No Registered Records
                    </p>
                    <p className="text-[10px] font-bold uppercase text-slate-300 mt-1">
                      Approved records will appear here.
                    </p>
                  </td>
                </tr>
              ) : (
                data.map((record: any) => {
                  const category = getAssetCategory(record);

                  const isVesselRow = isVesselCategoryOf(category);

                  const coi = getCOI(record);

                  const coiNumber = isVesselRow
                    ? coi.certificate_no ||
                      record.coiNumber ||
                      record.certificateNo ||
                      ''
                    : '';

                  const permitNo = getPermitNumber(record);

                  return (
                    <tr
                      key={record.id}
                      className="hover:bg-slate-50/50 transition-colors group cursor-pointer"
                      onClick={() => onSelect(record)}
                    >
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-slate-100 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-all">
                            {isVesselRow ? <Ship size={20} /> : <Waves size={20} />}
                          </div>

                          <div>
                            <span className="block text-sm font-black text-slate-800 uppercase leading-none">
                              {record.vesselName || record.name || record.gearType || 'Unnamed Asset'}
                            </span>
                            <span className="text-[10px] font-mono font-bold text-slate-400 italic">
                              {record.id}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="px-8 py-5 font-bold uppercase text-xs text-slate-700">
                        {record.ownerName || record.owner || 'N/A'}
                      </td>

                      <td className="px-8 py-5">
                        <Badge className="bg-slate-100 text-slate-500 font-black uppercase text-[8px] px-2 py-1 border-none">
                          {category.replace(/-/g, ' ')}
                        </Badge>
                      </td>

                      <td className="px-8 py-5">
                        {!isVesselRow ? (
                          <span className="text-[9px] font-black uppercase text-slate-300">
                            Not Applicable
                          </span>
                        ) : coiNumber ? (
                          <div className="flex items-center gap-2">
                            <BadgeCheck size={15} className="text-emerald-500" />
                            <span className="text-[10px] font-black text-slate-700 uppercase">
                              {coiNumber}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[9px] font-black uppercase text-slate-400">
                            COI COMPLETED
                          </span>
                        )}
                      </td>

                      <td className="px-8 py-5">
                        {permitNo ? (
                          <div className="flex items-center gap-2">
                            <CreditCard size={15} className="text-blue-500" />
                            <span className="text-[10px] font-black text-slate-700 uppercase">
                              {permitNo}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[9px] font-black uppercase text-slate-300">
                            No Permit
                          </span>
                        )}
                      </td>

                      <td className="px-8 py-5 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Print Complete Record and COI"
                            onClick={() => printRecord(record)}
                            className="text-slate-300 hover:text-emerald-600 hover:bg-emerald-50"
                          >
                            <Printer size={18} />
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            title="View Record"
                            onClick={() => onSelect(record)}
                            className="text-slate-300 hover:text-blue-600"
                          >
                            <Eye size={18} />
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            title="Delete Record"
                            onClick={() => onConfirmDelete(record.id)}
                            className="text-slate-300 hover:text-red-600 hover:bg-red-50"
                          >
                            <Trash2 size={18} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   DELETE MODAL
========================================================= */

function DeleteConfirmModal({ id, record, onClose, onConfirm }: any) {
  const name = record?.vesselName || record?.vessel_name || record?.name || id;

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100 text-center animate-in zoom-in-95">
        <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertTriangle size={24} />
        </div>

        <h3 className="text-lg font-black text-slate-900 uppercase italic">Confirm Deletion</h3>

        <p className="text-xs font-medium text-slate-500 mt-2">
          Are you sure you want to delete{' '}
          <strong className="text-slate-900">{name}</strong>{' '}(
          <span className="font-mono">{id}</span>)?
          <br />
          This action cannot be undone.
        </p>

        <div className="flex gap-3 mt-6">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1 rounded-xl h-11 font-bold text-xs uppercase"
          >
            Cancel
          </Button>

          <Button
            onClick={() => onConfirm(id, name)}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-xl h-11 font-bold text-xs uppercase"
          >
            Delete Record
          </Button>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   MANUAL ENTRY
========================================================= */

function ManualEntryModal({ onClose }: { onClose: () => void }) {
  const { addVessel } = useAquaData();

  const { currentUser } = useAquaAuth();

  const [form, setForm] = useState({
    vesselName: '',
    ownerName: '',
    phone: '',
    barangay: '',
    sitio: '',
    assetCategory: 'motorized',
    isMotorized: true,
    length: '',
    width: '',
    depth: '',
    grossTonnage: '',
    netTonnage: '',
    engineMake: '',
    engineHp: '',
    engineSerial: '',
  });

  const [images, setImages] = useState({
    barangayClearance: '',
    cedula: '',
    validID: '',
    marinaPermit: '',
    bfarPermit: '',
  });

  const handleCategoryChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;

    setForm((prev) => ({
      ...prev,
      assetCategory: val,
      isMotorized: val === 'motorized',
    }));
  };

  const handleImageUpload = (
    key: keyof typeof images,
    e: ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];

    if (!file) return;

    const reader = new FileReader();

    reader.onloadend = () => {
      setImages((prev) => ({ ...prev, [key]: reader.result as string }));
    };

    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    if (!form.vesselName.trim() || !form.ownerName.trim()) {
      toast.error('Required Fields Missing', {
        description: 'Please enter at least the vessel/asset name and owner name.',
      });

      return;
    }

    const newId = `RM-${Date.now().toString().slice(-6)}`;

    const now = new Date().toISOString();

    const newRecord = {
      id: newId,
      registration_no: newId,
      vessel_name: form.vesselName,
      owner_name: form.ownerName,
      phone: form.phone,
      cp_number: form.phone,
      barangay: form.barangay,
      sitio: form.sitio,
      asset_category: form.assetCategory,
      is_motorized: form.assetCategory === 'motorized',

      hull: {
        length: Number(form.length) || 0,
        width: Number(form.width) || 0,
        depth: Number(form.depth) || 0,
      },

      tonnage: {
        gross: Number(form.grossTonnage) || 0,
        net: Number(form.netTonnage) || 0,
      },

      engine: {
        make: form.engineMake,
        hp: form.engineHp,
        serial: form.engineSerial,
      },

      engine_make: form.engineMake,
      engine_hp: form.engineHp,
      engine_serial: form.engineSerial,

      documents: {
        barangayClearance: images.barangayClearance,
        barangay_clearance: images.barangayClearance,
        cedula: images.cedula,
        validID: images.validID,
        valid_id: images.validID,
        marinaPermit: images.marinaPermit,
        marina_permit: images.marinaPermit,
        bfarPermit: images.bfarPermit,
        bfar_permit: images.bfarPermit,
      },

      requirements: {
        barangayClearance: images.barangayClearance,
        cedula: images.cedula,
        validID: images.validID,
        marinaPermit: images.marinaPermit,
        bfarPermit: images.bfarPermit,
      },

      status: 'REGISTERED',
      createdAt: now,
      created_at: now,

      inspected_by: currentUser?.idNumber || currentUser?.id || '',
      inspector_name: currentUser?.name || '',
    };

    if (typeof addVessel === 'function') {
      addVessel(newRecord);
    }

    toast.success('Record Created Successfully', {
      description: `New asset registered under ${newId}`,
    });

    onClose();
  };

  const isVessel = form.assetCategory === 'motorized' || form.assetCategory === 'non-motorized';

  return (
    <div className="fixed inset-0 z-[120] flex justify-end">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-2xl bg-white h-full shadow-2xl p-8 overflow-y-auto">
        <div className="flex justify-between items-center mb-6 border-b pb-4">
          <div>
            <h3 className="text-xl font-black uppercase italic tracking-tighter text-slate-900">
              Manual Entry Registration
            </h3>
            <p className="text-[10px] font-bold uppercase text-slate-400">
              Directly add a new marine asset record
            </p>
          </div>

          <Button variant="ghost" size="icon" onClick={onClose}>
            <X />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <SectionTitle title="Client Identity" />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputGroup
              label="Owner Full Name *"
              value={form.ownerName}
              onChange={(val: string) => setForm({ ...form, ownerName: val })}
            />

            <InputGroup
              label="Phone / Mobile"
              value={form.phone}
              onChange={(val: string) => setForm({ ...form, phone: val })}
            />

            <InputGroup
              label="Barangay Address"
              value={form.barangay}
              onChange={(val: string) => setForm({ ...form, barangay: val })}
            />

            <InputGroup
              label="Sitio"
              value={form.sitio}
              onChange={(val: string) => setForm({ ...form, sitio: val })}
            />
          </div>

          <SectionTitle title="Asset Details" />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputGroup
              label="Vessel / Asset Name *"
              value={form.vesselName}
              onChange={(val: string) => setForm({ ...form, vesselName: val })}
            />

            <div className="space-y-1">
              <Label className="text-[9px] font-black uppercase text-slate-400">Category</Label>

              <select
                value={form.assetCategory}
                onChange={handleCategoryChange}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl h-11 px-3 text-xs font-bold text-slate-800 uppercase focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value="motorized">Motorized Vessel</option>
                <option value="non-motorized">Non-Motorized Vessel</option>
                <option value="pangulong">Pangulong</option>
                <option value="fishing-gear">Fishing Gear</option>
                <option value="payao-balsa">Payao / Balsa</option>
                <option value="others">Others</option>
              </select>
            </div>
          </div>

          {isVessel && (
            <>
              <SectionTitle title="Hull Dimensions (Meters)" />

              <div className="grid grid-cols-3 gap-4">
                <InputGroup
                  label="Length"
                  type="number"
                  value={form.length}
                  onChange={(val: string) => setForm({ ...form, length: val })}
                />

                <InputGroup
                  label="Width"
                  type="number"
                  value={form.width}
                  onChange={(val: string) => setForm({ ...form, width: val })}
                />

                <InputGroup
                  label="Depth"
                  type="number"
                  value={form.depth}
                  onChange={(val: string) => setForm({ ...form, depth: val })}
                />
              </div>
            </>
          )}

          {form.assetCategory === 'motorized' && (
            <>
              <SectionTitle title="Tonnage Particulars" />

              <div className="grid grid-cols-2 gap-4">
                <InputGroup
                  label="Gross Tonnage"
                  type="number"
                  value={form.grossTonnage}
                  onChange={(val: string) => setForm({ ...form, grossTonnage: val })}
                />

                <InputGroup
                  label="Net Tonnage"
                  type="number"
                  value={form.netTonnage}
                  onChange={(val: string) => setForm({ ...form, netTonnage: val })}
                />
              </div>

              <SectionTitle title="Engine Details" />

              <div className="grid grid-cols-3 gap-4">
                <InputGroup
                  label="Engine Make"
                  value={form.engineMake}
                  onChange={(val: string) => setForm({ ...form, engineMake: val })}
                />

                <InputGroup
                  label="Horsepower (HP)"
                  value={form.engineHp}
                  onChange={(val: string) => setForm({ ...form, engineHp: val })}
                />

                <InputGroup
                  label="Serial Number"
                  value={form.engineSerial}
                  onChange={(val: string) => setForm({ ...form, engineSerial: val })}
                />
              </div>
            </>
          )}

          <SectionTitle title="Document Attachments (Images)" />

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <ImageUploaderBox
              label="Barangay Clearance"
              imageSrc={images.barangayClearance}
              onUpload={(e) => handleImageUpload('barangayClearance', e)}
              onRemove={() => setImages((prev) => ({ ...prev, barangayClearance: '' }))}
            />

            <ImageUploaderBox
              label="Cedula"
              imageSrc={images.cedula}
              onUpload={(e) => handleImageUpload('cedula', e)}
              onRemove={() => setImages((prev) => ({ ...prev, cedula: '' }))}
            />

            <ImageUploaderBox
              label="Valid ID"
              imageSrc={images.validID}
              onUpload={(e) => handleImageUpload('validID', e)}
              onRemove={() => setImages((prev) => ({ ...prev, validID: '' }))}
            />

          
          </div>

          <div className="pt-4 border-t">
            <Button
              type="submit"
              className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-blue-200 transition-all active:scale-95"
            >
              <Save size={18} />
              Register Asset
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* =========================================================
   IMAGE UPLOADER
========================================================= */

function ImageUploaderBox({
  label,
  imageSrc,
  onUpload,
  onRemove,
}: {
  label: string;
  imageSrc: string;
  onUpload: (e: ChangeEvent<HTMLInputElement>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-[9px] font-black uppercase text-slate-400">{label}</Label>

      <div className="relative aspect-[4/3] rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden group hover:border-blue-400 transition-colors">
        {imageSrc ? (
          <>
            <img src={imageSrc} alt={label} className="w-full h-full object-cover" />

            <button
              type="button"
              onClick={onRemove}
              className="absolute top-2 right-2 bg-slate-900/80 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
            >
              <X size={14} />
            </button>
          </>
        ) : (
          <label className="flex flex-col items-center justify-center cursor-pointer w-full h-full p-2 text-center">
            <Upload size={20} className="text-slate-400 mb-1 group-hover:text-blue-600 transition-colors" />
            <span className="text-[9px] font-bold text-slate-500 uppercase">Attach Photo</span>

            <input type="file" accept="image/*" onChange={onUpload} className="hidden" />
          </label>
        )}
      </div>
    </div>
  );
}

/* =========================================================
   DETAIL VIEW
========================================================= */

function DetailView({
  record,
  onBack,
  onDelete,
}: {
  record: any;
  onBack: () => void;
  onDelete: (id: string, name: string) => void;
}) {
  const { updateVessel } = useAquaData();

  const [isEditing, setIsEditing] = useState(false);

  const [viewingImage, setViewingImage] = useState<string | null>(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const normalizedRecord = useMemo(() => normalizeRecord(record), [record]);

  const coi = normalizedRecord.coi || {};

  const categoryIdentifier = useMemo(
    () => getAssetCategory(normalizedRecord),
    [normalizedRecord]
  );

  const isVesselCategory = isVesselCategoryOf(categoryIdentifier);

  const isMotorized = categoryIdentifier === 'motorized';

  const showCOI = isVesselCategory;

  const showPermitPayment = showsPermitPayment(categoryIdentifier);

  const permitNo = getPermitNumber(normalizedRecord);

  const permitQrUrl = getPermitQrUrl(permitNo);

  const addressDisplay = formatSitioBarangay(normalizedRecord);

  const [formData, setFormData] = useState<any>({
    ...normalizedRecord,

    ownerName: normalizedRecord.ownerName || normalizedRecord.owner || '',

    vesselName:
      normalizedRecord.vesselName ||
      normalizedRecord.name ||
      normalizedRecord.gearType ||
      '',

    phone: normalizedRecord.phone || '',

    hull: {
      length: normalizedRecord.hull?.length || '',
      width: normalizedRecord.hull?.width || '',
      depth: normalizedRecord.hull?.depth || '',
    },

    tonnage: {
      gross: normalizedRecord.tonnage?.gross || '',
      net: normalizedRecord.tonnage?.net || '',
    },

    engine: {
      make: normalizedRecord.engine?.make || '',
      hp: normalizedRecord.engine?.hp || '',
      serial: normalizedRecord.engine?.serial || '',
    },
  });

  const handleSave = () => {
    updateVessel(record.id, formData);

    setIsEditing(false);

    toast.success('Record Updated', {
      description: 'Client and asset particulars synchronized.',
    });
  };

  const docs = normalizedRecord.requirements || normalizedRecord.documents || {};

  const barangayClearanceImg =
    docs.barangayClearance || docs.barangay_clearance || normalizedRecord.barangay_clearance || null;

  const cedulaImg = docs.cedula || normalizedRecord.cedula || null;

  const validIdImg = docs.validID || docs.valid_id || normalizedRecord.valid_id || null;

  

  return (
    <div className="space-y-8 animate-in slide-in-from-right duration-500 pb-20 relative">
      {isEditing && (
        <div className="fixed inset-0 z-[110] flex justify-end">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsEditing(false)} />

          <div className="relative w-full max-w-xl bg-white h-full shadow-2xl p-8 overflow-y-auto">
            <div className="flex justify-between items-center mb-8 border-b pb-4">
              <h3 className="text-xl font-black uppercase italic tracking-tighter text-slate-900">
                Edit Record: {formData.id}
              </h3>

              <Button variant="ghost" size="icon" onClick={() => setIsEditing(false)}>
                <X />
              </Button>
            </div>

            <div className="space-y-8">
              <SectionTitle title="Client Personal Information" />

              <div className="grid grid-cols-1 gap-4">
                <InputGroup
                  label="Full Legal Name"
                  value={formData.ownerName}
                  onChange={(val: string) => setFormData({ ...formData, ownerName: val })}
                />

                <InputGroup
                  label="Contact Number"
                  value={formData.phone}
                  onChange={(val: string) => setFormData({ ...formData, phone: val })}
                />

                <InputGroup
                  label="Barangay Address"
                  value={formData.barangay || ''}
                  onChange={(val: string) => setFormData({ ...formData, barangay: val })}
                />

                <InputGroup
                  label="Sitio"
                  value={formData.sitio || ''}
                  onChange={(val: string) => setFormData({ ...formData, sitio: val })}
                />
              </div>

              <SectionTitle title="Asset Particulars" />

              <div className="grid grid-cols-1 gap-4">
                <InputGroup
                  label="Vessel / Gear Name"
                  value={formData.vesselName}
                  onChange={(val: string) => setFormData({ ...formData, vesselName: val })}
                />

                {isVesselCategory && (
                  <div className="grid grid-cols-3 gap-4">
                    <InputGroup
                      label="Length (m)"
                      value={formData.hull.length}
                      onChange={(val: string) =>
                        setFormData({ ...formData, hull: { ...formData.hull, length: val } })
                      }
                      type="number"
                    />

                    <InputGroup
                      label="Breadth (m)"
                      value={formData.hull.width}
                      onChange={(val: string) =>
                        setFormData({ ...formData, hull: { ...formData.hull, width: val } })
                      }
                      type="number"
                    />

                    <InputGroup
                      label="Depth (m)"
                      value={formData.hull.depth}
                      onChange={(val: string) =>
                        setFormData({ ...formData, hull: { ...formData.hull, depth: val } })
                      }
                      type="number"
                    />
                  </div>
                )}
              </div>

              {isMotorized && (
                <>
                  <SectionTitle title="Tonnage Particulars" />

                  <div className="grid grid-cols-2 gap-4">
                    <InputGroup
                      label="Gross Tonnage"
                      value={formData.tonnage.gross}
                      onChange={(val: string) =>
                        setFormData({ ...formData, tonnage: { ...formData.tonnage, gross: val } })
                      }
                      type="number"
                    />

                    <InputGroup
                      label="Net Tonnage"
                      value={formData.tonnage.net}
                      onChange={(val: string) =>
                        setFormData({ ...formData, tonnage: { ...formData.tonnage, net: val } })
                      }
                      type="number"
                    />
                  </div>
                </>
              )}

              <Button
                onClick={handleSave}
                className="w-full h-14 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                <Save size={18} />
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      )}

      {viewingImage && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-slate-900/90 backdrop-blur-md"
          onClick={() => setViewingImage(null)}
        >
          <img
            src={viewingImage}
            alt="Document View"
            className="max-w-full max-h-[85vh] rounded-2xl border-8 border-white shadow-2xl animate-in zoom-in-95"
          />
        </div>
      )}

      {isDeleteModalOpen && (
        <DeleteConfirmModal
          id={record.id}
          record={record}
          onClose={() => setIsDeleteModalOpen(false)}
          onConfirm={(id: string, name: string) => onDelete(id, name)}
        />
      )}

      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <Button
          variant="ghost"
          onClick={onBack}
          className="text-slate-400 font-black text-[10px] uppercase hover:text-blue-600 transition-colors"
        >
          <ArrowLeft size={16} className="mr-2" />
          Registry Home
        </Button>

        <div className="flex flex-wrap gap-2 justify-end">
          <Button
            onClick={() => printRecord(normalizedRecord)}
            variant="outline"
            className="border-emerald-200 text-emerald-600 hover:bg-emerald-50 rounded-xl h-11 px-5 font-black text-[10px] uppercase tracking-widest transition-all"
          >
            <Printer size={14} className="mr-2" />
            Print Record & COI
          </Button>

          <Button
            onClick={() => setIsDeleteModalOpen(true)}
            variant="outline"
            className="border-red-200 text-red-600 hover:bg-red-50 rounded-xl h-11 px-4 font-black text-[10px] uppercase tracking-widest transition-all"
          >
            <Trash2 size={14} className="mr-2" />
            Delete Record
          </Button>

          <Button
            onClick={() => setIsEditing(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-11 px-6 font-black text-[10px] uppercase tracking-widest shadow-lg shadow-blue-100 transition-all active:scale-95"
          >
            <Edit3 size={14} className="mr-2" />
            Update Client Info
          </Button>
        </div>
      </div>

      <header className="bg-white rounded-[2.5rem] border border-slate-200 p-10 flex flex-col md:flex-row gap-10 items-center shadow-sm relative overflow-hidden">
        <Ship size={240} className="absolute -right-10 top-0 opacity-[0.05] text-blue-600" />

        <div className="w-32 h-32 rounded-3xl bg-slate-900 flex items-center justify-center text-4xl font-black text-emerald-400 italic shadow-xl text-center">
          {formData.vesselName?.charAt(0)}
        </div>

        <div className="text-center md:text-left">
          <h1 className="text-4xl font-black text-slate-900 uppercase italic tracking-tighter leading-none">
            {formData.vesselName}
          </h1>

          <div className="flex flex-wrap gap-2 mt-3 justify-center md:justify-start">
            <Badge className="bg-blue-600 text-white font-black uppercase text-[9px] px-3 border-none">
              {formData.id}
            </Badge>

            <Badge className="bg-slate-100 text-slate-500 font-black uppercase text-[9px] px-3 border-none">
              {categoryIdentifier.replace(/-/g, ' ')}
            </Badge>

            <Badge className="bg-emerald-100 text-emerald-600 font-black uppercase text-[9px] px-3 border-none">
              {formData.status}
            </Badge>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 space-y-6">
          <CardWrapper title="Client Identity" icon={<User size={16} />}>
            <InfoRow label="Legal Owner" value={formData.ownerName} icon={<User size={14} />} />
            <InfoRow label="Contact" value={formData.phone} icon={<Phone size={14} />} />
            <InfoRow label="Sitio, Barangay" value={addressDisplay} icon={<MapPin size={14} />} />
          </CardWrapper>

          <CardWrapper title="Technical Specs" icon={<Settings2 size={16} />}>
            {isVesselCategory && (
              <div className="grid grid-cols-3 gap-3 mb-6">
                <MetricBox label="L (m)" value={coi.hull_length ?? formData.hull.length} />
                <MetricBox label="B (m)" value={coi.hull_width ?? formData.hull.width} />
                <MetricBox label="D (m)" value={coi.hull_depth ?? formData.hull.depth} />
              </div>
            )}

            {isMotorized && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <MetricBox label="Gross Ton" value={coi.gross_tonnage ?? formData.tonnage.gross} />
                  <MetricBox label="Net Ton" value={coi.net_tonnage ?? formData.tonnage.net} />
                </div>

              </>
            )}

            {!isVesselCategory && !isMotorized && (
              <p className="text-xs font-bold text-slate-400 italic text-center py-4">
                No hull or tonnage specs required for this asset type.
              </p>
            )}
          </CardWrapper>

          {showCOI && (
            <CardWrapper title="Inspection & COI" icon={<ClipboardCheck size={16} />}>
              <InfoRow
                label="Inspector"
                value={coi.inspector_name || normalizedRecord.inspectorName}
                icon={<User size={14} />}
              />

              <InfoRow
                label="Inspector ID"
                value={coi.inspected_by || normalizedRecord.inspectedBy}
                icon={<Hash size={14} />}
              />

              <InfoRow
                label="Inspector Role"
                value={coi.inspector_role || 'Fishery Law Enforcer'}
                icon={<BadgeCheck size={14} />}
              />

              <InfoRow
                label="Inspection Date"
                value={formatDate(coi.date_of_inspection || normalizedRecord.inspectionDate)}
                icon={<CalendarDays size={14} />}
              />

             
              <InfoRow
                label="COI Status"
                value={coi.status || normalizedRecord.coiStatus || 'COMPLETED'}
                icon={<CheckCircle2 size={14} />}
              />

              <InfoRow
                label="OR Number"
                value={coi.or_number || normalizedRecord.orNumber}
                icon={<CreditCard size={14} />}
              />

              <InfoRow label="Place of Inspection" value={addressDisplay} icon={<MapPin size={14} />} />
            </CardWrapper>
          )}
        </div>

        <div className="lg:col-span-8 space-y-6">
          {showCOI && (
            <CardWrapper title="Complete COI Details" icon={<BadgeCheck size={16} />}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                
                <InfoRow
                  label="Certificate No."
                  value={coi.certificate_no || normalizedRecord.certificateNo || 'COMPLETED'}
                  icon={<BadgeCheck size={14} />}
                />

                <InfoRow
                  label="Owner Name"
                  value={coi.owner_name || normalizedRecord.ownerName}
                  icon={<User size={14} />}
                />

                <InfoRow label="Place of Inspection" value={addressDisplay || '---'} icon={<MapPin size={14} />} />

                <InfoRow
                  label="Engine Make"
                  value={coi.engine_make || normalizedRecord.engine.make}
                  icon={<Settings2 size={14} />}
                />

                <InfoRow
                  label="Horse Power"
                  value={
                    (coi.engine_hp ?? normalizedRecord.engine.hp) !== ''
                      ? `${displayValue(coi.engine_hp ?? normalizedRecord.engine.hp)} HP`
                      : '---'
                  }
                  icon={<Settings2 size={14} />}
                />

                <InfoRow
                  label="Serial Number"
                  value={coi.engine_serial || normalizedRecord.engine.serial}
                  icon={<Hash size={14} />}
                />

                <InfoRow
                  label="Remarks"
                  value={coi.remarks || normalizedRecord.remarks}
                  icon={<FileText size={14} />}
                />
              </div>
            </CardWrapper>
          )}

          {showPermitPayment && (
            <CardWrapper title="Permit / Payment" icon={<CreditCard size={16} />}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                
                <InfoRow
                  label="Certificate Number"
                  value={normalizedRecord.certificateNo || 'COMPLETED'}
                  icon={<BadgeCheck size={14} />}
                />

                <InfoRow
                  label="Official Receipt Number"
                  value={normalizedRecord.orNumber}
                  icon={<Hash size={14} />}
                />

                <InfoRow label="Payment Status" value="VERIFIED" icon={<CreditCard size={14} />} />

                <InfoRow label="Permit Processing" value="VERIFIED" icon={<CheckCircle2 size={14} />} />
              </div>

              {permitQrUrl && (
                <div className="mt-6 flex flex-col items-center gap-2 border-t pt-6">
                  <div className="p-3 bg-white rounded-2xl border border-slate-200">
                    <img src={permitQrUrl} alt="Permit QR Code" className="w-28 h-28" />
                  </div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1">
                    <QrCode size={12} />
                    Scan to Verify Permit No. {permitNo}
                  </p>
                </div>
              )}
            </CardWrapper>
          )}

          <CardWrapper title="Document Registry" icon={<FileText size={16} />}>
            <div className={`grid gap-4 ${isVesselCategory ? 'grid-cols-3' : 'grid-cols-4'}`}>
              {(isVesselCategory
                ? [
                    { label: 'Barangay Clearance', url: barangayClearanceImg },
                    { label: 'Cedula', url: cedulaImg },
                    { label: 'Valid ID', url: validIdImg },
                  ]
                : [
                    { label: 'Barangay Clearance', url: barangayClearanceImg },
                    { label: 'Cedula', url: cedulaImg },
                    
                  ]
              ).map((docItem, idx) => (
                <div
                  key={idx}
                  className="space-y-2 cursor-pointer"
                  onClick={() => docItem.url && setViewingImage(docItem.url)}
                >
                  <p className="text-[9px] font-black text-slate-400 uppercase italic text-center truncate">
                    {docItem.label}
                  </p>

                  <div className="aspect-[3/4] rounded-2xl border bg-slate-50 overflow-hidden relative group">
                    {docItem.url ? (
                      <>
                        <img
                          src={docItem.url}
                          alt={docItem.label}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        />

                        <div className="absolute inset-0 bg-blue-600/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                          <Eye />
                        </div>
                      </>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-200">
                        <Box size={24} />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardWrapper>

          <CardWrapper title="System Audit History" icon={<HistoryIcon size={16} />}>
            <div className="space-y-4">
              <HistoryItem
                label="Registration Initialized"
                date={normalizedRecord.createdAt}
                status="COMPLETED"
              />

              <HistoryItem label="Document Verification" date={normalizedRecord.createdAt} status="VERIFIED" />

              {showCOI && (
                <>
                  <HistoryItem
                    label="Physical Inspection"
                    date={coi.date_of_inspection || normalizedRecord.inspectionDate}
                    status={coi.status || normalizedRecord.status || 'PASSED'}
                  />

                  <HistoryItem
                    label="Certificate of Inspection"
                    date={coi.date_of_inspection || normalizedRecord.inspectionDate}
                    status="COMPLETED"
                  />
                </>
              )}

              {showPermitPayment && (
                <HistoryItem
                  label="Permit Processing"
                  date={normalizedRecord.updatedAt || normalizedRecord.createdAt}
                  status="VERIFIED"
                />
              )}
            </div>
          </CardWrapper>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   UI HELPERS
========================================================= */

const SectionTitle = ({ title }: { title: string }) => (
  <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest border-b pb-2">{title}</p>
);

const InputGroup = ({ label, value, onChange, type = 'text' }: any) => (
  <div className="space-y-1">
    <Label className="text-[9px] font-black uppercase text-slate-400">{label}</Label>

    <Input
      type={type}
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value.toUpperCase())}
      className="font-bold h-11 rounded-xl focus-visible:ring-blue-600"
    />
  </div>
);

const CardWrapper = ({ title, icon, children }: any) => (
  <div className="bg-white rounded-[2.5rem] border border-slate-200 p-8 shadow-sm">
    <div className="flex items-center gap-3 mb-6">
      <div className="text-blue-600 p-2 bg-blue-50 rounded-lg">{icon}</div>
      <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-widest">{title}</h3>
    </div>

    {children}
  </div>
);

const InfoRow = ({ label, value, icon }: any) => (
  <div className="flex items-start gap-4 py-2 border-b border-slate-50 last:border-none">
    <div className="mt-1 text-slate-300">{icon}</div>

    <div className="min-w-0">
      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{label}</p>
      <p className="text-sm font-black uppercase text-slate-800 truncate">{value || '---'}</p>
    </div>
  </div>
);

const MetricBox = ({ label, value }: any) => (
  <div className="bg-slate-50 p-3 rounded-2xl border text-center">
    <p className="text-[8px] font-black text-slate-400 uppercase mb-1">{label}</p>
    <p className="text-xs font-black text-slate-900">{value || '0.00'}</p>
  </div>
);

const HistoryItem = ({ label, date, status }: any) => (
  <div className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border">
    <div className="flex items-center gap-3">
      <CheckCircle2 size={16} className="text-emerald-500" />

      <div>
        <p className="text-xs font-black uppercase italic text-slate-900 leading-none">{label}</p>
        <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-widest">
          {date ? formatDate(date) : 'N/A'}
        </p>
      </div>
    </div>

    <Badge className="bg-emerald-100 text-emerald-600 border-none font-black text-[9px] px-2 rounded-md">
      {status}
    </Badge>
  </div>
);