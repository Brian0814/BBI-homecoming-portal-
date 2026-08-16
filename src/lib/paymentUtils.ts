export interface MilestoneItem {
  name: string;
  amount: number;
  isDeposit?: boolean;
}

export interface PaymentMilestone {
  date: string;
  amount: number;
  label: string;
  items: MilestoneItem[];
}

export function getPaymentMilestones(packageId: string, addJacket: boolean): PaymentMilestone[] {
  const milestones: PaymentMilestone[] = [];

  // 1. July 19 Milestone (Common across all packages)
  const july19Items: MilestoneItem[] = [];
  if (packageId !== "jacket-only") {
    july19Items.push(
      { name: "Box Printing", amount: 15, isDeposit: true },
      { name: "Shirt", amount: 35, isDeposit: true },
      { name: "Tumbler", amount: 15, isDeposit: true },
      { name: "Rally Towel", amount: 5, isDeposit: true },
      { name: "Engraved Whiskey Glass", amount: 30, isDeposit: true }
    );
  }
  if (addJacket) {
    july19Items.push({ name: "Jacket Optional (Deposit)", amount: 70, isDeposit: true });
  }
  const julyTotal = july19Items.reduce((sum, item) => sum + item.amount, 0);

  milestones.push({
    date: "July 19",
    label: "📅 Initial Installment / Deposit",
    amount: julyTotal,
    items: july19Items,
  });

  // 2. August 15 Milestone (Varies by package)
  const august15Items: MilestoneItem[] = [];
  if (packageId === "langston-taylor") {
    august15Items.push({ name: "Step Show", amount: 20 });
    august15Items.push({ name: "Brotherhood Event", amount: 30 });
  } else if (packageId === "leonard-morse") {
    august15Items.push({ name: "Brotherhood Event", amount: 30 });
  } else if (packageId === "charles-brown") {
    august15Items.push({ name: "Brotherhood Event", amount: 10 });
  } else if (packageId === "box-items") {
    august15Items.push({ name: "Chapter Donation", amount: 25 });
  }

  if (addJacket) {
    august15Items.push({ name: "Jacket Optional (Remaining)", amount: 65 });
  }

  const augustTotal = august15Items.reduce((sum, item) => sum + item.amount, 0);

  milestones.push({
    date: "August 15",
    label: "📅 Mid-Term Installment",
    amount: augustTotal,
    items: august15Items,
  });

  // 3. September 15 Milestone
  const september15Items: MilestoneItem[] = [];
  if (packageId === "langston-taylor" || packageId === "leonard-morse") {
    september15Items.push({ name: "Hospitality Suite", amount: 40 });
    september15Items.push({ name: "Tailgate", amount: 35 });
  }

  const septemberTotal = september15Items.reduce((sum, item) => sum + item.amount, 0);

  milestones.push({
    date: "September 15",
    label: "📅 Pre-Event Installment",
    amount: septemberTotal,
    items: september15Items,
  });

  // 4. October 15 Milestone
  const october15Items: MilestoneItem[] = [];
  if (packageId === "langston-taylor" || packageId === "leonard-morse") {
    october15Items.push({ name: "Chapter Donation", amount: 25 });
  }

  const octoberTotal = october15Items.reduce((sum, item) => sum + item.amount, 0);

  milestones.push({
    date: "October 15",
    label: "📅 Final Settlement Balance",
    amount: octoberTotal,
    items: october15Items,
  });

  return milestones;
}

import { OrderForm, HistoryEntry, PaymentTransaction, PACKAGE_OPTIONS } from "../types";

export function calculateAttendeeGrandTotal(formData: OrderForm): number {
  const selectedPackage = PACKAGE_OPTIONS.find((pkg) => pkg.id === formData.selectedPackageId);
  const base = selectedPackage?.price || 0;
  const jacket = formData.addDetroitJacket ? 135 : 0;
  return base + jacket;
}

export function getAttendeeTransactions(item: HistoryEntry): PaymentTransaction[] {
  const txs: PaymentTransaction[] = [];
  if (item.paymentTransactions && Array.isArray(item.paymentTransactions)) {
    txs.push(...item.paymentTransactions);
  } else {
    const milestones = getPaymentMilestones(item.formData.selectedPackageId, item.formData.addDetroitJacket);
    milestones.forEach((m, idx) => {
      if (item.payments?.[m.date]?.paid) {
        txs.push({
          id: `legacy-${idx}-${item.ref}`,
          amount: item.payments[m.date].amount || m.amount || 0,
          date: item.payments[m.date].paidAt || item.date || new Date().toISOString(),
          method: item.payments[m.date].method || "Zelle",
          notes: `${m.date} Milestone`
        });
      }
    });
  }
  return txs;
}

