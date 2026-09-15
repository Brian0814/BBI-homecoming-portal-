/**
 * BBI Homecoming Reunion 2026 - Comprehensive Excel (.xlsx) Report Generator
 * Generates an executive-grade, multi-sheet Excel workbook containing:
 *  1. Master Registration & Payment Ledger (All member details, contact info, sizing, package & financial ledger)
 *  2. Itemized Payment Transactions (Complete audit trail of every recorded transaction)
 *  3. Payment Milestones & Installments (Breakdown of scheduled milestones per attendee)
 *  4. Earmarked Treasury Funds (Sponsorships, donor funds, and member allocations)
 *  5. Executive Financial & Sizing Summary (Treasury KPI metrics, package distribution, merchandise counts)
 */

import * as XLSX from "xlsx";
import { HistoryEntry, EarmarkedFund, PACKAGE_OPTIONS } from "../types";
import { 
  getAttendeePaymentStats, 
  getAttendeeTransactions, 
  getPaymentMilestones, 
  formatDisplayDate,
  sanitizeEmailText
} from "./paymentUtils";

interface ExportExcelOptions {
  history: HistoryEntry[];
  earmarkedFunds?: EarmarkedFund[];
  fileName?: string;
  includeSheets?: {
    master?: boolean;
    transactions?: boolean;
    milestones?: boolean;
    earmarked?: boolean;
    summary?: boolean;
  };
}

/**
 * Builds and downloads a comprehensive multi-sheet Excel (.xlsx) report
 */
