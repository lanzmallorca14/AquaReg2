import {
  useState,
  useEffect,
  useMemo,
  type ChangeEvent,
  type FormEvent
} from 'react';

import { useParams, useNavigate } from 'react-router-dom';

import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';

import {
  ArrowLeft,
  Download,
  Loader2,
  Ship,
  Anchor,
  ShieldCheck,
  ClipboardCheck,
  Trash2
} from 'lucide-react';

import { toast } from 'sonner';

import {
  useAquaData,
  useAquaAuth
} from '../../components/context/AquaRegCONTEXT';

import { supabase } from '../../../supabaseClient';
import { aquaOfflineDB } from '../../../offline/db';

import html2canvas from 'html2canvas-pro';
import jsPDF from 'jspdf';


type SubType =
  | 'motorized'
  | 'non-motorized'
  | 'pangulong'
  | 'fishing-gear'
  | 'payao-balsa'
  | 'others';


/* ============================================================
   COI TYPE VALIDATION
============================================================ */

const isValidCOIType = (v: any) => {
  const assetCategory =
    ((v && v.asset_category) || '').toLowerCase();

  const isMotorized =
    !!(v && v.is_motorized);

  let typeIdentifier: SubType;

  switch (assetCategory) {
    case 'vessel':
      typeIdentifier = isMotorized
        ? 'motorized'
        : 'non-motorized';
      break;

    case 'pangulong':
      typeIdentifier = 'pangulong';
      break;

    case 'payao':
    case 'balsa':
      typeIdentifier = 'payao-balsa';
      break;

    case 'gears':
      typeIdentifier = 'fishing-gear';
      break;

    default:
      typeIdentifier = 'others';
  }

  return (
    typeIdentifier === 'motorized' ||
    typeIdentifier === 'non-motorized'
  );
};


/* ============================================================
   COMPUTED STYLE COPIER
   ------------------------------------------------------------
   This is important for Vercel production builds.

   html2canvas normally clones the DOM and re-evaluates the
   CSS. On some production deployments this can cause Tailwind
   styles/responsive rules to render differently.

   We copy the actual computed browser styles into the clone.
============================================================ */

const copyComputedStyles = (
  source: Element,
  target: Element
) => {
  const sourceStyle =
    window.getComputedStyle(source);

  let cssText = '';

  for (let i = 0; i < sourceStyle.length; i++) {
    const property = sourceStyle[i];

    cssText +=
      `${property}:${sourceStyle.getPropertyValue(property)};`;
  }

  (
    target as HTMLElement
  ).style.cssText = cssText;

  const sourceChildren =
    Array.from(source.children);

  const targetChildren =
    Array.from(target.children);

  sourceChildren.forEach(
    (sourceChild, index) => {
      const targetChild =
        targetChildren[index];

      if (targetChild) {
        copyComputedStyles(
          sourceChild,
          targetChild
        );
      }
    }
  );
};


/* ============================================================
   WAIT FOR IMAGES
============================================================ */

const waitForImages = async (
  root: Element
) => {
  const images =
    Array.from(
      root.querySelectorAll('img')
    );

  await Promise.all(
    images.map(async (img) => {

      if (
        img.complete &&
        img.naturalWidth > 0
      ) {
        try {
          if (img.decode) {
            await img.decode();
          }
        } catch {
          // Ignore decode errors.
        }

        return;
      }

      await new Promise<void>(
        (resolve) => {

          const done = () => {
            resolve();
          };

          img.addEventListener(
            'load',
            done,
            { once: true }
          );

          img.addEventListener(
            'error',
            done,
            { once: true }
          );

          // Prevent an image from blocking
          // the entire export forever.
          setTimeout(
            resolve,
            5000
          );
        }
      );
    })
  );
};


/* ============================================================
   COMPONENT
============================================================ */