export function getAttendeePaymentStats(item: HistoryEntry) {
  const txs = getAttendeeTransactions(item);
  const grandTotal = calculateAttendeeGrandTotal(item.formData);
  const totalPaid = txs.reduce((sum, tx) => sum + (tx.amount || 0), 0);
  const balanceDue = Math.max(0, grandTotal - totalPaid);

  let statusLabel = "Unpaid";
  let statusColor = "bg-red-50 text-red-700 border-red-200";

  if (totalPaid === 0) {
    statusLabel = "Unpaid";
    statusColor = "bg-red-50/50 text-red-650 border-red-150";
  } else if (balanceDue <= 0.01) {
    statusLabel = "Paid in Full";
    statusColor = "bg-emerald-50 text-emerald-800 border-emerald-250";
  } else {
    const selectedPackage = PACKAGE_OPTIONS.find((pkg) => pkg.id === item.formData.selectedPackageId);
    const packageDeposit = (selectedPackage && selectedPackage.id !== "jacket-only") ? 100 : 0;
    const jacketDeposit = item.formData.addDetroitJacket ? 70 : 0;
    const requiredDeposit = packageDeposit + jacketDeposit;

    if (totalPaid >= requiredDeposit) {
      statusLabel = "Deposit Paid";
      statusColor = "bg-blue-50 text-brand-blue border-blue-250";
    } else {
      statusLabel = "Partially Paid";
      statusColor = "bg-amber-50 text-amber-800 border-amber-250";
    }
  }

  return { totalPaid, balanceDue, grandTotal, statusLabel, statusColor, transactions: txs };
}

export function resolveMailMergeTokens(template: string, attendee: HistoryEntry): string {
  const stats = getAttendeePaymentStats(attendee);
  const pkg = PACKAGE_OPTIONS.find((p) => p.id === attendee.formData.selectedPackageId);
  const packageName = pkg ? pkg.name : "Custom Order";

  const rawName = attendee.formData.fullName || "";
  const cleanedName = rawName.replace(/^(Bro\.|Brother)\s+/i, "").trim();
  const firstName = cleanedName.split(" ")[0] || "Brother";

  let jacketDetails = "None ordered";
  if (attendee.formData.addDetroitJacket) {
    jacketDetails = `Custom Detroit Jacket (Size ${attendee.formData.jacketSize || "N/A"}, Line Name: "${attendee.formData.jacketLineName || "N/A"}", Entire Line: "${attendee.formData.jacketEntireLineName || "N/A"}", Line #: ${attendee.formData.jacketLineNumber || "N/A"}, Year: ${attendee.formData.jacketCrossingYear || "N/A"})`;
  }

  const transactions = stats.transactions;
  const paymentsList = transactions.length > 0
    ? transactions.map(tx => `  • $${tx.amount.toLocaleString()} paid on ${new Date(tx.date).toLocaleDateString()} via ${tx.method} (${tx.notes || "Payment"})`).join("\n")
    : "  • No payments recorded to date.";

  const milestones = getPaymentMilestones(attendee.formData.selectedPackageId, attendee.formData.addDetroitJacket);
  const milestonesSchedule = milestones.map(m => {
    const hasMilestoneTx = transactions.some(tx => tx.notes === `${m.date} Milestone`);
    return `  • ${m.date}: $${m.amount.toLocaleString()} - ${hasMilestoneTx ? "PAID" : "DUE"}`;
  }).join("\n");

  const addr = attendee.formData.shippingAddress;
  const shippingAddress = addr ? `${addr.street}, ${addr.city}, ${addr.state} ${addr.zipCode}` : "None provided";

  const tokenMap: Record<string, string> = {
    "{{fullName}}": attendee.formData.fullName || "",
    "{{firstName}}": firstName,
    "{{email}}": attendee.formData.email || "",
    "{{phone}}": attendee.formData.phone || "",
    "{{ref}}": attendee.ref || "",
    "{{packageName}}": packageName,
    "{{grandTotal}}": `$${stats.grandTotal.toLocaleString()}`,
    "{{totalPaid}}": `$${stats.totalPaid.toLocaleString()}`,
    "{{balanceDue}}": `$${stats.balanceDue.toLocaleString()}`,
    "{{statusLabel}}": stats.statusLabel,
    "{{shirtSize}}": attendee.formData.shirtSize ? `Size ${attendee.formData.shirtSize}` : "N/A",
    "{{jacketDetails}}": jacketDetails,
    "{{paymentsList}}": paymentsList,
    "{{milestonesSchedule}}": milestonesSchedule,
    "{{shippingAddress}}": shippingAddress,
    "{{specialRequests}}": attendee.formData.specialRequests || "None provided",
  };

  let resolved = template;
  for (const [key, value] of Object.entries(tokenMap)) {
    // Case-insensitive token replacement
    const regex = new RegExp(key.replace(/([{}])/g, "\\$1"), "gi");
    resolved = resolved.replace(regex, value);
  }

  return resolved;
}

