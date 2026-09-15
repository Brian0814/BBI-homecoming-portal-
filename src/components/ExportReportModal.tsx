/**
 * BBI Homecoming Reunion 2026 - Export Report Modal
 * Provides customized controls for generating and downloading comprehensive Excel (.xlsx)
 * and CSV reports with customizable sheets, record filters, and treasury audits.
 */

import React, { useState } from "react";
import { HistoryEntry, EarmarkedFund } from "../types";
import { exportComprehensiveExcelReport } from "../lib/excelExport";
import { 
  FileSpreadsheet, Download, Check, X, ShieldCheck, 
  Layers, Filter, CheckCircle2, DollarSign, Users
} from "lucide-react";
import { calculateAttendeeGrandTotal, getAttendeePaymentStats } from "../lib/paymentUtils";

interface ExportReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  allAttendees: HistoryEntry[];
  filteredAttendees: HistoryEntry[];
  isFiltered: boolean;
  earmarkedFunds: EarmarkedFund[];
}

export function ExportReportModal({
  isOpen,
  onClose,
  allAttendees,
  filteredAttendees,
  isFiltered,
  earmarkedFunds
}: ExportReportModalProps) {
  // Scope selection: "all" or "filtered"
  const [exportScope, setExportScope] = useState<"all" | "filtered">(isFiltered ? "filtered" : "all");

  // Format selection: "xlsx" or "csv"
  const [format, setFormat] = useState<"xlsx" | "csv">("xlsx");

  // Included worksheets for Excel export
  const [includeMaster, setIncludeMaster] = useState(true);
  const [includeTransactions, setIncludeTransactions] = useState(true);
  const [includeMilestones, setIncludeMilestones] = useState(true);
  const [includeEarmarked, setIncludeEarmarked] = useState(true);
  const [includeSummary, setIncludeSummary] = useState(true);

  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  if (!isOpen) return null;

  const targetRecords = exportScope === "filtered" ? filteredAttendees : allAttendees;

  // Quick stats calculation for preview
  let totalCommitted = 0;
  let totalCollected = 0;
  let totalBalance = 0;
  let paidInFullCount = 0;

  targetRecords.forEach((a) => {
    const { totalPaid, balanceDue } = getAttendeePaymentStats(a);
    const grand = calculateAttendeeGrandTotal(a.formData);
    totalCommitted += grand;
    totalCollected += totalPaid;
    totalBalance += balanceDue;
    if (balanceDue <= 0.01) paidInFullCount++;
  });

  const handleRunExport = () => {
    try {
      setIsExporting(true);

      if (format === "xlsx") {
        exportComprehensiveExcelReport({
          history: targetRecords,
          earmarkedFunds: includeEarmarked ? earmarkedFunds : [],
          fileName: `BBI_Homecoming_2026_${exportScope === "filtered" ? "Filtered" : "Comprehensive"}_Report_${new Date().toISOString().split("T")[0]}.xlsx`,
          includeSheets: {
            master: includeMaster,
            transactions: includeTransactions,
            milestones: includeMilestones,
            earmarked: includeEarmarked,
            summary: includeSummary
          }
        });
      } else {
        // Flat CSV fallback export with complete payment fields
        const headers = [
          "Reference ID",
          "Registration Date",
          "Full Name",
          "Email Address",
          "Phone Number",
          "Street Address",
          "City",
          "State",
          "ZIP Code",
          "T-Shirt Size",
          "Homecoming Package",
          "Chapter Jacket Ordered",
          "Chapter Jacket Size",
          "Jacket Line Name",
          "Jacket Entire Line Name",
          "Jacket Line Number",
          "Grand Total ($)",
          "Total Paid to Date ($)",
          "Outstanding Balance ($)",
          "Payment Status",
          "Total Transactions",
          "Special Requests"
        ];

        const rows = targetRecords.map((item) => {
          const stats = getAttendeePaymentStats(item);
          const total = calculateAttendeeGrandTotal(item.formData);
          return [
            item.ref,
            new Date(item.date).toLocaleString(),
            item.formData.fullName,
            item.formData.email,
            item.formData.phone,
            item.formData.shippingAddress.street,
            item.formData.shippingAddress.city,
            item.formData.shippingAddress.state,
            item.formData.shippingAddress.zipCode,
            item.formData.shirtSize,
            item.formData.selectedPackageId,
            item.formData.addDetroitJacket ? "YES ($135)" : "NO ($0)",
            item.formData.jacketSize || "N/A",
            item.formData.jacketLineName || "N/A",
            item.formData.jacketEntireLineName || "N/A",
            item.formData.jacketLineNumber || "N/A",
            total,
            stats.totalPaid,
            stats.balanceDue,
            stats.statusLabel,
            stats.transactions.length,
            item.formData.specialRequests || "None"
          ];
        });

        const csvContent = "\uFEFF" + [
          headers.join(","),
          ...rows.map((e) => e.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(","))
        ].join("\n");

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `BBI_Homecoming_2026_${exportScope}_Report.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

      setExportSuccess(true);
      setTimeout(() => {
        setExportSuccess(false);
        onClose();
      }, 1500);
    } catch (err) {
      console.error("Export error:", err);
      alert("Failed to compile report. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-black uppercase tracking-wider text-white">
                Download Comprehensive Report
              </h2>
              <p className="text-[11px] text-slate-400 font-medium">
                Export full member registrations, ledger accounts & audit trails
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5 text-slate-800 text-xs">
          
          {/* Quick Stats Pill */}
          <div className="grid grid-cols-4 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
            <div>
              <span className="text-[9.5px] uppercase font-bold text-slate-500 block">Registrants</span>
              <span className="font-mono text-base font-black text-slate-900">{targetRecords.length}</span>
            </div>
            <div>
              <span className="text-[9.5px] uppercase font-bold text-slate-500 block">Committed</span>
              <span className="font-mono text-base font-black text-slate-900">${totalCommitted.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-[9.5px] uppercase font-bold text-emerald-600 block">Collected</span>
              <span className="font-mono text-base font-black text-emerald-600">${totalCollected.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-[9.5px] uppercase font-bold text-amber-600 block">Balance Due</span>
              <span className="font-mono text-base font-black text-amber-600">${totalBalance.toLocaleString()}</span>
            </div>
          </div>

          {/* Section 1: Scope */}
          <div className="space-y-2">
            <label className="text-[11px] font-black uppercase tracking-wider text-slate-700 block">
              1. Choose Record Scope
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setExportScope("all")}
                className={`p-3 rounded-xl border text-left flex items-start justify-between transition-all cursor-pointer ${
                  exportScope === "all"
                    ? "border-brand-blue bg-blue-50/60 ring-2 ring-brand-blue/20"
                    : "border-slate-200 bg-white hover:bg-slate-50"
                }`}
              >
                <div>
                  <span className="font-bold text-slate-900 block flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-brand-blue" />
                    All Registrations
                  </span>
                  <span className="text-[10.5px] text-slate-500">
                    Full database roster ({allAttendees.length} members)
                  </span>
                </div>
                {exportScope === "all" && <Check className="w-4 h-4 text-brand-blue mt-0.5" />}
              </button>

              <button
                type="button"
                onClick={() => setExportScope("filtered")}
                disabled={!isFiltered && filteredAttendees.length === allAttendees.length}
                className={`p-3 rounded-xl border text-left flex items-start justify-between transition-all ${
                  !isFiltered && filteredAttendees.length === allAttendees.length
                    ? "opacity-50 cursor-not-allowed border-slate-200 bg-slate-50"
                    : exportScope === "filtered"
                    ? "border-brand-blue bg-blue-50/60 ring-2 ring-brand-blue/20 cursor-pointer"
                    : "border-slate-200 bg-white hover:bg-slate-50 cursor-pointer"
                }`}
              >
                <div>
                  <span className="font-bold text-slate-900 block flex items-center gap-1.5">
                    <Filter className="w-3.5 h-3.5 text-indigo-600" />
                    Current Filter Results
                  </span>
                  <span className="text-[10.5px] text-slate-500">
                    Active search matches ({filteredAttendees.length} members)
                  </span>
                </div>
                {exportScope === "filtered" && <Check className="w-4 h-4 text-brand-blue mt-0.5" />}
              </button>
            </div>
          </div>

          {/* Section 2: Format Selection */}
          <div className="space-y-2">
            <label className="text-[11px] font-black uppercase tracking-wider text-slate-700 block">
              2. Select File Format
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setFormat("xlsx")}
                className={`p-3 rounded-xl border text-left flex items-start justify-between transition-all cursor-pointer ${
                  format === "xlsx"
                    ? "border-emerald-500 bg-emerald-50/70 ring-2 ring-emerald-500/20"
                    : "border-slate-200 bg-white hover:bg-slate-50"
                }`}
              >
                <div>
                  <span className="font-bold text-slate-900 block flex items-center gap-1.5">
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                    Microsoft Excel (.xlsx)
                  </span>
                  <span className="text-[10.5px] text-slate-500">
                    Multi-sheet workbook with styled columns & formulas
                  </span>
                </div>
                {format === "xlsx" && <Check className="w-4 h-4 text-emerald-600 mt-0.5" />}
              </button>

              <button
                type="button"
                onClick={() => setFormat("csv")}
                className={`p-3 rounded-xl border text-left flex items-start justify-between transition-all cursor-pointer ${
                  format === "csv"
                    ? "border-brand-blue bg-blue-50/60 ring-2 ring-brand-blue/20"
                    : "border-slate-200 bg-white hover:bg-slate-50"
                }`}
              >
                <div>
                  <span className="font-bold text-slate-900 block flex items-center gap-1.5">
                    <Download className="w-3.5 h-3.5 text-slate-600" />
                    Standard CSV (.csv)
                  </span>
                  <span className="text-[10.5px] text-slate-500">
                    Single flat comma-separated values file
                  </span>
                </div>
                {format === "csv" && <Check className="w-4 h-4 text-brand-blue mt-0.5" />}
              </button>
            </div>
          </div>

          {/* Section 3: Included Worksheets (Only relevant for Excel) */}
          {format === "xlsx" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-700 block">
                  3. Worksheets Included in Workbook
                </label>
                <span className="text-[10px] text-slate-400 font-semibold">5 Sheets Available</span>
              </div>

              <div className="space-y-1.5 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <label className="flex items-center gap-2.5 p-1.5 hover:bg-white rounded-lg transition-colors cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeMaster}
                    onChange={(e) => setIncludeMaster(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                  />
                  <div className="flex-1">
                    <span className="font-bold text-slate-900 block">1. Master Registration & Payment Ledger</span>
                    <span className="text-[10px] text-slate-500 block">
                      All member contact info, shipping coordinates, sizing, package & financial ledger
                    </span>
                  </div>
                </label>

                <label className="flex items-center gap-2.5 p-1.5 hover:bg-white rounded-lg transition-colors cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeTransactions}
                    onChange={(e) => setIncludeTransactions(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                  />
                  <div className="flex-1">
                    <span className="font-bold text-slate-900 block">2. Itemized Payment Transactions</span>
                    <span className="text-[10px] text-slate-500 block">
                      Full audit trail of every recorded transaction, dates, methods, amounts & notes
                    </span>
                  </div>
                </label>

                <label className="flex items-center gap-2.5 p-1.5 hover:bg-white rounded-lg transition-colors cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeMilestones}
                    onChange={(e) => setIncludeMilestones(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                  />
                  <div className="flex-1">
                    <span className="font-bold text-slate-900 block">3. Milestone Installment Schedule Tracking</span>
                    <span className="text-[10px] text-slate-500 block">
                      July 19, Aug 15, Sept 15, and Oct 15 installment targets & clearing statuses
                    </span>
                  </div>
                </label>

                <label className="flex items-center gap-2.5 p-1.5 hover:bg-white rounded-lg transition-colors cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeEarmarked}
                    onChange={(e) => setIncludeEarmarked(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                  />
                  <div className="flex-1">
                    <span className="font-bold text-slate-900 block">4. Earmarked Treasury Funds & Sponsorships</span>
                    <span className="text-[10px] text-slate-500 block">
                      Donor funds, alumni sponsorships, member credit allocations & remaining balances
                    </span>
                  </div>
                </label>

                <label className="flex items-center gap-2.5 p-1.5 hover:bg-white rounded-lg transition-colors cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeSummary}
                    onChange={(e) => setIncludeSummary(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                  />
                  <div className="flex-1">
                    <span className="font-bold text-slate-900 block">5. Executive Financial & Operations Summary</span>
                    <span className="text-[10px] text-slate-500 block">
                      KPI financial metrics, revenue, collection rate, package distribution & sizing totals
                    </span>
                  </div>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="bg-slate-50 p-4 border-t border-slate-200 flex items-center justify-between">
          <div className="text-[11px] text-slate-500 font-medium flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Complete verified data export • UTF-8 formatted</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl text-slate-600 hover:bg-slate-200 font-bold text-xs cursor-pointer transition-colors"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleRunExport}
              disabled={isExporting}
              className={`px-5 py-2.5 rounded-xl font-black text-xs shadow-md flex items-center gap-2 transition-all cursor-pointer ${
                exportSuccess
                  ? "bg-emerald-600 text-white"
                  : format === "xlsx"
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                  : "bg-slate-900 hover:bg-slate-800 text-white"
              }`}
              id="confirm-export-download-btn"
            >
              {exportSuccess ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                  <span>Report Downloaded!</span>
                </>
              ) : isExporting ? (
                <span>Compiling Excel...</span>
              ) : (
                <>
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Download {format.toUpperCase()} Report</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