export function exportComprehensiveExcelReport({
  history,
  earmarkedFunds = [],
  fileName,
  includeSheets = {}
}: ExportExcelOptions): void {
  const wb = XLSX.utils.book_new();
  const timestamp = new Date().toISOString().split("T")[0];
  const safeFileName = fileName || `BBI_Homecoming_2026_Comprehensive_Report_${timestamp}.xlsx`;

  const shouldInclude = (sheetKey: keyof NonNullable<ExportExcelOptions["includeSheets"]>) => {
    return includeSheets[sheetKey] !== false;
  };

  // =========================================================================
  // SHEET 1: Master Registrations & Payment Ledger
  // =========================================================================
  if (shouldInclude("master")) {
    const masterHeaders = [
    "Reference ID",
    "Registration Date",
    "Full Name",
    "Email Address",
    "Phone Number",
    "Street Address",
    "City",
    "State",
    "ZIP Code",
    "Selected Package",
    "Base Package Cost ($)",
    "T-Shirt Size",
    "Chapter Jacket Ordered",
    "Chapter Jacket Cost ($)",
    "Jacket Size",
    "Jacket Crossing Year",
    "Jacket Line Name",
    "Jacket Entire Line Name",
    "Jacket Line Number",
    "CCU Football Game RSVP",
    "Required Deposit ($)",
    "Grand Total Cost ($)",
    "Total Paid to Date ($)",
    "Outstanding Balance ($)",
    "Payment Status",
    "Total Payments Count",
    "Last Payment Date",
    "Last Payment Method",
    "Last Payment Amount ($)",
    "Special Requests & Committee Notes"
  ];

  const masterRows: any[][] = [];

  history.forEach((attendee) => {
    const pkg = PACKAGE_OPTIONS.find((p) => p.id === attendee.formData.selectedPackageId);
    const packageName = pkg?.name || "Unknown Package";
    const basePrice = pkg?.price || 0;
    const { totalPaid, balanceDue, statusLabel, transactions } = getAttendeePaymentStats(attendee);

    // Initial deposit requirement calculation
    const packageDeposit = (pkg && pkg.id !== "jacket-only") ? 100 : 0;
    const jacketDeposit = attendee.formData.addDetroitJacket ? 70 : 0;
    const requiredDeposit = packageDeposit + jacketDeposit;

    const jacketCost = attendee.formData.addDetroitJacket ? 135 : 0;
    const grandTotal = basePrice + jacketCost;

    // Transaction stats
    const lastTx = transactions.length > 0 ? transactions[transactions.length - 1] : null;

    masterRows.push([
      attendee.ref,
      attendee.date ? formatDisplayDate(attendee.date) : "N/A",
      attendee.formData.fullName,
      attendee.formData.email,
      attendee.formData.phone,
      attendee.formData.shippingAddress.street,
      sanitizeEmailText(attendee.formData.shippingAddress.city),
      attendee.formData.shippingAddress.state,
      attendee.formData.shippingAddress.zipCode,
      packageName,
      basePrice,
      attendee.formData.shirtSize,
      attendee.formData.addDetroitJacket ? "YES" : "NO",
      jacketCost,
      attendee.formData.jacketSize || "N/A",
      attendee.formData.jacketCrossingYear || "N/A",
      attendee.formData.jacketLineName || "N/A",
      attendee.formData.jacketEntireLineName || "N/A",
      attendee.formData.jacketLineNumber || "N/A",
      attendee.formData.addFootballTicket ? "YES (Buy Direct)" : "NO",
      requiredDeposit,
      grandTotal,
      totalPaid,
      balanceDue,
      statusLabel,
      transactions.length,
      lastTx ? formatDisplayDate(lastTx.date) : "None",
      lastTx?.method || "None",
      lastTx ? lastTx.amount : 0,
      attendee.formData.specialRequests || "None"
    ]);
  });

  const wsMaster = XLSX.utils.aoa_to_sheet([masterHeaders, ...masterRows]);
  wsMaster["!cols"] = [
    { wch: 16 }, // Ref
    { wch: 14 }, // Date
    { wch: 22 }, // Full Name
    { wch: 28 }, // Email
    { wch: 16 }, // Phone
    { wch: 26 }, // Street
    { wch: 16 }, // City
    { wch: 8 },  // State
    { wch: 10 }, // ZIP
    { wch: 34 }, // Package
    { wch: 18 }, // Base Price
    { wch: 12 }, // Shirt Size
    { wch: 18 }, // Jacket Ordered
    { wch: 18 }, // Jacket Cost
    { wch: 12 }, // Jacket Size
    { wch: 18 }, // Crossing Year
    { wch: 22 }, // Line Name
    { wch: 24 }, // Entire Line Name
    { wch: 16 }, // Line Number
    { wch: 22 }, // Football RSVP
    { wch: 18 }, // Required Deposit
    { wch: 18 }, // Grand Total
    { wch: 18 }, // Total Paid
    { wch: 18 }, // Balance Due
    { wch: 18 }, // Payment Status
    { wch: 18 }, // Payments Count
    { wch: 16 }, // Last Payment Date
    { wch: 18 }, // Last Payment Method
    { wch: 20 }, // Last Payment Amount
    { wch: 35 }  // Special Requests
  ];
  XLSX.utils.book_append_sheet(wb, wsMaster, "Master Ledger");
  }

  // =========================================================================
  // SHEET 2: Itemized Payment Transactions (Audit Trail)
  // =========================================================================
  if (shouldInclude("transactions")) {
  const txHeaders = [
    "Transaction ID",
    "Payment Date",
    "Reference ID",
    "Member Name",
    "Member Email",
    "Payment Amount ($)",
    "Payment Method",
    "Payment Memo / Notes",
    "Selected Package",
    "Registration Total ($)",
    "Total Paid to Date ($)",
    "Remaining Balance ($)",
    "Payment Status"
  ];

  const txRows: any[][] = [];

  history.forEach((attendee) => {
    const pkg = PACKAGE_OPTIONS.find((p) => p.id === attendee.formData.selectedPackageId);
    const { totalPaid, balanceDue, statusLabel } = getAttendeePaymentStats(attendee);
    const txs = getAttendeeTransactions(attendee);
    const grandTotal = (pkg?.price || 0) + (attendee.formData.addDetroitJacket ? 135 : 0);

    txs.forEach((tx) => {
      txRows.push([
        tx.id,
        formatDisplayDate(tx.date),
        attendee.ref,
        attendee.formData.fullName,
        attendee.formData.email,
        tx.amount,
        tx.method || "Zelle",
        tx.notes || "Registration Payment",
        pkg?.name || "Package",
        grandTotal,
        totalPaid,
        balanceDue,
        statusLabel
      ]);
    });
  });

  // Sort transactions chronologically (newest first)
  txRows.sort((a, b) => new Date(b[1]).getTime() - new Date(a[1]).getTime());

  const wsTx = XLSX.utils.aoa_to_sheet([txHeaders, ...txRows]);
  wsTx["!cols"] = [
    { wch: 24 }, // Tx ID
    { wch: 14 }, // Date
    { wch: 16 }, // Ref
    { wch: 22 }, // Member Name
    { wch: 28 }, // Email
    { wch: 18 }, // Amount
    { wch: 18 }, // Method
    { wch: 32 }, // Memo/Notes
    { wch: 30 }, // Package
    { wch: 18 }, // Total
    { wch: 18 }, // Total Paid
    { wch: 18 }, // Balance
    { wch: 16 }  // Status
  ];
  XLSX.utils.book_append_sheet(wb, wsTx, "Payment Transactions");
  }

  // =========================================================================
  // SHEET 3: Milestone Installment Schedule Tracking
  // =========================================================================
  if (shouldInclude("milestones")) {
  const milestoneHeaders = [
    "Reference ID",
    "Member Name",
    "Selected Package",
    "Grand Total ($)",
    "Total Paid to Date ($)",
    "Balance Remaining ($)",
    "July 19 Milestone ($)",
    "July 19 Status",
    "August 15 Milestone ($)",
    "August 15 Status",
    "September 15 Milestone ($)",
    "September 15 Status",
    "October 15 Milestone ($)",
    "October 15 Status"
  ];

  const milestoneRows: any[][] = [];

  history.forEach((attendee) => {
    const pkg = PACKAGE_OPTIONS.find((p) => p.id === attendee.formData.selectedPackageId);
    const { totalPaid, balanceDue } = getAttendeePaymentStats(attendee);
    const grandTotal = (pkg?.price || 0) + (attendee.formData.addDetroitJacket ? 135 : 0);
    const milestones = getPaymentMilestones(attendee.formData.selectedPackageId, attendee.formData.addDetroitJacket);

    const mJuly = milestones.find((m) => m.date === "July 19");
    const mAug = milestones.find((m) => m.date === "August 15");
    const mSept = milestones.find((m) => m.date === "September 15");
    const mOct = milestones.find((m) => m.date === "October 15");

    // Cumulative status logic based on total paid
    const julyTarget = mJuly?.amount || 0;
    const augTarget = julyTarget + (mAug?.amount || 0);
    const septTarget = augTarget + (mSept?.amount || 0);
    const octTarget = grandTotal;

    const julyStatus = totalPaid >= julyTarget ? "CLEARED" : `DUE ($${Math.max(0, julyTarget - totalPaid)})`;
    const augStatus = totalPaid >= augTarget ? "CLEARED" : (totalPaid >= julyTarget ? `DUE ($${Math.max(0, augTarget - totalPaid)})` : "PENDING DEPOSIT");
    const septStatus = totalPaid >= septTarget ? "CLEARED" : (totalPaid >= augTarget ? `DUE ($${Math.max(0, septTarget - totalPaid)})` : "PENDING");
    const octStatus = totalPaid >= octTarget ? "PAID IN FULL" : (totalPaid >= septTarget ? `DUE ($${Math.max(0, octTarget - totalPaid)})` : "PENDING");

    milestoneRows.push([
      attendee.ref,
      attendee.formData.fullName,
      pkg?.name || "Package",
      grandTotal,
      totalPaid,
      balanceDue,
      mJuly?.amount || 0,
      julyStatus,
      mAug?.amount || 0,
      augStatus,
      mSept?.amount || 0,
      septStatus,
      mOct?.amount || 0,
      octStatus
    ]);
  });

  const wsMilestones = XLSX.utils.aoa_to_sheet([milestoneHeaders, ...milestoneRows]);
  wsMilestones["!cols"] = [
    { wch: 16 }, // Ref
    { wch: 22 }, // Name
    { wch: 30 }, // Package
    { wch: 16 }, // Total
    { wch: 18 }, // Paid
    { wch: 18 }, // Balance
    { wch: 18 }, // July $
    { wch: 16 }, // July Status
    { wch: 18 }, // Aug $
    { wch: 16 }, // Aug Status
    { wch: 18 }, // Sept $
    { wch: 16 }, // Sept Status
    { wch: 18 }, // Oct $
    { wch: 16 }  // Oct Status
  ];
  XLSX.utils.book_append_sheet(wb, wsMilestones, "Milestone Tracking");
  }

  // =========================================================================
  // SHEET 4: Earmarked Treasury Funds & Sponsorships
  // =========================================================================
  if (shouldInclude("earmarked")) {
  const earmarkedHeaders = [
    "Fund ID",
    "Source / Donor Name",
    "Contact Email",
    "Contact Phone",
    "Date Received",
    "Payment Method",
    "Original Fund Amount ($)",
    "Allocated Amount ($)",
    "Remaining Balance ($)",
    "Fund Status",
    "Allocated Beneficiaries",
    "Fund Notes / Purpose"
  ];

  const earmarkedRows: any[][] = [];

  earmarkedFunds.forEach((fund) => {
    const allocationsText = (fund.allocations || [])
      .map((a) => `${a.attendeeName} ($${a.amount}) [Ref: ${a.registrationRef}]`)
      .join("; ") || "None";

    earmarkedRows.push([
      fund.id,
      fund.sourceName,
      fund.email || "N/A",
      fund.phone || "N/A",
      formatDisplayDate(fund.date),
      fund.method,
      fund.amount,
      fund.allocatedAmount || 0,
      fund.remainingAmount ?? (fund.amount - (fund.allocatedAmount || 0)),
      fund.status.toUpperCase(),
      allocationsText,
      fund.notes || "None"
    ]);
  });

  const wsEarmarked = XLSX.utils.aoa_to_sheet([earmarkedHeaders, ...earmarkedRows]);
  wsEarmarked["!cols"] = [
    { wch: 20 }, // ID
    { wch: 24 }, // Source Name
    { wch: 24 }, // Email
    { wch: 16 }, // Phone
    { wch: 14 }, // Date
    { wch: 16 }, // Method
    { wch: 20 }, // Original Amount
    { wch: 18 }, // Allocated
    { wch: 18 }, // Remaining
    { wch: 16 }, // Status
    { wch: 38 }, // Beneficiaries
    { wch: 32 }  // Notes
  ];
  XLSX.utils.book_append_sheet(wb, wsEarmarked, "Earmarked Treasury");
  }

  // =========================================================================
  // SHEET 5: Executive Financial & Operations Summary
  // =========================================================================
  if (shouldInclude("summary")) {
    let totalCommitted = 0;
    let totalCollected = 0;
    let totalBalanceDue = 0;
    let paidInFullCount = 0;
    let depositPaidCount = 0;
    let unpaidCount = 0;
    let jacketOrdersCount = 0;
    let jacketRevenue = 0;

    const packageCounts: Record<string, number> = {};
    const shirtCounts: Record<string, number> = {};
    const jacketSizeCounts: Record<string, number> = {};
    const paymentMethodTotals: Record<string, number> = {};

    history.forEach((attendee) => {
      const pkg = PACKAGE_OPTIONS.find((p) => p.id === attendee.formData.selectedPackageId);
      const { totalPaid, balanceDue, statusLabel, transactions } = getAttendeePaymentStats(attendee);
      const grandTotal = (pkg?.price || 0) + (attendee.formData.addDetroitJacket ? 135 : 0);

      totalCommitted += grandTotal;
      totalCollected += totalPaid;
      totalBalanceDue += balanceDue;

      if (balanceDue <= 0.01) {
        paidInFullCount++;
      } else if (totalPaid > 0) {
        depositPaidCount++;
      } else {
        unpaidCount++;
      }

      if (attendee.formData.addDetroitJacket) {
        jacketOrdersCount++;
        jacketRevenue += 135;
        const jSize = attendee.formData.jacketSize || "Unspecified";
        jacketSizeCounts[jSize] = (jacketSizeCounts[jSize] || 0) + 1;
      }

      const pkgName = pkg?.name || "Other";
      packageCounts[pkgName] = (packageCounts[pkgName] || 0) + 1;

      const sSize = attendee.formData.shirtSize || "Unspecified";
      shirtCounts[sSize] = (shirtCounts[sSize] || 0) + 1;

      transactions.forEach((tx) => {
        const m = tx.method || "Other";
        paymentMethodTotals[m] = (paymentMethodTotals[m] || 0) + (tx.amount || 0);
      });
    });

    const collectionRate = totalCommitted > 0 ? ((totalCollected / totalCommitted) * 100).toFixed(1) : "0.0";

    const summaryData: any[][] = [
      ["BBI HOMECOMING REUNION 2026 - EXECUTIVE SUMMARY & TREASURY REPORT"],
      [`Generated On: ${new Date().toLocaleString()}`],
      [],
      ["METRIC", "VALUE", "DETAILS / NOTES"],
      ["Total Member Registrations", history.length, "Total attendees enrolled in system"],
      ["Total Committed Registration Revenue", `$${totalCommitted.toLocaleString()}`, "Gross total of all packages and add-ons"],
      ["Total Funds Collected to Date", `$${totalCollected.toLocaleString()}`, "Cleared payments recorded in ledger"],
      ["Total Outstanding Balances Due", `$${totalBalanceDue.toLocaleString()}`, "Remaining receivables to collect"],
      ["Collection Progress Rate", `${collectionRate}%`, "Percentage of total committed revenue collected"],
      ["Paid In Full Members", paidInFullCount, `Accounts with $0.00 balance (${history.length ? ((paidInFullCount / history.length) * 100).toFixed(1) : 0}%)`],
      ["Partial / Deposit Paid Members", depositPaidCount, `Accounts with active installment payments (${history.length ? ((depositPaidCount / history.length) * 100).toFixed(1) : 0}%)`],
      ["Unpaid / Pending Members", unpaidCount, `Accounts with zero payments recorded (${history.length ? ((unpaidCount / history.length) * 100).toFixed(1) : 0}%)`],
      ["Custom Chapter Jackets Ordered", jacketOrdersCount, `Total jacket units ($${jacketRevenue.toLocaleString()} revenue)`],
      [],
      ["PACKAGE BREAKDOWN", "MEMBERS ENROLLED", "PERCENTAGE OF ATTENDEES"],
      ...Object.entries(packageCounts).map(([name, count]) => [
        name,
        count,
        `${history.length ? ((count / history.length) * 100).toFixed(1) : 0}%`
      ]),
      [],
      ["PAYMENT METHODS BREAKDOWN", "TOTAL AMOUNT COLLECTED ($)", "SHARE OF TOTAL"],
      ...Object.entries(paymentMethodTotals).map(([method, amount]) => [
        method,
        `$${amount.toLocaleString()}`,
        `${totalCollected ? ((amount / totalCollected) * 100).toFixed(1) : 0}%`
      ]),
      [],
      ["CORE T-SHIRT SIZES DISTRIBUTION", "QUANTITY NEEDED", "NOTES"],
      ...Object.entries(shirtCounts).map(([size, count]) => [
        size,
        count,
        "Official Homecoming Commemorative T-Shirt"
      ]),
      [],
      ["CUSTOM CHAPTER JACKET SIZES", "QUANTITY NEEDED", "NOTES"],
      ...Object.entries(jacketSizeCounts).map(([size, count]) => [
        size,
        count,
        "Carhartt-Style Custom Chapter Jacket"
      ])
    ];

    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    wsSummary["!cols"] = [
      { wch: 38 },
      { wch: 24 },
      { wch: 45 }
    ];
    XLSX.utils.book_append_sheet(wb, wsSummary, "Executive Summary");
  }

  // =========================================================================
  // Generate and Trigger Download with Bulletproof Fallback
  // =========================================================================
  try {
    XLSX.writeFile(wb, safeFileName);
  } catch (err) {
    console.warn("Direct XLSX.writeFile fallback triggered:", err);
    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([wbout], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = safeFileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