export default function InspectionCOI() {

  const { vesselId } =
    useParams();

  const navigate =
    useNavigate();

  const { currentUser } =
    useAquaAuth();

  const {
    Vessels,
    updateVessel,
    completeInspection
  } = useAquaData() as any;


  const [selectedVessel, setSelectedVessel] =
    useState<any | null>(null);

  const [isSaving, setIsSaving] =
    useState(false);

  const [isExporting, setIsExporting] =
    useState(false);

  const [localVessels, setLocalVessels] =
    useState<any[]>([]);


  /* ==========================================================
     LOAD VESSELS
  ========================================================== */

  useEffect(() => {

    if (
      Vessels &&
      Vessels.length > 0
    ) {
      setLocalVessels(Vessels);
    }

  }, [Vessels]);


  /* ==========================================================
     SUPABASE FALLBACK
  ========================================================== */

  useEffect(() => {

    let isMounted = true;

    async function fetchVesselsFallback() {

      if (
        (!Vessels ||
          Vessels.length === 0) &&
        vesselId &&
        navigator.onLine
      ) {

        try {

          const {
            data,
            error
          } = await supabase
            .from('Vessels')
            .select('*');

          if (
            !error &&
            data &&
            isMounted
          ) {
            setLocalVessels(data);
          }

        } catch (e) {

          console.warn(
            'Offline: Could not fetch fallback vessels from Supabase.'
          );
        }
      }
    }

    fetchVesselsFallback();

    return () => {
      isMounted = false;
    };

  }, [
    Vessels,
    vesselId
  ]);


  /* ==========================================================
     ASSIGNED VESSELS
  ========================================================== */

  const assignedVessels =
    useMemo(() => {

      if (!currentUser) {
        return [];
      }

      const sourceList =
        localVessels.length > 0
          ? localVessels
          : Vessels;

      const currentInspectorId =
        String(
          currentUser.idNumber ||
          currentUser.id ||
          ''
        ).toUpperCase();

      return sourceList.filter(
        (v: any) => {

          const assignedInspector =
            String(
              v.assigned_inspector ||
              ''
            ).toUpperCase();

          const isAssigned =
            assignedInspector !== '' &&
            assignedInspector ===
              currentInspectorId;

          const isPendingState =
            String(
              v.status || ''
            ).toUpperCase() ===
            'SCHEDULED';

          return (
            isPendingState &&
            isAssigned &&
            isValidCOIType(v)
          );
        }
      );

    }, [
      localVessels,
      Vessels,
      currentUser
    ]);


  /* ==========================================================
     URL VESSEL
  ========================================================== */

  const urlVessel =
    useMemo(() => {

      if (!vesselId) {
        return null;
      }

      const sourceList =
        localVessels.length > 0
          ? localVessels
          : Vessels;

      return sourceList.find(
        (v: any) =>
          String(v.id) ===
          String(vesselId)
      );

    }, [
      localVessels,
      Vessels,
      vesselId
    ]);


  /* ==========================================================
     SELECT VESSEL
  ========================================================== */

  useEffect(() => {

    if (urlVessel) {

      setSelectedVessel(
        urlVessel
      );

    } else if (
      vesselId &&
      assignedVessels.length > 0
    ) {

      const found =
        assignedVessels.find(
          (v: any) =>
            String(v.id) ===
            String(vesselId)
        );

      setSelectedVessel(
        found || null
      );

    } else {

      setSelectedVessel(null);

    }

  }, [
    urlVessel,
    vesselId,
    assignedVessels
  ]);


  /* ==========================================================
     VALIDATE COI TYPE
  ========================================================== */

  useEffect(() => {

    if (
      selectedVessel &&
      !isValidCOIType(
        selectedVessel
      )
    ) {

      toast.error(
        'COI audits are only available for Motorized and Non-Motorized vessels.'
      );

      navigate(
        '/inspector/inspection'
      );
    }

  }, [
    selectedVessel,
    navigate
  ]);


  /* ==========================================================
     COI FORM DATA
  ========================================================== */

  const [coiData, setCoiData] =
    useState({

      permitNo: '',

      orNumber: '',

      date:
        new Date().toLocaleDateString(
          'en-US',
          {
            month: 'long',
            day: 'numeric',
            year: 'numeric'
          }
        ),

      ownerName: '',

      vesselType:
        '' as SubType,

      specificGear: '',

      barangay: '',

      vesselName: '',

      engineMake: '',

      horsePower: '',

      serialNumber: '',

      placeOfInspection:
        'ROMBLON, ROMBLON',

      dateOfInspection:
        new Date()
          .toISOString()
          .split('T')[0],

      inspectorName:
        currentUser?.name ||
        'JOB U. MARTINEZ',

      inspectorRole:
        'Fishery Law Enforcer',

      length: '',

      placeOfBuilt: '',

      boat_builder_no: '',

      yearBuilt: '',

      breadth: '',

      depth: '',

      grossTonnage:
        '0.00',

      netTonnage:
        '0.00',

      remarks: ''
    });


  /* ==========================================================
     POPULATE COI DATA
  ========================================================== */

  useEffect(() => {

    if (!selectedVessel) {
      return;
    }

    let typeIdentifier: SubType =
      'others';

    const vType =
      (
        selectedVessel.type ||
        ''
      ).toUpperCase();

    const assetCat =
      (
        selectedVessel.asset_category ||
        ''
      ).toUpperCase();


    if (
      vType.includes('PANGULONG') ||
      assetCat.includes('PANGULONG')
    ) {

      typeIdentifier =
        'pangulong';

    } else if (
      vType.includes('PAYAO') ||
      vType.includes('BALSA') ||
      assetCat.includes('PAYAO')
    ) {

      typeIdentifier =
        'payao-balsa';

    } else if (
      vType.includes('GEAR') ||
      assetCat.includes('FISHING-GEAR')
    ) {

      typeIdentifier =
        'fishing-gear';

    } else if (
      selectedVessel.is_motorized === true ||
      selectedVessel.vesselType
        ?.toLowerCase() ===
        'motorized'
    ) {

      typeIdentifier =
        'motorized';

    } else {

      typeIdentifier =
        'non-motorized';
    }


    const hasEngine =
      typeIdentifier ===
      'motorized';


    setCoiData(
      prev => ({
        ...prev,

        permitNo:
          selectedVessel.id ||
          '',

        ownerName:
          (
            selectedVessel.owner_name ||
            selectedVessel.owner ||
            ''
          ).toUpperCase(),

        vesselName:
          (
            selectedVessel.vessel_name ||
            selectedVessel.gear_type ||
            ''
          ).toUpperCase(),

        vesselType:
          typeIdentifier,

        barangay:
          (
            selectedVessel.barangay ||
            ''
          ).toUpperCase(),

        placeOfBuilt:
          (
            selectedVessel.place_of_built ||
            selectedVessel.construction_place ||
            ''
          ).toUpperCase(),

        boat_builder_no:
          (
            selectedVessel.boat_builder_no ||
            ''
          ).toUpperCase(),

        yearBuilt:
          selectedVessel.year_built
            ? String(
                selectedVessel.year_built
              )
            : '',

        length:
          selectedVessel?.hull_length
            ? String(
                selectedVessel.hull_length
              )
            : '0.00',

        breadth:
          selectedVessel?.hull_width
            ? String(
                selectedVessel.hull_width
              )
            : '0.00',

        depth:
          selectedVessel?.hull_depth
            ? String(
                selectedVessel.hull_depth
              )
            : '0.00',

        engineMake:
          hasEngine
            ? (
                selectedVessel.engine_make ||
                ''
              ).toUpperCase()
            : '',

        horsePower:
          hasEngine
            ? (
                selectedVessel.engine_hp ||
                ''
              )
            : '',

        serialNumber:
          hasEngine
            ? (
                selectedVessel.engine_serial ||
                ''
              ).toUpperCase()
            : '',

        grossTonnage:
          selectedVessel.tonnage_gross
            ? String(
                selectedVessel.tonnage_gross
              )
            : '0.00',

        netTonnage:
          selectedVessel.tonnage_net
            ? String(
                selectedVessel.tonnage_net
              )
            : '0.00',

        orNumber:
          selectedVessel.or_number ||
          '',

        inspectorName:
          currentUser?.name ||
          prev.inspectorName
      })
    );

  }, [
    selectedVessel,
    currentUser
  ]);


  /* ==========================================================
     OFFLINE VESSELS
  ========================================================== */

  useEffect(() => {

    async function loadOfflineVessels() {

      if (!navigator.onLine) {

        const db =
          await aquaOfflineDB;

        const offlineVessels =
          await db.getAll(
            'Vessels'
          );

        setLocalVessels(
          offlineVessels
        );
      }
    }

    loadOfflineVessels();

  }, []);


  /* ==========================================================
     CALCULATE TONNAGE
  ========================================================== */

  useEffect(() => {

    const L =
      parseFloat(
        String(coiData.length)
      ) || 0;

    const B =
      parseFloat(
        String(coiData.breadth)
      ) || 0;

    const D =
      parseFloat(
        String(coiData.depth)
      ) || 0;


    if (
      L > 0 &&
      B > 0 &&
      D > 0
    ) {

      const calculatedGT =
        (L * B * D * 0.70) /
        2.83;

      const calculatedNT =
        calculatedGT * 0.30;


      setCoiData(
        prev => ({
          ...prev,

          grossTonnage:
            calculatedGT.toFixed(2),

          netTonnage:
            calculatedNT.toFixed(2)
        })
      );
    }

  }, [
    coiData.length,
    coiData.breadth,
    coiData.depth
  ]);


  /* ==========================================================
     HANDLE CHANGE
  ========================================================== */

  const handleChange = (
    e:
      ChangeEvent<
        HTMLInputElement |
        HTMLTextAreaElement
      >
  ) => {

    const {
      name,
      value
    } = e.target;

    setCoiData(
      prev => ({
        ...prev,
        [name]:
          value.toUpperCase()
      })
    );
  };


  /* ==========================================================
     EXPORT WPS / PDF
     ----------------------------------------------------------
     IMPORTANT:
     This is the Vercel-safe export implementation.
  ========================================================== */

  const handleExportWPS = async () => {

    const printElement =
      document.getElementById(
        'coi-document-content'
      );


    if (!printElement) {

      toast.error(
        'COI document not found.'
      );

      return;
    }


    if (isExporting) {
      return;
    }


    let exportHost:
      HTMLDivElement | null =
      null;


    try {

      setIsExporting(true);


      toast.loading(
        'Preparing WPS/PDF document...',
        {
          id: 'wps-export'
        }
      );


      /* ======================================================
         1. WAIT FOR FONTS
      ====================================================== */

      if ('fonts' in document) {

        try {

          await document.fonts.ready;

        } catch (error) {

          console.warn(
            'Font loading warning:',
            error
          );
        }
      }


      /* ======================================================
         2. WAIT FOR ORIGINAL IMAGES
      ====================================================== */

      await waitForImages(
        printElement
      );


      /* ======================================================
         3. WAIT FOR LAYOUT TO SETTLE
      ====================================================== */

      await new Promise<void>(
        resolve => {

          requestAnimationFrame(
            () => {

              requestAnimationFrame(
                () => {

                  setTimeout(
                    resolve,
                    150
                  );

                }
              );

            }
          );

        }
      );


      /* ======================================================
         4. DETERMINE PAPER SIZE
      ====================================================== */

      // COI uses the long paper layout.
      const pageWidth =
        215.9;

      const pageHeight =
        355.6;


      /* ======================================================
         5. CREATE EXPORT CLONE
      ====================================================== */

      const exportClone =
        printElement.cloneNode(
          true
        ) as HTMLElement;


      /*
       * Copy the actual browser-computed CSS.

       * This prevents Vercel's production CSS cloning from
       * changing the visual design during html2canvas capture.
       */

      copyComputedStyles(
        printElement,
        exportClone
      );


      /* ======================================================
         6. FORCE EXACT COI DIMENSIONS
      ====================================================== */

      exportClone.style.width =
        '8.5in';

      exportClone.style.height =
        '14in';

      exportClone.style.minWidth =
        '8.5in';

      exportClone.style.minHeight =
        '14in';

      exportClone.style.maxWidth =
        'none';

      exportClone.style.maxHeight =
        'none';

      exportClone.style.margin =
        '0';

      exportClone.style.transform =
        'none';

      exportClone.style.position =
        'relative';

      exportClone.style.boxSizing =
        'border-box';

      exportClone.style.overflow =
        'hidden';

      exportClone.style.backgroundColor =
        '#ffffff';

      exportClone.style.color =
        '#000000';


      /* ======================================================
         7. FORCE CHILDREN TO KEEP THEIR RENDERED STYLES
      ====================================================== */

      const allElements =
        exportClone.querySelectorAll(
          '*'
        );


      allElements.forEach(
        element => {

          const el =
            element as HTMLElement;

          el.style.visibility =
            'visible';

          /*
           * TypeScript-safe version.
           *
           * Do NOT use:
           * webkitPrintColorAdjust
           */

          el.style.printColorAdjust =
            'exact';

        }
      );


      /* ======================================================
         8. PRESERVE IMAGE DIMENSIONS
      ====================================================== */

      const sourceImages =
        Array.from(
          printElement.querySelectorAll(
            'img'
          )
        );


      const cloneImages =
        Array.from(
          exportClone.querySelectorAll(
            'img'
          )
        );


      sourceImages.forEach(
        (
          sourceImg,
          index
        ) => {

          const cloneImg =
            cloneImages[index];

          if (!cloneImg) {
            return;
          }


          const sourceRect =
            sourceImg.getBoundingClientRect();


          const sourceStyle =
            window.getComputedStyle(
              sourceImg
            );


          cloneImg.style.width =
            `${sourceRect.width}px`;

          cloneImg.style.height =
            `${sourceRect.height}px`;

          cloneImg.style.objectFit =
            sourceStyle.objectFit;

          cloneImg.style.objectPosition =
            sourceStyle.objectPosition;

          cloneImg.style.display =
            sourceStyle.display;

          cloneImg.style.visibility =
            'visible';

        }
      );


      /* ======================================================
         9. CREATE OFFSCREEN HOST
      ====================================================== */

      const captureWidth =
        Math.round(
          215.9 *
          (96 / 25.4)
        );


      const captureHeight =
        Math.round(
          355.6 *
          (96 / 25.4)
        );


      exportHost =
        document.createElement(
          'div'
        );


      exportHost.style.position =
        'fixed';

      exportHost.style.left =
        '-100000px';

      exportHost.style.top =
        '0';

      exportHost.style.width =
        `${captureWidth}px`;

      exportHost.style.height =
        `${captureHeight}px`;

      exportHost.style.margin =
        '0';

      exportHost.style.padding =
        '0';

      exportHost.style.background =
        '#ffffff';

      exportHost.style.zIndex =
        '-1';

      exportHost.style.overflow =
        'hidden';

      exportHost.style.pointerEvents =
        'none';


      exportHost.appendChild(
        exportClone
      );

      document.body.appendChild(
        exportHost
      );


      /* ======================================================
         10. WAIT FOR CLONED LAYOUT
      ====================================================== */

      await new Promise<void>(
        resolve => {

          requestAnimationFrame(
            () => {

              requestAnimationFrame(
                () => {

                  setTimeout(
                    resolve,
                    150
                  );

                }
              );

            }
          );

        }
      );


      await waitForImages(
        exportClone
      );


      /* ======================================================
         11. CAPTURE CLONE
      ====================================================== */

      const canvas =
        await html2canvas(
          exportClone,
          {

            scale: 2,

            useCORS: true,

            allowTaint: false,

            backgroundColor:
              '#ffffff',

            logging: false,

            width:
              captureWidth,

            height:
              captureHeight,

            /*
             * IMPORTANT:
             *
             * Do not use the permit width itself as the browser
             * viewport width. That can trigger responsive
             * Tailwind rules on Vercel.
             */

            windowWidth:
              Math.max(
                document.documentElement
                  .clientWidth,

                window.innerWidth,

                captureWidth
              ),

            windowHeight:
              Math.max(
                document.documentElement
                  .clientHeight,

                window.innerHeight,

                captureHeight
              ),

            scrollX: 0,

            scrollY: 0,

            imageTimeout:
              15000

          }
        );


      /* ======================================================
         12. CREATE PDF
      ====================================================== */

      const pdf =
        new jsPDF({

          orientation:
            'portrait',

          unit:
            'mm',

          format:
            [
              pageWidth,
              pageHeight
            ],

          compress:
            true

        });


      /* ======================================================
         13. EXPORT FULL PAGE
      ====================================================== */

      const imageData =
        canvas.toDataURL(
          'image/jpeg',
          0.98
        );


      pdf.addImage(

        imageData,

        'JPEG',

        0,

        0,

        pageWidth,

        pageHeight,

        undefined,

        'FAST'

      );


      /* ======================================================
         14. FILE NAME
      ====================================================== */

      const safeCertificateNo =
        String(
          coiData.permitNo ||
          selectedVessel?.id ||
          'COI'
        )
          .replace(
            /[^a-zA-Z0-9_-]/g,
            '-'
          );


      const fileName =
        `Certification-of-Inspection-${safeCertificateNo}.pdf`;


      /* ======================================================
         15. SAVE PDF
      ====================================================== */

      pdf.save(
        fileName
      );


      toast.success(
        'WPS/PDF exported successfully.',
        {
          id: 'wps-export'
        }
      );


    } catch (error) {

      console.error(
        '========== WPS/PDF EXPORT ERROR =========='
      );

      console.error(
        error
      );

      console.error(
        '=========================================='
      );


      toast.error(
        'Failed to export WPS/PDF. Please try again.',
        {
          id: 'wps-export'
        }
      );


    } finally {

      setIsExporting(false);


      if (exportHost) {
        exportHost.remove();
      }

    }
  };


  /* ==========================================================
     PERMANENT DELETE
  ========================================================== */

  const handleDeletePermanently =
    async () => {

      if (!selectedVessel) {
        return;
      }


      const vesselName =
        selectedVessel.vessel_name ||
        selectedVessel.gear_type ||
        'this vessel';


      const confirmed =
        window.confirm(

          `PERMANENT DELETE\n\n` +
          `Are you sure you want to permanently delete "${vesselName}"?\n\n` +
          `This will delete the Vessel record, COI record, and Permit Management record.\n\n` +
          `THIS ACTION CANNOT BE UNDONE.`

        );


      if (!confirmed) {
        return;
      }


      setIsSaving(true);


      try {

        const id =
          selectedVessel.id;


        if (navigator.onLine) {

          /* ==================================================
             DELETE COI
          ================================================== */

          const {
            error: coiError
          } =
            await supabase
              .from('COI')
              .delete()
              .eq(
                'vessel_id',
                id
              );


          if (coiError) {

            throw new Error(
              `Failed to delete COI record: ${coiError.message}`
            );

          }


          /* ==================================================
             DELETE PERMIT
          ================================================== */

          const {
            error: permitError
          } =
            await supabase
              .from(
                'permit_management'
              )
              .delete()
              .eq(
                'asset_id',
                id
              );


          if (permitError) {

            throw new Error(
              `Failed to delete permit record: ${permitError.message}`
            );

          }


          /* ==================================================
             DELETE VESSEL
          ================================================== */

          const {
            error: vesselError
          } =
            await supabase
              .from('Vessels')
              .delete()
              .eq(
                'id',
                id
              );


          if (vesselError) {

            throw new Error(
              `Failed to delete vessel: ${vesselError.message}`
            );

          }


          setLocalVessels(
            prev =>
              prev.filter(
                v =>
                  String(v.id) !==
                  String(id)
              )
          );


          setSelectedVessel(
            null
          );


          toast.success(
            'Vessel, COI, and permit records were permanently deleted.'
          );


        } else {

          /* ==================================================
             OFFLINE DELETE
          ================================================== */

          const db =
            await aquaOfflineDB;


          const coiRecords =
            await db.getAll(
              'COI'
            );


          for (
            const coi of coiRecords
          ) {

            if (
              String(
                coi.vessel_id
              ) === String(id)
            ) {

              await db.delete(
                'COI',
                coi.id
              );

            }
          }


          const permits =
            await db.getAll(
              'permit_management'
            );


          for (
            const permit of permits
          ) {

            if (
              String(
                permit.asset_id
              ) === String(id)
            ) {

              await db.delete(
                'permit_management',
                permit.id
              );

            }
          }


          await db.delete(
            'Vessels',
            id
          );


          /* ==================================================
             QUEUE COI DELETE
          ================================================== */

          await db.add(
            'syncQueue',
            {
              action:
                'DELETE',

              table:
                'COI',

              data:
                {
                  vessel_id:
                    id
                },

              created_at:
                new Date()
                  .toISOString()
            }
          );


          /* ==================================================
             QUEUE PERMIT DELETE
          ================================================== */

          await db.add(
            'syncQueue',
            {
              action:
                'DELETE',

              table:
                'permit_management',

              data:
                {
                  asset_id:
                    id
                },

              created_at:
                new Date()
                  .toISOString()
            }
          );


          /* ==================================================
             QUEUE VESSEL DELETE
          ================================================== */

          await db.add(
            'syncQueue',
            {
              action:
                'DELETE',

              table:
                'Vessels',

              data:
                {
                  id
                },

              created_at:
                new Date()
                  .toISOString()
            }
          );


          setLocalVessels(
            prev =>
              prev.filter(
                v =>
                  String(v.id) !==
                  String(id)
              )
          );


          setSelectedVessel(
            null
          );


          toast.success(
            'Record deleted locally and queued for permanent database deletion.'
          );

        }


        setTimeout(
          () => {

            navigate(
              '/inspector/inspection'
            );

          },
          1000
        );


      } catch (error: any) {

        console.error(
          '========== PERMANENT DELETE ERROR =========='
        );

        console.error(
          error
        );

        console.error(
          '============================================'
        );


        toast.error(
          error?.message ||
          'Failed to permanently delete the record.'
        );


      } finally {

        setIsSaving(false);

      }
    };


  /* ==========================================================
     SAVE INSPECTION
  ========================================================== */

  const handleSaveRecord =
    async (
      e: FormEvent
    ) => {

      e.preventDefault();


      if (!selectedVessel) {
        return;
      }


      const cleanOR =
        coiData.orNumber
          .trim()
          .toUpperCase();


      if (
        !cleanOR ||
        cleanOR === 'PENDING'
      ) {

        return toast.error(
          'O.R. Number Required'
        );

      }


      setIsSaving(true);


      let certificateNo =
        'CERT-' +
        Math.floor(
          100000 +
          Math.random() *
            900000
        );


      let permitId =
        selectedVessel.id;


      const payload = {

        status:
          'Passed',

        sync_status:
          navigator.onLine
            ? 'synced'
            : 'pending',

        or_number:
          cleanOR,

        vessel_name:
          coiData.vesselName,

        owner_name:
          coiData.ownerName,

        certificate_no:
          certificateNo,

        engine_make:
          coiData.engineMake ||
          null,

        engine_hp:
          coiData.horsePower ||
          null,

        boat_builder_no:
          coiData.boat_builder_no ||
          null,

        engine_serial:
          coiData.serialNumber ||
          null,

        hull_length:
          Number(
            coiData.length
          ) || 0,

        hull_width:
          Number(
            coiData.breadth
          ) || 0,

        hull_depth:
          Number(
            coiData.depth
          ) || 0,

        tonnage_gross:
          Number(
            coiData.grossTonnage
          ) || 0,

        tonnage_net:
          Number(
            coiData.netTonnage
          ) || 0,

        inspected_by:
          currentUser?.idNumber ||
          currentUser?.id,

        inspector_name:
          currentUser?.name ||
          coiData.inspectorName,

        assigned_inspector:
          selectedVessel.assigned_inspector ||
          currentUser?.idNumber ||
          currentUser?.id ||
          null,

        updated_at:
          new Date()
            .toISOString()

      };


      try {

        /* ====================================================
           ONLINE
        ==================================================== */

        if (navigator.onLine) {

          /* ==================================================
             GENERATE CERTIFICATE NUMBER
          ================================================== */

          try {

            const {
              data: certData
            } =
              await supabase.rpc(
                'generate_certificate_number'
              );


            if (certData) {
              certificateNo =
                certData;
            }

          } catch (err) {

            console.warn(
              'Certificate RPC failed'
            );

          }


          /* ==================================================
             GENERATE PERMIT ID
          ================================================== */

          try {

            const {
              data: permitIdData
            } =
              await supabase.rpc(
                'generate_romblon_permit_id'
              );


            if (permitIdData) {
              permitId =
                permitIdData;
            }

          } catch (err) {

            console.warn(
              'Permit ID RPC failed'
            );

          }


          /* ==================================================
             COI RECORD
          ================================================== */

          const coiRecord = {

            certificate_no:
              certificateNo,

            vessel_id:
              selectedVessel.id,

            permit_no:
              selectedVessel.id,

            or_number:
              cleanOR,

            owner_name:
              coiData.ownerName,

            vessel_name:
              coiData.vesselName,

            vessel_type:
              coiData.vesselType,

            barangay:
              coiData.barangay,

            engine_make:
              coiData.engineMake ||
              0,

            engine_hp:
              coiData.horsePower ||
              0,

            engine_serial:
              coiData.serialNumber ||
              0,

            hull_length:
              Number(
                coiData.length
              ) || 0,

            hull_width:
              Number(
                coiData.breadth
              ) || 0,

            hull_depth:
              Number(
                coiData.depth
              ) || 0,

            place_of_built:
              coiData.placeOfBuilt ||
              0,

            year_built:
              Number(
                coiData.yearBuilt
              ) || 0,

            gross_tonnage:
              Number(
                coiData.grossTonnage
              ) || 0,

            net_tonnage:
              Number(
                coiData.netTonnage
              ) || 0,

            remarks:
              coiData.remarks,

            boat_builder_no:
              coiData.boat_builder_no ||
              0,

            inspected_by:
              currentUser?.idNumber ||
              currentUser?.id,

            inspector_name:
              currentUser?.name ||
              coiData.inspectorName,

            inspector_role:
              'Fishery Law Enforcer',

            status:
              'Passed'

          };


          /* ==================================================
             PERMIT RECORD
          ================================================== */

          const permitRecord = {

            id:
              permitId,

            asset_id:
              selectedVessel.id,

            asset_category:
              selectedVessel.asset_category ||
              'vessel',

            permit_no:
              permitId,

            vessel_name:
              coiData.vesselName,

            owner_name:
              coiData.ownerName,

            or_number:
              cleanOR,

            issued_date:
              new Date()
                .toISOString()
                .split('T')[0],

            status:
              'ISSUED'

          };


          /* ==================================================
             INSERT COI
          ================================================== */

          const {
            error: coiError
          } =
            await supabase
              .from('COI')
              .insert(
                coiRecord
              );


          if (coiError) {
            throw coiError;
          }


          /* ==================================================
             INSERT PERMIT
          ================================================== */

          const {
            error: permitError
          } =
            await supabase
              .from(
                'permit_management'
              )
              .insert(
                permitRecord
              );


          if (permitError) {
            throw permitError;
          }


          /* ==================================================
             COMPLETE INSPECTION
          ================================================== */

          if (completeInspection) {

            await completeInspection(

              selectedVessel.id,

              cleanOR,

              coiData.remarks ||
                'Passed standard municipal vessel inspection.'

            );


            /* ================================================
               RE-APPLY ORIGINAL INSPECTOR ASSIGNMENT
            ================================================ */

            await updateVessel(

              selectedVessel.id,

              {

                ...payload,

                status:
                  'Passed',

                assigned_inspector:
                  selectedVessel.assigned_inspector ||
                  currentUser?.idNumber ||
                  currentUser?.id ||
                  null,

                inspected_by:
                  currentUser?.idNumber ||
                  currentUser?.id,

                inspector_name:
                  currentUser?.name ||
                  coiData.inspectorName,

                updated_at:
                  new Date()
                    .toISOString()

              } as any

            );

          } else {

            await updateVessel(
              selectedVessel.id,
              payload as any
            );

          }


        } else {

          /* ==================================================
             OFFLINE COI
          ================================================== */

          const coiRecord = {

            id:
              crypto.randomUUID(),

            certificate_no:
              certificateNo,

            vessel_id:
              selectedVessel.id,

            permit_no:
              selectedVessel.id,

            or_number:
              cleanOR,

            owner_name:
              coiData.ownerName,

            vessel_name:
              coiData.vesselName,

            vessel_type:
              coiData.vesselType,

            barangay:
              coiData.barangay,

            engine_make:
              coiData.engineMake ||
              0,

            engine_hp:
              coiData.horsePower ||
              0,

            engine_serial:
              coiData.serialNumber ||
              0,

            hull_length:
              Number(
                coiData.length
              ) || 0,

            hull_width:
              Number(
                coiData.breadth
              ) || 0,

            hull_depth:
              Number(
                coiData.depth
              ) || 0,

            gross_tonnage:
              Number(
                coiData.grossTonnage
              ) || 0,

            net_tonnage:
              Number(
                coiData.netTonnage
              ) || 0,

            inspected_by:
              currentUser?.idNumber ||
              currentUser?.id,

            inspector_name:
              currentUser?.name,

            status:
              'Passed',

            sync_status:
              'pending'

          };


          /* ==================================================
             OFFLINE PERMIT
          ================================================== */

          const permitRecord = {

            id:
              crypto.randomUUID(),

            asset_id:
              selectedVessel.id,

            asset_category:
              selectedVessel.asset_category ||
              'vessel',

            permit_no:
              selectedVessel.id,

            vessel_name:
              coiData.vesselName,

            owner_name:
              coiData.ownerName,

            or_number:
              cleanOR,

            issued_date:
              new Date()
                .toISOString()
                .split('T')[0],

            status:
              'ISSUED',

            sync_status:
              'pending'

          };


          const db =
            await aquaOfflineDB;


          await db.add(
            'COI',
            coiRecord
          );


          await db.put(
            'permit_management',
            {
              ...permitRecord,
              sync_status:
                'pending'
            }
          );


          /* ==================================================
             QUEUE COI
          ================================================== */

          await db.add(
            'syncQueue',
            {

              action:
                'INSERT',

              table:
                'COI',

              data:
                coiRecord,

              created_at:
                new Date()
                  .toISOString()

            }
          );


          /* ==================================================
             UPDATE OFFLINE VESSEL
          ================================================== */

          await db.put(
            'Vessels',
            {

              ...selectedVessel,

              id:
                selectedVessel.id,

              status:
                'Passed',

              or_number:
                cleanOR,

              certificate_no:
                certificateNo,

              sync_status:
                'pending',

              updated_at:
                new Date()
                  .toISOString()

            }
          );


          setLocalVessels(
            prev =>
              prev.map(
                v =>
                  v.id ===
                  selectedVessel.id
                    ? {
                        ...v,
                        ...payload
                      }
                    : v
              )
          );


          setSelectedVessel(
            (
              prev:
                any | null
            ) =>
              prev
                ? {
                    ...prev,
                    ...payload
                  }
                : prev
          );

        }


        /* ====================================================
           SUCCESS
        ==================================================== */

        toast.success(

          navigator.onLine
            ? 'Inspection successfully saved!'
            : 'Inspection Completed Offline. COI and Permit saved locally.'

        );


        setTimeout(
          () => {

            navigate(
              '/inspector/inspection'
            );

          },
          2000
        );


      } catch (error: any) {

        console.error(
          '========== INSPECTION SAVE ERROR =========='
        );

        console.error(
          'MESSAGE:',
          error?.message
        );

        console.error(
          '============================================'
        );


        toast.error(
          error?.message ||
          'Failed to save inspection record.'
        );


      } finally {

        setIsSaving(false);

      }

    };


  /* ==========================================================
     AUDIT PAGE
  ========================================================== */

  if (
    vesselId &&
    selectedVessel
  ) {

    return (

      <div className="w-full bg-slate-100 min-h-screen p-4 md:p-8">

        {/* ====================================================
            TOP ACTION BAR
        ==================================================== */}

        <div className="max-w-4xl mx-auto mb-6 flex justify-between items-center">

          <Button
            variant="ghost"
            onClick={() =>
              navigate(-1)
            }
            className="font-black text-[10px] uppercase tracking-widest text-slate-400 hover:text-blue-600"
          >

            <ArrowLeft
              size={16}
              className="mr-2"
            />

            Cancel Audit

          </Button>


          <div className="flex gap-3">

            {/* =================================================
                DELETE
            ================================================= */}

            <Button
              type="button"
              onClick={
                handleDeletePermanently
              }
              disabled={
                isSaving ||
                isExporting
              }
              variant="outline"
              className="border-2 border-red-600 text-red-600 hover:bg-red-600 hover:text-white font-black text-[10px] uppercase tracking-widest rounded-xl px-6 h-12 transition-all"
            >

              {isSaving ? (

                <Loader2
                  size={16}
                  className="animate-spin mr-2"
                />

              ) : (

                <Trash2
                  size={16}
                  className="mr-2"
                />

              )}

              Delete Permanently

            </Button>


            {/* =================================================
                SAVE
            ================================================= */}

            <Button
              onClick={
                handleSaveRecord
              }
              disabled={
                isSaving ||
                isExporting ||
                selectedVessel?.status ===
                  'Passed'
              }
              className="bg-slate-900 hover:bg-blue-600 text-white font-black text-[10px] uppercase tracking-widest rounded-xl px-8 h-12 shadow-xl active:scale-95 transition-all"
            >

              {isSaving ? (

                <>

                  <Loader2
                    size={16}
                    className="animate-spin mr-2"
                  />

                  Saving...

                </>

              ) : selectedVessel?.status ===
                'Passed' ? (

                <>

                  <ShieldCheck
                    size={16}
                    className="mr-2"
                  />

                  Inspection Passed

                </>

              ) : (

                <>

                  <ShieldCheck
                    size={16}
                    className="mr-2"
                  />

                  Authorize Audit

                </>

              )}

            </Button>


            {/* =================================================
                EXPORT WPS/PDF
            ================================================= */}

            <Button
              type="button"
              onClick={
                handleExportWPS
              }
              disabled={
                isSaving ||
                isExporting
              }
              variant="outline"
              className="font-black text-[10px] uppercase tracking-widest border-2 border-blue-700 text-blue-700 hover:bg-blue-700 hover:text-white rounded-xl px-6 h-12 transition-all"
            >

              {isExporting ? (

                <>

                  <Loader2
                    size={16}
                    className="animate-spin mr-2"
                  />

                  Exporting...

                </>

              ) : (

                <>

                  <Download
                    size={16}
                    className="mr-2"
                  />

                  Export WPS/PDF

                </>

              )}

            </Button>

          </div>

        </div>


        {/* ====================================================
            COI DOCUMENT
            ----------------------------------------------------
            KEEPING YOUR ORIGINAL DESIGN
        ==================================================== */}

        <div
          id="coi-document-content"
          className="max-w-[8.5in] mx-auto bg-white p-[0.75in] text-black font-serif border border-slate-200 shadow-xl relative leading-tight"
        >

          {/* ==================================================
              HEADER
          ================================================== */}

          <div className="text-center relative mb-8">

            <div className="absolute left-0 top-0 w-16 h-16 opacity-80 flex items-center justify-center">

              <Anchor
                size={45}
              />

            </div>


            <h1 className="text-lg font-bold">
              Republic of the Philippines
            </h1>

            <p className="text-sm">
              Province of Romblon
            </p>

            <p className="text-sm">
              Municipality of Romblon
            </p>

            <h2 className="text-md font-bold uppercase tracking-wide">
              OFFICE OF THE MUNICIPAL AGRICULTURIST
            </h2>


            <h1 className="text-xl font-bold mt-8 underline underline-offset-4 decoration-1 uppercase tracking-tight">

              CERTIFICATION OF INSPECTION

            </h1>

          </div>


          {/* ==================================================
              PERMIT / DATE
          ================================================== */}

          <div className="flex justify-between mb-6 text-sm">

            <div className="flex items-end gap-2">

              <span className="font-bold">
                Permit No.:
              </span>

              <span className="border-b border-black w-48 text-center px-2 font-bold">
                {coiData.permitNo}
              </span>

            </div>


            <div className="flex items-end gap-2">

              <span className="font-bold">
                Date:
              </span>

              <span className="border-b border-black w-40 text-center px-2 font-bold">
                {coiData.date}
              </span>

            </div>

          </div>


          {/* ==================================================
              CERTIFICATION TEXT
          ================================================== */}

          <div className="text-[15px] space-y-5 mb-8">

            <div className="flex items-end gap-2">

              <span>
                This is to Certify that Mr./Ms.
              </span>

              <span className="border-b border-black flex-1 text-center font-black italic px-2">
                {coiData.ownerName}
              </span>

              <span>
                is a legitimate owner of:
              </span>

            </div>


            {/* =================================================
                VESSEL TYPE
            ================================================= */}

            <div className="grid grid-cols-3 gap-y-3 py-4 border border-slate-50 rounded-lg px-4">

              {[
                {
                  label:
                    'Motorized Boat',
                  id:
                    'motorized'
                },
                {
                  label:
                    'Non-Motorized',
                  id:
                    'non-motorized'
                }
              ].map(
                item => (

                  <div
                    key={
                      item.id
                    }
                    className="flex items-center gap-2"
                  >

                    <span className="border border-black w-4 h-4 flex items-center justify-center text-[10px] font-bold">

                      {coiData.vesselType ===
                      item.id
                        ? 'X'
                        : ''}

                    </span>


                    <label className="text-[10px] font-bold uppercase tracking-tighter">

                      {item.label}

                    </label>

                  </div>

                )
              )}

            </div>


            {/* =================================================
                BARANGAY
            ================================================= */}

            <div className="flex items-end gap-2">

              <span>
                Located at Barangay
              </span>

              <span className="border-b border-black flex-1 text-center font-bold italic px-2">

                {coiData.barangay}

              </span>

              <span>
                , Romblon, Romblon and has been
              </span>

            </div>


            <p className="leading-none text-justify">

              inspected by the Fishery Law Enforcer of this office and found to be in accordance with the rules and regulations of the Municipality of Romblon.

            </p>

          </div>


          {/* ==================================================
              VESSEL DETAILS
          ================================================== */}

          <div className="space-y-4 mb-10">

            <div className="flex items-end gap-2 text-[11px] font-bold uppercase">

              <span>
                NAME OF FISHING VESSEL / ASSET:
              </span>

              <span className="border-b border-black flex-1 px-1 italic">

                {coiData.vesselName}

              </span>

            </div>


            <div className="grid grid-cols-6 border border-black text-[10px] font-bold uppercase">

              {/* ENGINE MAKE */}

              <div className="border-r border-black p-2 space-y-1 h-16">

                <label
                  htmlFor="engineMake"
                  className="text-[9px] text-slate-500 block"
                >
                  ENGINE MAKE
                </label>

                <input
                  id="engineMake"
                  name="engineMake"
                  title="Engine Make"
                  placeholder="E.G. YAMAHA"
                  value={
                    coiData.engineMake
                  }
                  onChange={
                    handleChange
                  }
                  className="w-full bg-transparent outline-none border-b border-black/20 focus:border-black italic"
                />

              </div>


              {/* PLACE OF BUILT */}

              <div className="border-r border-black p-2 space-y-1 h-16">

                <label className="text-[9px] text-slate-500 block">

                  PLACE OF BUILT

                </label>

                <div className="border-b border-black/20 text-center italic">

                  {
                    coiData.placeOfBuilt ||
                    'N/A'
                  }

                </div>

              </div>


              {/* NO. OF BUILT */}

              <div className="border-r border-black p-2 space-y-1">

                <label
                  htmlFor="boat_builder_no"
                  className="text-[9px] text-slate-500 block"
                >

                  NO. OF BUILT

                </label>

                <input
                  id="boat_builder_no"
                  name="boat_builder_no"
                  title="NO. OF BUILT"
                  placeholder="E.G. 1"
                  value={
                    coiData.boat_builder_no
                  }
                  onChange={
                    handleChange
                  }
                  className="w-full bg-transparent outline-none border-b border-black/20 focus:border-black italic"
                />

              </div>


              {/* YEAR BUILT */}

              <div className="border-r border-black p-2 space-y-1 h-16">

                <label className="text-[9px] text-slate-500 block">

                  YEAR BUILT

                </label>

                <div className="border-b border-black/20 text-center italic">

                  {
                    coiData.yearBuilt ||
                    'N/A'
                  }

                </div>

              </div>


              {/* HORSE POWER */}

              <div className="border-r border-black p-2 space-y-1">

                <label
                  htmlFor="horsePower"
                  className="text-[9px] text-slate-500 block"
                >

                  HORSE POWER

                </label>

                <input
                  id="horsePower"
                  name="horsePower"
                  title="Horse Power"
                  placeholder="E.G. 16 HP"
                  value={
                    coiData.horsePower
                  }
                  onChange={
                    handleChange
                  }
                  className="w-full bg-transparent outline-none border-b border-black/20 focus:border-black italic"
                />

              </div>


              {/* SERIAL */}

              <div className="p-2 space-y-1">

                <label
                  htmlFor="serialNumber"
                  className="text-[9px] text-slate-500 block"
                >

                  SERIAL NUMBER

                </label>

                <input
                  id="serialNumber"
                  name="serialNumber"
                  title="Serial Number"
                  placeholder="E.G. SN-9821X"
                  value={
                    coiData.serialNumber
                  }
                  onChange={
                    handleChange
                  }
                  className="w-full bg-transparent outline-none border-b border-black/20 focus:border-black italic"
                />

              </div>

            </div>

          </div>


          {/* ==================================================
              INSPECTOR CERTIFICATION
          ================================================== */}

          <div className="text-[13px] italic mb-12">

            <p className="indent-10 text-justify">

              I hereby certify that all information herein was true and correct and that actual inspection of the fishing vessel/gears was conducted.

            </p>


            <div className="mt-8 ml-auto w-64 text-center">

              <div className="border-b border-black font-bold uppercase py-1 italic">

                {coiData.inspectorName}

              </div>

              <p className="text-[10px] font-bold not-italic tracking-wide">

                Fishery Law Enforcer

              </p>

            </div>

          </div>


          {/* ==================================================
              DIMENSIONS / TONNAGES
          ================================================== */}

          <table className="w-full border-collapse border border-black text-[10px] font-bold uppercase mb-6">

            <thead>

              <tr className="text-center">

                <th
                  colSpan={3}
                  className="border border-black p-1 bg-slate-50"
                >

                  FISHING VESSEL DIMENSION AND TONNAGES

                </th>

              </tr>


              <tr className="text-center">

                <th className="border border-black p-1 w-1/3">

                  <label htmlFor="length">
                    LENGTH (meters)
                  </label>

                </th>

                <th className="border border-black p-1 w-1/3">

                  <label htmlFor="breadth">
                    BREADTH (meters)
                  </label>

                </th>

                <th className="border border-black p-1 w-1/3">

                  <label htmlFor="depth">
                    DEPTH (meters)
                  </label>

                </th>

              </tr>

            </thead>


            <tbody>

              <tr className="h-8 text-center font-bold text-sm">

                <td className="border border-black px-1">

                  <input
                    id="length"
                    name="length"
                    title="Hull Length in meters"
                    placeholder="0.00"
                    value={
                      coiData.length
                    }
                    onChange={
                      handleChange
                    }
                    className="w-full text-center outline-none bg-transparent"
                  />

                </td>


                <td className="border border-black px-1">

                  <input
                    id="breadth"
                    name="breadth"
                    title="Hull Breadth in meters"
                    placeholder="0.00"
                    value={
                      coiData.breadth
                    }
                    onChange={
                      handleChange
                    }
                    className="w-full text-center outline-none bg-transparent"
                  />

                </td>


                <td className="border border-black px-1">

                  <input
                    id="depth"
                    name="depth"
                    title="Hull Depth in meters"
                    placeholder="0.00"
                    value={
                      coiData.depth
                    }
                    onChange={
                      handleChange
                    }
                    className="w-full text-center outline-none bg-transparent"
                  />

                </td>

              </tr>


              <tr className="font-bold">

                <td className="border border-black p-2 px-3 uppercase">

                  Gross Tonnage:

                  <span className="ml-2 font-black text-xs">

                    {
                      coiData.grossTonnage
                    }

                  </span>

                </td>


                <td
                  colSpan={2}
                  className="border border-black p-2 px-3 uppercase"
                >

                  Net tonnage:

                  <span className="ml-2 font-black text-xs">

                    {
                      coiData.netTonnage
                    }

                  </span>

                </td>

              </tr>

            </tbody>

          </table>


          {/* ==================================================
              REMARKS / AMOUNT
          ================================================== */}

          <div className="flex border border-black text-[10px] font-bold uppercase mb-10">

            <div className="w-1/2 p-2 border-r border-black min-h-[1.4in]">

              <label
                htmlFor="remarks"
                className="mb-2 tracking-widest text-[9px] text-slate-500 uppercase block"
              >

                REMARKS:

              </label>


              <textarea
                id="remarks"
                name="remarks"
                title="Inspection Remarks"
                placeholder="ADD OPTIONAL REMARKS HERE..."
                value={
                  coiData.remarks
                }
                onChange={
                  handleChange
                }
                className="w-full h-24 bg-transparent outline-none resize-none border-none p-0 leading-relaxed italic text-[11px]"
              />

            </div>


            <div className="w-1/2 bg-slate-50/20">

              <div className="grid grid-cols-5 border-b border-black bg-slate-100 font-black">

                <div className="col-span-4 p-1"></div>

                <div className="border-l border-black p-1 text-center text-[9px]">

                  AMOUNT

                </div>

              </div>


              {[...Array(6)].map(
                (_, i) => (

                  <div
                    key={i}
                    className="grid grid-cols-5 border-b border-black last:border-0 h-6"
                  >

                    <div className="col-span-4"></div>

                    <div className="border-l border-black p-1 flex items-center px-2">

                      ₱

                    </div>

                  </div>

                )
              )}


              <div className="grid grid-cols-5 border-t border-black bg-slate-100 font-black">

                <div className="col-span-4 p-1.5 px-3">

                  TOTAL AMOUNT

                </div>

                <div className="border-l border-black p-1 flex items-center px-2 text-xs font-black">

                  ₱

                </div>

              </div>

            </div>

          </div>


          {/* ==================================================
              SIGNATURES
          ================================================== */}

          <div className="grid grid-cols-2 gap-12 mt-16 text-[11px] font-bold uppercase">

            <div className="space-y-12">

              <div className="text-center">

                <div className="border-b border-black mb-1 pb-1">

                  MIGUEL D. CORTEZ

                </div>

                <p className="text-[10px] font-bold">

                  FARMO - Designate

                </p>

              </div>


              <div className="text-center">

                <div className="border-b border-black mb-1 pb-1">

                  RAYMUND JUVIAN M. MORATIN

                </div>

                <p className="text-[10px] font-bold tracking-tighter leading-none">

                  MGDH-I (Municipal Agriculturist)

                </p>

              </div>

            </div>


            {/* =================================================
                O.R. BOX
            ================================================= */}

            <div className="border-2 border-slate-900 p-6 space-y-6 rounded-xl h-fit">

              <div className="flex justify-between items-end border-b-2 border-black pb-2">

                <label
                  htmlFor="orNumber"
                  className="text-[9px] tracking-widest text-slate-500 font-black"
                >

                  O.R. NO.:

                </label>


                <Input
                  id="orNumber"
                  name="orNumber"
                  title="Official Receipt Number"
                  placeholder="REQUIRED"
                  value={
                    coiData.orNumber
                  }
                  onChange={
                    handleChange
                  }
                  className="border-none h-6 p-0 bg-transparent text-right font-black text-xl text-blue-800 italic focus-visible:ring-0 w-36"
                />

              </div>


              <div className="flex justify-between items-end border-b border-black/30 pb-2">

                <span className="text-[9px] tracking-widest text-slate-400 font-black">

                  AUDIT REF.:

                </span>


                <div className="w-36 text-right font-mono text-[10px]">

                  {
                    coiData.permitNo.slice(
                      0,
                      8
                    )
                  }

                </div>

              </div>

            </div>

          </div>

        </div>

      </div>

    );

  }


  /* ==========================================================
     PENDING VESSELS
  ========================================================== */

  const pendingVessels =
    assignedVessels.filter(
      (v: any) => {

        const isPendingState =
          String(
            v.status
          ).toUpperCase() ===
          'SCHEDULED';

        return (
          isPendingState &&
          isValidCOIType(v)
        );

      }
    );


  /* ==========================================================
     AUDIT QUEUE
  ========================================================== */

  return (

    <div className="p-8 max-w-6xl mx-auto min-h-screen">

      <header className="mb-12 flex justify-between items-end">

        <div>

          <div className="flex items-center gap-2 text-blue-600 font-black text-[10px] uppercase tracking-widest mb-2">

            <ClipboardCheck
              size={14}
            />

            Field Inspection Management

          </div>


          <h1 className="text-4xl font-black tracking-tighter text-slate-900 uppercase italic leading-none">

            Audit{' '}

            <span className="text-blue-600">

              Queue

            </span>

          </h1>

        </div>


        <Badge className="bg-slate-100 text-slate-600 border border-slate-200 px-6 py-2 rounded-full font-black text-[10px] uppercase tracking-widest shadow-sm">

          {
            pendingVessels.length
          }

          {' '}

          Units

        </Badge>

      </header>


      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

        {pendingVessels.length ===
        0 ? (

          <div className="col-span-full py-24 text-center border-2 border-dashed border-slate-200 rounded-3xl bg-white shadow-sm">

            <Ship
              size={48}
              className="mx-auto text-slate-300 mb-4 stroke-1"
            />


            <h3 className="text-lg font-black text-slate-700 uppercase tracking-tight">

              No Pending Audits

            </h3>


            <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider">

              There are currently no vessels scheduled for inspection in your queue.

            </p>

          </div>

        ) : (

          pendingVessels.map(
            (vessel: any) => (

              <div
                key={
                  vessel.id
                }
                onClick={() =>
                  navigate(
                    `/inspector/inspection/${vessel.id}`
                  )
                }
                className="group bg-white border border-slate-200 hover:border-blue-600 rounded-3xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer flex flex-col justify-between relative overflow-hidden"
              >

                <div className="absolute top-0 left-0 w-2 h-full bg-slate-200 group-hover:bg-blue-600 transition-colors" />


                <div>

                  <div className="flex justify-between items-start mb-4">

                    <Badge className="bg-slate-100 text-slate-700 group-hover:bg-blue-50 group-hover:text-blue-700 font-black text-[9px] uppercase tracking-widest border-none px-3 py-1">

                      {
                        vessel.asset_category ||
                        'Vessel'
                      }

                      {' • '}

                      {
                        vessel.is_motorized
                          ? 'Motorized'
                          : 'Non-Motorized'
                      }

                    </Badge>


                    <span className="font-mono text-[10px] text-slate-400 font-bold">

                      {
                        vessel.id?.slice(
                          0,
                          8
                        )
                      }

                    </span>

                  </div>


                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight group-hover:text-blue-600 transition-colors mb-1 truncate">

                    {
                      vessel.vessel_name ||
                      vessel.gear_type ||
                      'Unnamed Unit'
                    }

                  </h3>


                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-6 flex items-center gap-1">

                    <span className="text-slate-400 font-normal">

                      Owner:

                    </span>

                    {
                      vessel.owner_name ||
                      vessel.owner ||
                      'N/A'
                    }

                  </p>


                  <div className="grid grid-cols-2 gap-3 py-4 border-y border-slate-100 text-[10px] font-bold uppercase text-slate-600 mb-6">

                    <div>

                      <span className="text-slate-400 block font-normal text-[9px]">

                        Barangay

                      </span>

                      <span className="truncate block">

                        {
                          vessel.barangay ||
                          'N/A'
                        }

                      </span>

                    </div>


                    <div>

                      <span className="text-slate-400 block font-normal text-[9px]">

                        Status

                      </span>

                      <span className="text-amber-600">

                        {
                          vessel.status
                        }

                      </span>

                    </div>

                  </div>

                </div>


                <div className="flex items-center justify-between pt-2">

                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-blue-600 transition-colors">

                    Proceed to Audit

                  </span>


                  <div className="w-8 h-8 rounded-full bg-slate-50 group-hover:bg-blue-600 group-hover:text-white flex items-center justify-center transition-all">

                    <ArrowLeft
                      size={14}
                      className="rotate-180"
                    />

                  </div>

                </div>

              </div>

            )
          )

        )}

      </div>

    </div>

  );

}