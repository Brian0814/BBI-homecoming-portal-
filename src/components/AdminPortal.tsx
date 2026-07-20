/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { OrderForm, PACKAGE_OPTIONS, SHIRT_SIZES, STATE_LIST } from "../types";
import { 
  Users, Trash2, Search, Download, Printer, ArrowUpDown, ChevronDown, 
  Layers, CreditCard, Sparkles, Filter, MoreHorizontal, ShoppingCart, 
  MapPin, Phone, Mail, FileText, ArrowLeft, Ticket, ShoppingBag, Eye, Calendar, X,
  Send, Copy, Check, Edit, AlertCircle
} from "lucide-react";
import { getPaymentMilestones } from "../lib/paymentUtils";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import { collection, query, onSnapshot, doc, setDoc, deleteDoc, getDoc } from "firebase/firestore";

interface PaymentTransaction {
  id: string;
  amount: number;
  date: string;
  method: string;
  notes?: string;
}

interface HistoryEntry {
  ref: string;
  date: string;
  formData: OrderForm;
  payments?: {
    [dateKey: string]: {
      paid: boolean;
      paidAt?: string | null;
      method?: string | null;
      amount?: number;
    };
  };
  paymentTransactions?: PaymentTransaction[];
}

interface AdminPortalProps {
  onBackToForm: () => void;
}

// Solid 5 premium seed mock records to make the portal active, robust, and completely functional on launch!
const SEED_MOCK_DATA: HistoryEntry[] = [
  {
    ref: "BBI-HMC26-LGTX5",
    date: "2026-06-12T10:14:00.000Z",
    formData: {
      fullName: "Bro. Langston Taylor",
      email: "langston.taylor@alumni.org",
      phone: "(404) 191-4111",
      shippingAddress: {
        street: "1914 Founders Boulevard",
        city: "Atlanta",
        state: "GA",
        zipCode: "30314"
      },
      shirtSize: "XL",
      specialRequests: "Tailgate vegetarian meal requested. Will be attending the regional meeting on Friday morning.",
      selectedPackageId: "langston-taylor",
      addFootballTicket: true,
      addDetroitJacket: true,
      jacketSize: "XL",
      jacketCrossingYear: "SPR 1999",
      jacketLineName: "THE SOLITARY FIRST",
      jacketEntireLineName: "5 SOULS OF TRANSFORMATION",
      jacketLineNumber: "1"
    }
  },
  {
    ref: "BBI-HMC26-LNM34",
    date: "2026-06-13T14:32:00.000Z",
    formData: {
      fullName: "Bro. Leonard F. Morse",
      email: "morse.charter@sec.edu",
      phone: "(202) 555-0143",
      shippingAddress: {
        street: "45 Crescent Moon Lane",
        city: "Washington",
        state: "DC",
        zipCode: "20001"
      },
      shirtSize: "M",
      specialRequests: "Checking in to hospitality suite late on Friday afternoon. Please keep my box items secured.",
      selectedPackageId: "leonard-morse",
      addFootballTicket: false,
      addDetroitJacket: true,
      jacketSize: "M",
      jacketCrossingYear: "FALL 2011",
      jacketLineName: "DEEP HORIZON",
      jacketEntireLineName: "12 SONS OF RESOLUTION",
      jacketLineNumber: "4"
    }
  },
  {
    ref: "BBI-HMC26-CB110",
    date: "2026-06-14T09:11:00.000Z",
    formData: {
      fullName: "Bro. Charles I. Brown",
      email: "cbrown1914@undergrad.edu",
      phone: "(313) 489-3281",
      shippingAddress: {
        street: "88 University Dr, Box 44",
        city: "Detroit",
        state: "MI",
        zipCode: "48201"
      },
      shirtSize: "L",
      specialRequests: "Undergrad block tailgate pass requested, sharing table with fall 25 lines.",
      selectedPackageId: "charles-brown",
      addFootballTicket: true,
      addDetroitJacket: false,
      jacketSize: "",
      jacketCrossingYear: "",
      jacketLineName: "",
      jacketEntireLineName: "",
      jacketLineNumber: ""
    }
  },
  {
    ref: "BBI-HMC26-KST42",
    date: "2026-06-14T11:45:00.000Z",
    formData: {
      fullName: "Bro. Alain L. Locke",
      email: "alockeeditorial@howard.edu",
      phone: "(212) 332-9011",
      shippingAddress: {
        street: "245 Harlem Renaissance Way",
        city: "New York",
        state: "NY",
        zipCode: "10027"
      },
      shirtSize: "L",
      selectedPackageId: "box-items",
      specialRequests: "No meat options. Exciting to return home!",
      addFootballTicket: false,
      addDetroitJacket: true,
      jacketSize: "L",
      jacketCrossingYear: "SPR 1985",
      jacketLineName: "THE PHILOSOPHER",
      jacketEntireLineName: "3 SEALS OF INTELLIGENCE",
      jacketLineNumber: "2"
    }
  }
];

export default function AdminPortal({
  onBackToForm
}: AdminPortalProps) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPackage, setFilterPackage] = useState("all");
  const [filterJacket, setFilterJacket] = useState("all");
  const [activeSortField, setActiveSortField] = useState<"date" | "name" | "total">("date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [selectedAttendee, setSelectedAttendee] = useState<HistoryEntry | null>(null);
  const [deleteConfirmRef, setDeleteConfirmRef] = useState<string | null>(null);
  const [copiedRef, setCopiedRef] = useState<string | null>(null);
  const [copiedEmailType, setCopiedEmailType] = useState<string | null>(null);
  const [editingAttendee, setEditingAttendee] = useState<HistoryEntry | null>(null);
  const [editForm, setEditForm] = useState<OrderForm | null>(null);
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Custom Payment Form States
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("Zelle");
  const [payDate, setPayDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [payNotes, setPayNotes] = useState("");
  const [showAddPaymentForm, setShowAddPaymentForm] = useState(false);
  const [payError, setPayError] = useState("");

  // Load history with real-time Firestore sync + local fallback failsafe
  useEffect(() => {
    // 1. Immediately load any local storage registrations as a fast offline fallback placeholder
    try {
      const saved = localStorage.getItem("bbi_homecoming_2026_history");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setHistory(parsed);
        }
      }
    } catch (e) {
      console.warn("Could not load local history fallback:", e);
    }

    // 2. Establish real-time Firestore subscription as the sole source of truth
    const q = query(collection(db, "registrations"));
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const firestoreData: HistoryEntry[] = [];
      snapshot.forEach((docSnap) => {
        firestoreData.push(docSnap.data() as HistoryEntry);
      });

      // Handle the case where Firestore is empty (e.g. fresh database or all deleted)
      if (firestoreData.length === 0) {
        // Check if we need to seed initial mock data for first-time setup
        try {
          const seedMetaRef = doc(db, "metadata", "seeding_status");
          const seedMetaSnap = await getDoc(seedMetaRef);
          if (!seedMetaSnap.exists()) {
            await setDoc(seedMetaRef, { seeded: true });
            for (const entry of SEED_MOCK_DATA) {
              await setDoc(doc(db, "registrations", entry.ref), entry);
            }
            setHistory(SEED_MOCK_DATA);
            localStorage.setItem("bbi_homecoming_2026_history", JSON.stringify(SEED_MOCK_DATA));
          } else {
            // Already seeded or cleared on purpose; respect empty state
            setHistory([]);
            localStorage.setItem("bbi_homecoming_2026_history", JSON.stringify([]));
          }
        } catch (err) {
          console.error("Failed to query seeding metadata:", err);
          setHistory([]);
        }
      } else {
        // Firestore has data. It is the absolute source of truth.
        // Sort by date descending
        const sorted = firestoreData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        // Save the sorted list back to state and localStorage (to keep cache fresh)
        setHistory(sorted);
        
        // Keep selectedAttendee in real-time sync if it is currently open
        setSelectedAttendee((prevSelected) => {
          if (!prevSelected) return null;
          const freshSelected = sorted.find((x) => x.ref === prevSelected.ref);
          return freshSelected || null;
        });

        try {
          localStorage.setItem("bbi_homecoming_2026_history", JSON.stringify(sorted));
        } catch (e) {
          console.error("Failed to update localStorage history backup:", e);
        }
      }
    }, (error) => {
      console.error("Firestore onSnapshot error:", error);
    });

    return () => unsubscribe();
  }, []);

  const calculateGrandTotal = (formData: OrderForm) => {
    const selectedPackage = PACKAGE_OPTIONS.find((pkg) => pkg.id === formData.selectedPackageId);
    const base = selectedPackage?.price || 0;
    const ticket = 0; // CCU Football block tickets are RSVP-only and bought directly externally
    const jacket = formData.addDetroitJacket ? 135 : 0;
    return base + ticket + jacket;
  };

  const calculateDepositAndBalance = (formData: OrderForm) => {
    const selectedPackage = PACKAGE_OPTIONS.find((pkg) => pkg.id === formData.selectedPackageId);
    const base = selectedPackage?.price || 0;
    const jacket = formData.addDetroitJacket ? 135 : 0;
    const total = base + jacket;

    const packageDeposit = selectedPackage ? 100 : 0;
    const jacketDeposit = formData.addDetroitJacket ? 70 : 0;
    const depositDue = packageDeposit + jacketDeposit;
    const balanceDue = total - depositDue;

    return { total, depositDue, balanceDue };
  };

  const generateProfileText = (attendee: HistoryEntry) => {
    const { total } = calculateDepositAndBalance(attendee.formData);
    const pkg = PACKAGE_OPTIONS.find((p) => p.id === attendee.formData.selectedPackageId);
    const packageName = pkg ? pkg.name : "Unknown Package";
    const milestones = getPaymentMilestones(attendee.formData.selectedPackageId, attendee.formData.addDetroitJacket);

    const milestoneLines = milestones
      .map(
        (m) =>
          `  • ${m.date} Milestone: $${m.amount} (${m.amount > 0 ? "Installment Scheduled" : "Fully cleared • No installment"})`
      )
      .join("\n");

    let jacketSection = "";
    if (attendee.formData.addDetroitJacket) {
      jacketSection = `\n\n[JACKET LINE EMBROIDERY & SIZING]
  • Jacket Size: ${attendee.formData.jacketSize || "N/A"}
  • Crossing Year: ${attendee.formData.jacketCrossingYear || "N/A"}
  • Line Name: "${attendee.formData.jacketLineName || ""}"
  • Entire Line Name: "${attendee.formData.jacketEntireLineName || ""}"
  • Line Number: ${attendee.formData.jacketLineNumber || "N/A"}`;
    }

    return `Dear Brother ${attendee.formData.fullName.trim()},

We have successfully processed your registration record for BBI Homecoming 2026. Here is a copy of your verified attendee profile sheet:

--------------------------------------------------
REGISTRANT PROFILE SHEET
--------------------------------------------------
Reference ID: ${attendee.ref}
Registered On: ${new Date(attendee.date).toLocaleDateString()} at ${new Date(attendee.date).toLocaleTimeString()}

[CONTACT INFORMATION]
  • Full Name: ${attendee.formData.fullName}
  • Email: ${attendee.formData.email}
  • Phone: ${attendee.formData.phone}

[PACKAGE & TREASURY INFORMATION]
  • Selected Package: ${packageName}
  • Total Registered Cost: $${total}

[TREASURY PAYMENT MILESTONES]
${milestoneLines}

[MAILING COORDINATES]
  • Street: ${attendee.formData.shippingAddress.street}
  • City/State/Zip: ${attendee.formData.shippingAddress.city}, ${attendee.formData.shippingAddress.state} ${attendee.formData.shippingAddress.zipCode}

[CLOTHING SIZING]
  • Core Shirt Size: ${attendee.formData.shirtSize}${jacketSection}

[COMMITTEE NOTES / WISHES]
  • Special Requests: ${attendee.formData.specialRequests || "None provided"}

--------------------------------------------------
If any details need adjustment, please let us know immediately. Looking forward to welcoming you home!

Best regards,
BBI Homecoming Committee`;
  };

  const generatePaidInFullText = (attendee: HistoryEntry) => {
    const pkg = PACKAGE_OPTIONS.find((p) => p.id === attendee.formData.selectedPackageId);
    const packageName = pkg ? pkg.name : "Unknown Package";
    const grandTotal = calculateGrandTotal(attendee.formData);
    const shirtSize = attendee.formData.shirtSize;
    let jacketSection = "";
    if (attendee.formData.addDetroitJacket) {
      jacketSection = `\n  • Custom Detroit Jacket: Size ${attendee.formData.jacketSize} (Line Name: "${attendee.formData.jacketLineName}", Line #: ${attendee.formData.jacketLineNumber})`;
    }

    return `Dear Brother ${attendee.formData.fullName.trim()},

This is a receipt confirming that your registration for the BBI Homecoming Reunion 2026 is officially PAID IN FULL!

We have updated your ledger and your balance is $0.00. Thank you for your prompt payments and support.

[YOUR REGISTRATION DETAILS]
  • Reference ID: ${attendee.ref}
  • Selected Package: ${packageName}
  • T-Shirt Size: ${shirtSize}${jacketSection}
  • Total Paid: $${grandTotal.toLocaleString()}
  • Balance Remaining: $0.00

Thank you for your active participation. We look forward to welcoming you home to Detroit!

Best regards,
BBI Homecoming Committee`;
  };

  const generateBalanceDueText = (attendee: HistoryEntry) => {
    const pkg = PACKAGE_OPTIONS.find((p) => p.id === attendee.formData.selectedPackageId);
    const packageName = pkg ? pkg.name : "Unknown Package";
    const grandTotal = calculateGrandTotal(attendee.formData);
    const { totalPaid, balanceDue, transactions } = getAttendeePaymentStats(attendee);
    const milestones = getPaymentMilestones(attendee.formData.selectedPackageId, attendee.formData.addDetroitJacket);

    const paymentListText = transactions.length > 0 
      ? transactions.map(tx => `  • $${tx.amount.toLocaleString()} paid on ${new Date(tx.date).toLocaleDateString()} via ${tx.method} (${tx.notes || "Partial Payment"})`).join("\n")
      : "  • No payments recorded yet.";

    const milestonesScheduleText = milestones.map(m => {
      const hasMilestoneTx = transactions.some(tx => tx.notes === `${m.date} Milestone`);
      return `  • ${m.date}: $${m.amount.toLocaleString()} - ${hasMilestoneTx ? "PAID" : "DUE"}`;
    }).join("\n");

    return `Dear Brother ${attendee.formData.fullName.trim()},

This is a payment update regarding your registration for the BBI Homecoming Reunion 2026. 

You have a remaining balance of $${balanceDue.toLocaleString()} on your registration. Below is a detailed breakdown of your payments to-date and the milestone installment schedule:

[YOUR REGISTRATION DETAILS]
  • Reference ID: ${attendee.ref}
  • Selected Package: ${packageName}
  • Total Registration Cost: $${grandTotal.toLocaleString()}

[PAYMENTS RECORDED TO-DATE]
${paymentListText}
  • Total Amount Paid: $${totalPaid.toLocaleString()}
  • Current Balance Due: $${balanceDue.toLocaleString()}

[REMAINING MILESTONE SCHEDULE]
${milestonesScheduleText}

Please ensure payments are sent via Zelle to bbihomecoming@gmail.com (or your preferred payment method in coordination with the committee). 

If you have any questions, please reply to this email. We look forward to welcoming you home to Detroit!

Best regards,
BBI Homecoming Committee`;
  };

  const handleCopyEmailText = (attendee: HistoryEntry, type: "paid_in_full" | "balance_due") => {
    const text = type === "paid_in_full" ? generatePaidInFullText(attendee) : generateBalanceDueText(attendee);
    navigator.clipboard.writeText(text).then(() => {
      setCopiedEmailType(type);
      setTimeout(() => setCopiedEmailType(null), 3000);
    }).catch((err) => {
      console.error("Failed to copy email body text:", err);
    });
  };

  const handleCopyProfileText = (attendee: HistoryEntry) => {
    const text = generateProfileText(attendee);
    navigator.clipboard.writeText(text).then(() => {
      setCopiedRef(attendee.ref);
      setTimeout(() => setCopiedRef(null), 3000);
    }).catch((err) => {
      console.error("Failed to copy profile sheet text:", err);
    });
  };

  // Delete handler
  const handleDeleteEntry = (ref: string) => {
    setDeleteConfirmRef(ref);
  };

  // Edit handlers
  const handleStartEdit = (attendee: HistoryEntry) => {
    setEditingAttendee(attendee);
    setEditForm({ ...attendee.formData });
    setEditErrors({});
  };

  const handleSaveEdit = async () => {
    if (!editingAttendee || !editForm) return;

    // Validate
    const errors: Record<string, string> = {};
    if (!editForm.fullName.trim()) errors.fullName = "Full Name is required";
    if (!editForm.email.trim()) errors.email = "Email is required";
    if (!editForm.phone.trim()) errors.phone = "Phone is required";
    if (!editForm.shirtSize) errors.shirtSize = "Shirt size is required";

    if (!editForm.shippingAddress.street.trim()) errors.street = "Street address is required";
    if (!editForm.shippingAddress.city.trim()) errors.city = "City is required";
    if (!editForm.shippingAddress.state.trim()) errors.state = "State is required";
    if (!editForm.shippingAddress.zipCode.trim()) errors.zipCode = "ZIP Code is required";

    if (editForm.addDetroitJacket) {
      if (!editForm.jacketSize) errors.jacketSize = "Jacket size is required";
      if (!editForm.jacketCrossingYear.trim()) errors.jacketCrossingYear = "Crossing year is required";
      if (!editForm.jacketLineName.trim()) errors.jacketLineName = "Line name is required";
      if (!editForm.jacketEntireLineName.trim()) errors.jacketEntireLineName = "Entire line name is required";
      if (!editForm.jacketLineNumber.trim()) errors.jacketLineNumber = "Line number is required";
    }

    if (Object.keys(errors).length > 0) {
      setEditErrors(errors);
      return;
    }

    setIsSavingEdit(true);
    try {
      const updatedEntry: HistoryEntry = {
        ...editingAttendee,
        formData: editForm
      };

      // 1. Save to Firestore
      await setDoc(doc(db, "registrations", editingAttendee.ref), updatedEntry);

      // 2. Local fallback sync
      try {
        const saved = localStorage.getItem("bbi_homecoming_2026_history");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            const index = parsed.findIndex((x) => x.ref === editingAttendee.ref);
            if (index !== -1) {
              parsed[index] = updatedEntry;
              localStorage.setItem("bbi_homecoming_2026_history", JSON.stringify(parsed));
            }
          }
        }
      } catch (err) {
        console.warn("Local storage fallback save failed:", err);
      }

      // 3. Update active selections
      if (selectedAttendee && selectedAttendee.ref === editingAttendee.ref) {
        setSelectedAttendee(updatedEntry);
      }

      setEditingAttendee(null);
      setEditForm(null);
    } catch (error) {
      console.error("Failed to update registration in Firestore:", error);
      handleFirestoreError(error, OperationType.WRITE, `registrations/${editingAttendee.ref}`);
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Record milestone payment event handler
  const handleToggleMilestone = async (attendee: HistoryEntry, milestoneDate: string, isPaid: boolean, method: string = "Zelle") => {
    try {
      const currentTxs = getAttendeeTransactions(attendee);
      let updatedTxs: PaymentTransaction[] = [];

      if (isPaid) {
        // Find if this milestone is already recorded in the ledger
        const alreadyHasMilestone = currentTxs.some(tx => tx.notes === `${milestoneDate} Milestone`);
        if (!alreadyHasMilestone) {
          const milestoneAmount = getPaymentMilestones(attendee.formData.selectedPackageId, attendee.formData.addDetroitJacket)
            .find(m => m.date === milestoneDate)?.amount || 0;
          
          const newTx: PaymentTransaction = {
            id: `tx-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            amount: milestoneAmount,
            date: new Date().toISOString().split('T')[0],
            method: method,
            notes: `${milestoneDate} Milestone`
          };
          updatedTxs = [...currentTxs, newTx];
        } else {
          updatedTxs = [...currentTxs];
        }
      } else {
        // Remove the transaction(s) matching this milestone note
        updatedTxs = currentTxs.filter(tx => tx.notes !== `${milestoneDate} Milestone`);
      }

      const updatedEntry: HistoryEntry = {
        ...attendee,
        paymentTransactions: updatedTxs,
        payments: {} // Wipe legacy payments dictionary to keep ledger consistent
      };

      // Save to Firestore
      await setDoc(doc(db, "registrations", attendee.ref), updatedEntry);

      // Save to Local Fallback Sync
      try {
        const saved = localStorage.getItem("bbi_homecoming_2026_history");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            const index = parsed.findIndex((x) => x.ref === attendee.ref);
            if (index !== -1) {
              parsed[index] = updatedEntry;
              localStorage.setItem("bbi_homecoming_2026_history", JSON.stringify(parsed));
            }
          }
        }
      } catch (err) {
        console.warn("Local storage fallback save failed on payment toggle:", err);
      }

      // Update active selected attendee view
      if (selectedAttendee && selectedAttendee.ref === attendee.ref) {
        setSelectedAttendee(updatedEntry);
      }
    } catch (error) {
      console.error("Failed to update payment milestone in Firestore:", error);
      handleFirestoreError(error, OperationType.WRITE, `registrations/${attendee.ref}`);
    }
  };

  // Add a custom payment transaction to the ledger
  const handleAddTransaction = async (attendee: HistoryEntry, amount: number, date: string, method: string, notes: string = "") => {
    try {
      const currentTxs = getAttendeeTransactions(attendee);
      
      const newTx: PaymentTransaction = {
        id: `tx-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        amount: Number(amount) || 0,
        date: date || new Date().toISOString().split('T')[0],
        method: method || "Zelle",
        notes: notes.trim()
      };

      const updatedTxs = [...currentTxs, newTx];

      const updatedEntry: HistoryEntry = {
        ...attendee,
        paymentTransactions: updatedTxs,
        payments: {} // Wipe legacy payments dictionary
      };

      // Save to Firestore
      await setDoc(doc(db, "registrations", attendee.ref), updatedEntry);

      // Save to Local Fallback Sync
      try {
        const saved = localStorage.getItem("bbi_homecoming_2026_history");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            const index = parsed.findIndex((x) => x.ref === attendee.ref);
            if (index !== -1) {
              parsed[index] = updatedEntry;
              localStorage.setItem("bbi_homecoming_2026_history", JSON.stringify(parsed));
            }
          }
        }
      } catch (err) {
        console.warn("Local storage fallback save failed on add transaction:", err);
      }

      // Update active selected attendee view
      if (selectedAttendee && selectedAttendee.ref === attendee.ref) {
        setSelectedAttendee(updatedEntry);
      }
    } catch (error) {
      console.error("Failed to add payment transaction in Firestore:", error);
      handleFirestoreError(error, OperationType.WRITE, `registrations/${attendee.ref}`);
    }
  };

  // Delete a payment transaction from the ledger
  const handleDeleteTransaction = async (attendee: HistoryEntry, txId: string) => {
    try {
      const currentTxs = getAttendeeTransactions(attendee);
      const updatedTxs = currentTxs.filter((tx) => tx.id !== txId);

      const updatedEntry: HistoryEntry = {
        ...attendee,
        paymentTransactions: updatedTxs,
        payments: {} // Wipe legacy payments dictionary
      };

      // Save to Firestore
      await setDoc(doc(db, "registrations", attendee.ref), updatedEntry);

      // Save to Local Fallback Sync
      try {
        const saved = localStorage.getItem("bbi_homecoming_2026_history");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            const index = parsed.findIndex((x) => x.ref === attendee.ref);
            if (index !== -1) {
              parsed[index] = updatedEntry;
              localStorage.setItem("bbi_homecoming_2026_history", JSON.stringify(parsed));
            }
          }
        }
      } catch (err) {
        console.warn("Local storage fallback save failed on delete transaction:", err);
      }

      // Update active selected attendee view
      if (selectedAttendee && selectedAttendee.ref === attendee.ref) {
        setSelectedAttendee(updatedEntry);
      }
    } catch (error) {
      console.error("Failed to delete payment transaction in Firestore:", error);
      handleFirestoreError(error, OperationType.WRITE, `registrations/${attendee.ref}`);
    }
  };

  // CSV Spreadsheet Excel compilation download routine
  const handleExportCSV = () => {
    const headers = [
      "Reference Code",
      "Submission Date",
      "Full Name",
      "Email Address",
      "Phone Number",
      "Street Address",
      "City",
      "State",
      "ZIP Code",
      "T-Shirt Size",
      "Homecoming Package Package",
      "Base Category Price ($)",
      "CCU Football Game RSVP",
      "Optional Addon: Carhartt Style Jacket ($135)",
      "Custom Jacket Size",
      "Custom Jacket Crossing Year",
      "Custom Jacket Line Name",
      "Custom Jacket Entire Line Name",
      "Custom Jacket Line Number",
      "Required Initial Deposit ($)",
      "Grand Checkout Total ($)",
      "Special Requests & Allocations"
    ];

    const rows = history.map((item) => {
      const pkg = PACKAGE_OPTIONS.find((p) => p.id === item.formData.selectedPackageId);
      const basePrice = pkg?.price || 0;
      const total = calculateGrandTotal(item.formData);

      // Deposit calculations
      const packageDeposit = pkg ? 100 : 0;
      const jacketDeposit = item.formData.addDetroitJacket ? 70 : 0;
      const initialDeposit = packageDeposit + jacketDeposit;

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
        pkg?.name || "None Selected",
        basePrice,
        item.formData.addFootballTicket ? "YES (Buy Direct $37-$57)" : "NO RSVP",
        item.formData.addDetroitJacket ? "YES ($135)" : "NO ($0)",
        item.formData.jacketSize || "N/A",
        item.formData.jacketCrossingYear || "N/A",
        item.formData.jacketLineName || "N/A",
        item.formData.jacketEntireLineName || "N/A",
        item.formData.jacketLineNumber || "N/A",
        initialDeposit,
        total,
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
    link.setAttribute("download", "BBI_Chapter_Homecoming_2026_Registrations.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Clean printable report compiled in a new window/tab safely or triggered inline
  const handlePrintReport = () => {
    window.print();
  };

  // Sort toggle routine
  const toggleSort = (field: "date" | "name" | "total") => {
    if (activeSortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setActiveSortField(field);
      setSortDirection("desc");
    }
  };

  const getAttendeeTransactions = (item: HistoryEntry): PaymentTransaction[] => {
    const txs: PaymentTransaction[] = [];
    if (item.paymentTransactions && Array.isArray(item.paymentTransactions)) {
      txs.push(...item.paymentTransactions);
    } else {
      // Create transactions from legacy milestone payments on-the-fly
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
  };

  // Payment calculations per attendee helper
  const getAttendeePaymentStats = (item: HistoryEntry) => {
    const txs = getAttendeeTransactions(item);
    const grandTotal = calculateGrandTotal(item.formData);
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
      const packageDeposit = selectedPackage ? 100 : 0;
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
    
    return { totalPaid, balanceDue, statusLabel, statusColor, transactions: txs };
  };

  // Statistics summaries calculations
  const totalEntries = history.length;
  const totalRevenue = history.reduce((sum, item) => sum + calculateGrandTotal(item.formData), 0);
  const totalPaidOverall = history.reduce((sum, item) => sum + getAttendeePaymentStats(item).totalPaid, 0);
  const totalOutstandingBalanceOverall = totalRevenue - totalPaidOverall;
  const totalJacketOrders = history.filter((x) => x.formData.addDetroitJacket).length;
  const totalTicketsSold = history.filter((x) => x.formData.addFootballTicket).length;

  // Search and Filter records pipeline
  const processedRecords = history
    .filter((item) => {
      const matchSearch = 
        item.formData.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.formData.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.ref.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchPackage = filterPackage === "all" || item.formData.selectedPackageId === filterPackage;
      const matchJacket = 
        filterJacket === "all" || 
        (filterJacket === "yes" && item.formData.addDetroitJacket) || 
        (filterJacket === "no" && !item.formData.addDetroitJacket);

      return matchSearch && matchPackage && matchJacket;
    })
    .sort((a, b) => {
      let comparison = 0;
      if (activeSortField === "date") {
        comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
      } else if (activeSortField === "name") {
        comparison = a.formData.fullName.localeCompare(b.formData.fullName);
      } else if (activeSortField === "total") {
        comparison = calculateGrandTotal(a.formData) - calculateGrandTotal(b.formData);
      }
      return sortDirection === "asc" ? comparison : -comparison;
    });

  return (
    <div className="space-y-6" id="admin-portal-layer">
      {/* 1. Portal Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-gray-200 pb-5" id="admin-header">
        <div className="space-y-2">
          <button
            onClick={onBackToForm}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-bold text-gray-600 hover:text-brand-blue hover:border-brand-blue/30 cursor-pointer transition-all shadow-2xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" strokeWidth={2.5} /> Back to Order Form
          </button>
          <div className="pt-1">
            <h2 className="font-display text-2.5xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Users className="w-7 h-7 text-brand-blue" />
              Admin Dashboard
            </h2>
            <p className="text-xs text-gray-500 font-medium">
              Beta Beta Iota Chapter • Administrator Portal for Homecoming 2026 Packet Intake
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:self-center">
          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-gray-300 bg-white text-gray-700 font-bold text-xs shadow-xs hover:bg-gray-50 cursor-pointer transition-all"
          >
            <Download className="w-3.5 h-3.5 text-gray-500" /> Excel Spreadsheet (.CSV)
          </button>
          <button
            type="button"
            onClick={handlePrintReport}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-brand-blue text-white font-bold text-xs shadow-md hover:bg-brand-blue-dark cursor-pointer transition-all"
          >
            <Printer className="w-3.5 h-3.5" /> Printable Report (PDF)
          </button>
        </div>
      </div>



      {/* 2. Interactive Analytical Summary Cards - Upgraded Bento Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5" id="stats-dashboard">
        {/* Card 1: Treasury & Financials Hub */}
        <div className="lg:col-span-7 md:col-span-12 bg-slate-950 border border-slate-850 p-6 rounded-2xl flex flex-col justify-between shadow-xs relative overflow-hidden text-white">
          <div className="absolute top-0 right-0 w-48 h-48 bg-brand-blue/5 rounded-full translate-x-10 -translate-y-10 filter blur-2xl pointer-events-none" />
          
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-900 pb-3">
              <div className="flex items-center gap-2">
                <span className="flex p-1.5 bg-slate-900 border border-slate-800 rounded-md text-brand-blue">
                  <CreditCard className="w-4 h-4" />
                </span>
                <div>
                  <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider block">Treasury Summary</span>
                  <span className="text-[9px] font-mono text-slate-500 block">Beta Beta Iota Chapter</span>
                </div>
              </div>
              <span className="text-[9px] bg-slate-900 text-brand-blue-light border border-slate-800 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                Financial Hub
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
              <div className="sm:col-span-5 space-y-1">
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Total Projected</span>
                <span className="font-mono text-3.5xl font-black text-white leading-tight block">
                  ${totalRevenue.toLocaleString()}
                </span>
                <span className="text-[9.5px] text-slate-500 font-medium block">Grand checkout forecast</span>
              </div>

              {/* Vertical line divider */}
              <div className="hidden sm:block sm:col-span-1 border-l border-slate-800 h-12 justify-self-center" />

              <div className="sm:col-span-6 space-y-3">
                {/* Payments Collected segment */}
                <div className="flex items-center justify-between text-xs">
                  <div className="space-y-0.5">
                    <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider block">Treasury Payments Collected</span>
                    <span className="font-mono text-base font-extrabold text-brand-blue-light">${totalPaidOverall.toLocaleString()}</span>
                  </div>
                </div>

                {/* Outstanding Balance segment */}
                <div className="flex items-center justify-between text-xs">
                  <div className="space-y-0.5">
                    <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider block">Outstanding Balance Owed</span>
                    <span className="font-mono text-base font-extrabold text-amber-500">${totalOutstandingBalanceOverall.toLocaleString()}</span>
                  </div>
                  {totalOutstandingBalanceOverall > 0 && (
                    <span className="inline-flex items-center gap-1 text-[9px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider">
                      ⏰ Remainder
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Simple Ratio progress bar */}
          <div className="mt-5 space-y-1.5">
            <div className="flex justify-between items-center text-[9px] text-slate-400 font-semibold uppercase tracking-wider">
              <span>Collection Progress Ratio</span>
              <span>
                {totalRevenue > 0 ? Math.round((totalPaidOverall / totalRevenue) * 100) : 0}% Collected
              </span>
            </div>
            <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden flex border border-slate-800">
              <div 
                className="bg-brand-blue-light h-full rounded-full" 
                style={{ width: `${totalRevenue > 0 ? (totalPaidOverall / totalRevenue) * 100 : 0}%` }}
              />
              <div 
                className="bg-amber-50 h-full rounded-full" 
                style={{ width: `${totalRevenue > 0 ? (totalOutstandingBalanceOverall / totalRevenue) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>

        {/* Card 2: Intake Submission Registry */}
        <div className="lg:col-span-5 md:col-span-12 bg-white border border-gray-200 p-6 rounded-2xl flex flex-col justify-between shadow-2xs relative overflow-hidden">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="flex p-1.5 bg-blue-50 border border-blue-105 text-brand-blue rounded-md">
                  <Users className="w-4 h-4" />
                </span>
                <div>
                  <span className="text-[10px] uppercase font-black text-gray-400 tracking-wider block">Intake Submissions</span>
                  <span className="text-[9px] text-slate-400 font-semibold block font-sans">Registered brothers online</span>
                </div>
              </div>
              <div className="inline-flex items-center gap-1 text-[9px] bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Live Sync</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <span className="text-[9px] text-gray-450 uppercase font-black tracking-wider block">Registered Count</span>
                <span className="font-mono text-3.5xl font-black text-slate-900 block">{totalEntries}</span>
                <span className="text-[10px] text-slate-405 font-bold block">Grand cohort size</span>
              </div>
              <div className="space-y-1 border-l border-gray-100 pl-4">
                <span className="text-[9px] text-gray-450 uppercase font-black tracking-wider block">Avg Ticket Cost</span>
                <span className="font-mono text-3.5xl font-black text-slate-800 block">
                  ${totalEntries > 0 ? Math.round(totalRevenue / totalEntries) : 0}
                </span>
                <span className="text-[10px] text-slate-405 font-bold block">Value per brother</span>
              </div>
            </div>
          </div>

          <p className="text-[10px] text-gray-500 font-semibold mt-5 flex items-center justify-center gap-1.5 bg-slate-50 p-2 border border-gray-100 rounded-lg text-center leading-normal">
            <Sparkles className="w-3.5 h-3.5 text-yellow-500" />
            <span>Fully active saved and validated database registry</span>
          </p>
        </div>

        {/* Card 3: Custom Chapter Apparel Ordered */}
        <div className="lg:col-span-6 md:col-span-6 bg-gradient-to-tr from-indigo-50/50 to-purple-50/20 border border-indigo-100 p-6 rounded-2xl flex flex-col justify-between shadow-xs relative overflow-hidden">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-indigo-100/60 pb-3">
              <div className="flex items-center gap-2">
                <span className="flex p-1.5 bg-indigo-100/60 border border-indigo-150 text-indigo-700 rounded-md">
                  <ShoppingBag className="w-4 h-4" />
                </span>
                <div>
                  <span className="text-[10px] uppercase font-black text-indigo-800 tracking-wider block">Custom Jackets</span>
                  <span className="text-[9px] text-indigo-500 font-bold block">Carhartt Style Custom Line Wear</span>
                </div>
              </div>
              <span className="text-[9px] bg-indigo-100 text-indigo-700 border border-indigo-155 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                Apparel Desk
              </span>
            </div>

            <div className="flex items-baseline gap-2">
              <span className="font-mono text-4xl font-black text-indigo-900 leading-none">{totalJacketOrders}</span>
              <span className="text-xs font-black text-indigo-550 uppercase">Carhartt Jacket Orders</span>
            </div>

            <p className="text-[10.5px] text-indigo-700 font-bold leading-relaxed">
              👉 {Math.round((totalJacketOrders / (totalEntries || 1)) * 100)}% of registered brothers ordered a customizable Heavyweight Chapter jacket!
            </p>
          </div>

          <div className="mt-5 pt-3.5 border-t border-indigo-100/60 text-[10px] text-indigo-500 font-bold flex items-center justify-between">
            <span>Size selections recorded in spreadsheet</span>
            <span className="bg-indigo-100/50 text-indigo-700 px-1.5 py-0.5 rounded-sm font-mono font-semibold">$135 Unit Cost</span>
          </div>
        </div>

        {/* Card 4: Game RSVP & Attendance Block */}
        <div className="lg:col-span-6 md:col-span-6 bg-gradient-to-tr from-amber-50/50 to-orange-50/20 border border-amber-200 p-6 rounded-2xl flex flex-col justify-between shadow-xs relative overflow-hidden">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-amber-100/65 pb-3">
              <div className="flex items-center gap-2">
                <span className="flex p-1.5 bg-amber-100 border border-amber-155 text-amber-700 rounded-md">
                  <Ticket className="w-4 h-4" />
                </span>
                <div>
                  <span className="text-[10px] uppercase font-black text-amber-800 tracking-wider block">Stadium Block RSVPs</span>
                  <span className="text-[9px] text-amber-600 font-bold block">Coastal Carolina Football Tickets</span>
                </div>
              </div>
              <span className="text-[9px] bg-amber-100 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                Stadium RSVPs
              </span>
            </div>

            <div className="flex items-baseline gap-2">
              <span className="font-mono text-4xl font-black text-amber-700 leading-none">{totalTicketsSold}</span>
              <span className="text-xs font-black text-amber-800 uppercase">Game Tickets</span>
            </div>

            <p className="text-[10.5px] text-amber-800/80 font-bold leading-relaxed">
              🏟️ Brothers purchase their own stadium tickets with full choice and flexibility to sit wherever they prefer!
            </p>
          </div>

          <div className="mt-4 pt-3.5 border-t border-amber-100/60 text-[10px] text-amber-600 font-mono font-semibold flex items-center justify-between">
            <span>External checkout references logged</span>
            <span className="bg-amber-100/50 text-amber-700 px-1.5 py-0.5 rounded-sm font-sans font-bold uppercase text-[9px]">Stadium Section</span>
          </div>
        </div>
      </div>

      {/* 3. Search and Multi-Filter Controls */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-2xs space-y-3" id="filters-panel">
        <div className="font-display font-bold text-gray-950 text-xs uppercase tracking-wider flex items-center gap-1.5 border-b border-gray-100 pb-2">
          <Filter className="w-4 h-4 text-gray-400" />
          Filter & Search Intakes
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Text Query */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search by Name, Email, or reference code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-3 py-2 text-xs block w-full rounded-lg border border-gray-300 text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-brand-blue/20"
            />
            <Search className="w-4 h-4 text-gray-400 absolute top-2.5 left-3" />
          </div>

          {/* Chosen Package */}
          <select
            value={filterPackage}
            onChange={(e) => setFilterPackage(e.target.value)}
            className="py-2 px-3 text-xs block w-full rounded-lg border border-gray-300 text-gray-900 focus:outline-hidden"
          >
            <option value="all">All Packages</option>
            {PACKAGE_OPTIONS.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.name} (${opt.price})
              </option>
            ))}
          </select>

          {/* Bought Jacket */}
          <select
            value={filterJacket}
            onChange={(e) => setFilterJacket(e.target.value)}
            className="py-2 px-3 text-xs block w-full rounded-lg border border-gray-300 text-gray-900 focus:outline-hidden"
          >
            <option value="all">Select Varsity Jacket add-on (All)</option>
            <option value="yes">Jacket Purchased Only</option>
            <option value="no">No Jacket Purchase</option>
          </select>
        </div>
      </div>

      {/* 4. Active Member Register List (Expanded full-width!) */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden" id="active-register-table-container">
        <div className="border-b border-gray-150 p-4 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <span className="text-xs font-black text-slate-800 uppercase tracking-widest block">
              Active Member Register
            </span>
            <p className="text-[10px] text-gray-400 font-semibold">
              Found {processedRecords.length} registrants • Click a member to slide over detailed embroidery, sizing & address sheets.
            </p>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-gray-400 font-bold bg-white border border-gray-200 p-1.5 px-3 rounded-lg flex-shrink-0 self-start sm:self-auto shadow-3xs">
            <span>Sort By:</span>
            <button onClick={() => toggleSort("date")} className={`hover:underline cursor-pointer flex items-center gap-0.5 ${activeSortField === "date" ? "text-brand-blue" : ""}`}>
              Date {activeSortField === "date" && (sortDirection === "asc" ? "▲" : "▼")}
            </button>
            <span className="text-gray-300">|</span>
            <button onClick={() => toggleSort("name")} className={`hover:underline cursor-pointer flex items-center gap-0.5 ${activeSortField === "name" ? "text-brand-blue" : ""}`}>
              Name {activeSortField === "name" && (sortDirection === "asc" ? "▲" : "▼")}
            </button>
            <span className="text-gray-300">|</span>
            <button onClick={() => toggleSort("total")} className={`hover:underline cursor-pointer flex items-center gap-0.5 ${activeSortField === "total" ? "text-brand-blue" : ""}`}>
              Total {activeSortField === "total" && (sortDirection === "asc" ? "▲" : "▼")}
            </button>
          </div>
        </div>

        <div className="overflow-x-auto font-sans">
          {processedRecords.length > 0 ? (
            <table className="min-w-full divide-y divide-gray-200 text-xs">
              <thead>
                <tr className="bg-slate-50 text-gray-500 uppercase font-bold tracking-wider text-[10px] border-b border-gray-200">
                  <th className="px-6 py-3.5 text-left">Member Name</th>
                  <th className="px-6 py-3.5 text-left hidden sm:table-cell">Reg Category</th>
                  <th className="px-6 py-3.5 text-center">Add-Ons</th>
                  <th className="px-6 py-3.5 text-center">Payment Status</th>
                  <th className="px-6 py-3.5 text-right">Sum Owed</th>
                  <th className="px-6 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {processedRecords.map((item) => {
                  const pkg = PACKAGE_OPTIONS.find((p) => p.id === item.formData.selectedPackageId);
                  const isJacket = item.formData.addDetroitJacket;
                  const isTicket = item.formData.addFootballTicket;
                  const total = calculateGrandTotal(item.formData);

                  return (
                    <tr 
                      key={item.ref}
                      className={`hover:bg-blue-50/45 cursor-pointer transition-colors ${
                        selectedAttendee?.ref === item.ref ? "bg-slate-50 font-medium" : ""
                      }`}
                      onClick={() => setSelectedAttendee(item)}
                    >
                      {/* Member Name details */}
                      <td className="px-6 py-4">
                        <p className="font-extrabold text-slate-900 text-[13px]">{item.formData.fullName}</p>
                        <span className="inline-flex items-center gap-1 text-[9.5px] font-mono text-gray-550 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded-sm mt-1 uppercase font-bold">
                          🔑 {item.ref}
                        </span>
                      </td>

                      {/* Reg Package type */}
                      <td className="px-6 py-4 hidden sm:table-cell">
                        <p className="font-bold text-slate-800 text-[12px]">{pkg?.name || "None Chosen"}</p>
                        <p className="text-[10px] text-gray-400 font-bold mt-0.5">{item.formData.shirtSize ? `Size ${item.formData.shirtSize} T-Shirt` : ""}</p>
                      </td>

                      {/* Add-on badges */}
                      <td className="px-6 py-4 text-center">
                        <div className="inline-flex flex-wrap gap-1 items-center justify-center">
                          {isTicket && (
                            <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-[9px] font-black uppercase px-2 py-0.5 rounded-sm flex items-center gap-0.5" title="Football ticket purchased">
                              <Ticket className="w-2.5 h-2.5 text-emerald-600" /> Ticket
                            </span>
                          )}
                          {isJacket && (
                            <span className="bg-indigo-50 text-indigo-800 border border-indigo-200 text-[9px] font-black uppercase px-2 py-0.5 rounded-sm flex items-center gap-0.5" title="Carhartt Style Jacket purchased">
                              <ShoppingBag className="w-2.5 h-2.5 text-indigo-600" /> Jacket ({item.formData.jacketSize})
                            </span>
                          )}
                          {!isTicket && !isJacket && (
                            <span className="text-[9.5px] text-gray-350 font-bold bg-slate-50 border border-slate-150 px-2 py-0.5 rounded-xs">No Addons</span>
                          )}
                        </div>
                      </td>

                      {/* Payment Status column */}
                      <td className="px-6 py-4 text-center">
                        {(() => {
                          const { totalPaid, statusLabel, statusColor } = getAttendeePaymentStats(item);
                          return (
                            <div className="inline-flex flex-col items-center">
                              <span className={`inline-flex items-center gap-1.5 text-[9.5px] font-black uppercase px-2 py-0.5 rounded-full border ${statusColor}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${
                                  statusLabel === "Paid in Full" ? "bg-emerald-500" :
                                  statusLabel === "Deposit Paid" ? "bg-blue-500" :
                                  statusLabel === "Partially Paid" ? "bg-amber-500" : "bg-red-500"
                                }`} />
                                {statusLabel}
                              </span>
                              <span className="text-[9.5px] text-slate-500 font-mono font-bold mt-1 tracking-tight">
                                ${totalPaid.toLocaleString()} / ${total.toLocaleString()}
                              </span>
                            </div>
                          );
                        })()}
                      </td>

                      {/* SUM total */}
                      <td className="px-6 py-4 text-right font-mono">
                        <p className="font-black text-slate-950 text-[13.5px]">${total}</p>
                        {(() => {
                          const { depositDue, balanceDue } = calculateDepositAndBalance(item.formData);
                          return (
                            <div className="flex items-center justify-end gap-1.5 text-[9.5px] font-sans font-extrabold mt-1 tracking-tight">
                              <span className="text-brand-blue" title="Required deposit due July 19">7/19: ${depositDue}</span>
                              <span className="text-gray-300">|</span>
                              <span className="text-amber-700" title="Remaining balance due September 4">9/4: ${balanceDue}</span>
                            </div>
                          );
                        })()}
                      </td>

                      {/* Action parameters */}
                      <td className="px-6 py-4 text-right space-x-2 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => setSelectedAttendee(item)}
                          className="px-2.5 py-1.5 rounded-lg bg-brand-blue hover:bg-brand-blue-dark text-white font-extrabold text-[10.5px] cursor-pointer shadow-xs transition-all"
                        >
                          View Profile
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStartEdit(item)}
                          className="p-1.5 rounded-lg hover:bg-slate-100 text-gray-500 hover:text-brand-blue cursor-pointer transition-colors inline-flex items-center justify-center align-middle border border-transparent hover:border-slate-200"
                          title="Edit details"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteEntry(item.ref)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 cursor-pointer transition-colors inline-flex items-center justify-center align-middle border border-transparent hover:border-red-100"
                          title="Delete entry"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-14 px-4">
              <Layers className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-xs font-semibold text-gray-500">No registered intakes match the active filter criteria.</p>
              <button
                onClick={() => {
                  setSearchTerm("");
                  setFilterPackage("all");
                  setFilterJacket("all");
                }}
                className="mt-2 text-xs font-bold text-brand-blue hover:underline cursor-pointer"
              >
                Clear active filters
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Slide-over Profile Detail Sheet (Opens from the right to allow the list to be fully expanded) */}
      {selectedAttendee && (() => {
        const subject = `BBI Homecoming 2026: Registrant Profile Sheet (${selectedAttendee.formData.fullName})`;
        const emailBody = generateProfileText(selectedAttendee);
        const recipientEmail = selectedAttendee.formData.email;

        const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(recipientEmail)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(emailBody)}`;
        const mailtoUrl = `mailto:${encodeURIComponent(recipientEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(emailBody)}`;

        // Paid in Full Receipt Email
        const pifSubject = `BBI Homecoming 2026: Paid In Full Receipt (${selectedAttendee.formData.fullName})`;
        const pifBody = generatePaidInFullText(selectedAttendee);
        const pifGmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(recipientEmail)}&su=${encodeURIComponent(pifSubject)}&body=${encodeURIComponent(pifBody)}`;
        const pifMailtoUrl = `mailto:${encodeURIComponent(recipientEmail)}?subject=${encodeURIComponent(pifSubject)}&body=${encodeURIComponent(pifBody)}`;

        // Balance & Due Dates Reminder Email
        const balSubject = `BBI Homecoming 2026: Remaining Balance & Milestone Update (${selectedAttendee.formData.fullName})`;
        const balBody = generateBalanceDueText(selectedAttendee);
        const balGmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(recipientEmail)}&su=${encodeURIComponent(balSubject)}&body=${encodeURIComponent(balBody)}`;
        const balMailtoUrl = `mailto:${encodeURIComponent(recipientEmail)}?subject=${encodeURIComponent(balSubject)}&body=${encodeURIComponent(balBody)}`;

        return (
          <div className="fixed inset-0 z-55 overflow-hidden" aria-labelledby="slide-over-title" role="dialog" aria-modal="true" id="registrant-slideover-container">
            <div className="absolute inset-0 overflow-hidden">
              {/* Dark back-blur panel overlay */}
              <div 
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity duration-300 animate-in fade-in" 
                onClick={() => setSelectedAttendee(null)}
                aria-hidden="true"
              />

              <div className="fixed inset-y-0 right-0 pl-10 max-w-full flex">
                <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col border-l border-slate-250 animate-in slide-in-from-right duration-300 ease-out" id="registrant-detail-sidebar">
                  
                  {/* Header Panel */}
                  <div className="bg-slate-950 font-display font-black text-xs uppercase tracking-widest text-brand-blue-light p-4.5 flex items-center justify-between border-b border-slate-850">
                    <div className="flex items-center gap-2">
                      <span className="bg-brand-blue text-white px-2.5 py-0.5 rounded-sm font-mono text-[10px] tracking-wide">
                        {selectedAttendee.ref}
                      </span>
                      <span>Registrant Profile Detail</span>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => setSelectedAttendee(null)}
                      className="text-slate-450 hover:text-white transition-colors cursor-pointer p-1.5 rounded-lg hover:bg-slate-800 flex items-center justify-center border border-transparent hover:border-slate-700"
                      title="Close Details Overview"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Content body panel */}
                  <div className="flex-1 overflow-y-auto p-5 space-y-6 text-xs text-gray-700 font-sans">
                    {/* Full Header Name */}
                    <div className="space-y-1.5">
                      <h4 className="font-display font-black text-gray-950 text-lg leading-snug">
                        {selectedAttendee.formData.fullName}
                      </h4>
                      <p className="text-[10px] text-gray-400 font-medium flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-gray-400" /> Registered on: <span className="font-semibold text-slate-650">{new Date(selectedAttendee.date).toLocaleDateString()}</span> at <span className="font-mono text-slate-650">{new Date(selectedAttendee.date).toLocaleTimeString()}</span>
                      </p>
                    </div>

                    {/* Contact Block Grid */}
                    <div className="border-t border-gray-100 pt-4 space-y-2.5">
                      <p className="flex items-center gap-2.5 font-medium text-slate-800">
                        <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <span className="truncate hover:underline select-all">{selectedAttendee.formData.email}</span>
                      </p>
                      <p className="flex items-center gap-2.5 font-medium text-slate-800">
                        <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <span className="select-all">{selectedAttendee.formData.phone}</span>
                      </p>
                    </div>

                    {/* Quick Communication Suite */}
                    <div className="border-t border-gray-100 pt-4 space-y-2.5">
                      <span className="text-[9.5px] uppercase font-black text-indigo-900 tracking-wider block">Communication Options</span>
                      <div className="grid grid-cols-2 gap-2">
                        <a
                          href={gmailUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-250 rounded-lg text-[10.5px] font-bold cursor-pointer transition-colors text-center shadow-xs"
                          title="Open Gmail Composer with Profile Sheet pre-inserted in message body"
                        >
                          <Send className="w-3.5 h-3.5 text-rose-600" />
                          <span>Send via Gmail</span>
                        </a>
                        <a
                          href={mailtoUrl}
                          className="flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-brand-blue border border-blue-250 rounded-lg text-[10.5px] font-bold cursor-pointer transition-colors text-center shadow-xs"
                          title="Open native desktop/mobile mail client"
                        >
                          <Mail className="w-3.5 h-3.5 text-brand-blue-hover" />
                          <span>System Email</span>
                        </a>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopyProfileText(selectedAttendee)}
                        className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-750 border border-slate-200 rounded-lg text-[10.5px] font-bold cursor-pointer transition-colors shadow-2xs"
                        title="Copy profile details format to clipboard"
                      >
                        {copiedRef === selectedAttendee.ref ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-emerald-700">Copied Profile Sheet!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-slate-500" />
                            <span>Copy Profile to Clipboard</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Manual Email Dispatcher */}
                    <div className="border-t border-gray-100 pt-4 space-y-3">
                      <span className="text-[9.5px] uppercase font-black text-indigo-900 tracking-wider block">Manual Email Dispatcher</span>
                      
                      {/* Email 1: Paid in Full Receipt */}
                      <div className="bg-emerald-50/50 border border-emerald-150 p-3 rounded-xl space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-emerald-950 text-[11px] flex items-center gap-1">
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            Paid in Full Receipt
                          </span>
                          <span className="text-[8px] bg-emerald-100 text-emerald-850 px-1.5 py-0.2 rounded-full font-black uppercase">Receipt</span>
                        </div>
                        <p className="text-[9.5px] text-emerald-805 leading-snug">
                          Pre-populates an email receipt confirming registration balance is fully cleared ($0).
                        </p>
                        <div className="grid grid-cols-3 gap-1.5 pt-1">
                          <a
                            href={pifGmailUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-1 py-1.5 bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 rounded-md text-[10px] font-bold cursor-pointer transition-all text-center shadow-3xs"
                            title="Draft with Gmail Web Client"
                          >
                            <Send className="w-3 h-3 text-rose-500" />
                            <span>Gmail</span>
                          </a>
                          <a
                            href={pifMailtoUrl}
                            className="flex items-center justify-center gap-1 py-1.5 bg-white hover:bg-blue-50 text-brand-blue border border-blue-250 rounded-md text-[10px] font-bold cursor-pointer transition-all text-center shadow-3xs"
                            title="Draft with native system mail client"
                          >
                            <Mail className="w-3 h-3 text-brand-blue" />
                            <span>System</span>
                          </a>
                          <button
                            type="button"
                            onClick={() => handleCopyEmailText(selectedAttendee, "paid_in_full")}
                            className="flex items-center justify-center gap-1 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-md text-[10px] font-bold cursor-pointer transition-all shadow-3xs"
                            title="Copy email body text to clipboard"
                          >
                            {copiedEmailType === "paid_in_full" ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                                <span className="text-emerald-700">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5 text-slate-400" />
                                <span>Copy</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Email 2: Balance & Due Dates Reminder */}
                      <div className="bg-amber-50/50 border border-amber-150 p-3 rounded-xl space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-amber-950 text-[11px] flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                            Balance & Due Dates
                          </span>
                          <span className="text-[8px] bg-amber-100 text-amber-850 px-1.5 py-0.2 rounded-full font-black uppercase">Invoice</span>
                        </div>
                        <p className="text-[9.5px] text-amber-855 leading-snug">
                          Pre-populates a payment invoice with outstanding balance and upcoming milestone due dates.
                        </p>
                        <div className="grid grid-cols-3 gap-1.5 pt-1">
                          <a
                            href={balGmailUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-1 py-1.5 bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 rounded-md text-[10px] font-bold cursor-pointer transition-all text-center shadow-3xs"
                            title="Draft with Gmail Web Client"
                          >
                            <Send className="w-3 h-3 text-rose-500" />
                            <span>Gmail</span>
                          </a>
                          <a
                            href={balMailtoUrl}
                            className="flex items-center justify-center gap-1 py-1.5 bg-white hover:bg-blue-50 text-brand-blue border border-blue-250 rounded-md text-[10px] font-bold cursor-pointer transition-all text-center shadow-3xs"
                            title="Draft with native system mail client"
                          >
                            <Mail className="w-3 h-3 text-brand-blue" />
                            <span>System</span>
                          </a>
                          <button
                            type="button"
                            onClick={() => handleCopyEmailText(selectedAttendee, "balance_due")}
                            className="flex items-center justify-center gap-1 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-md text-[10px] font-bold cursor-pointer transition-all shadow-3xs"
                            title="Copy email body text to clipboard"
                          >
                            {copiedEmailType === "balance_due" ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                                <span className="text-emerald-700">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5 text-slate-400" />
                                <span>Copy</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                  {/* Homecoming Treasury Milestone Balance Sheet & Transaction Ledger */}
                  {(() => {
                    const grandTotal = calculateGrandTotal(selectedAttendee.formData);
                    const { totalPaid, balanceDue, statusLabel, statusColor, transactions } = getAttendeePaymentStats(selectedAttendee);
                    const percentPaid = Math.min(100, Math.round((totalPaid / (grandTotal || 1)) * 100));

                    const handleFormSubmit = async (e: React.FormEvent) => {
                      e.preventDefault();
                      setPayError("");
                      const amount = parseFloat(payAmount);
                      if (isNaN(amount) || amount <= 0) {
                        setPayError("Please enter a valid payment amount greater than $0.");
                        return;
                      }
                      await handleAddTransaction(selectedAttendee, amount, payDate, payMethod, payNotes || "Partial Payment");
                      // Reset state
                      setPayAmount("");
                      setPayNotes("");
                      setPayMethod("Zelle");
                      setPayDate(new Date().toISOString().split("T")[0]);
                      setShowAddPaymentForm(false);
                    };

                    return (
                      <div className="border-t border-gray-100 pt-4 space-y-4">
                        {/* Summary Header */}
                        <div className="space-y-1.5">
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] uppercase font-black text-indigo-950 tracking-wider">Treasury Ledger (Option B)</span>
                            <span className={`inline-flex items-center gap-1 text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${statusColor}`}>
                              {statusLabel}
                            </span>
                          </div>

                          {/* Stat Grid */}
                          <div className="grid grid-cols-3 gap-2 bg-slate-50 border border-slate-150 p-2.5 rounded-xl text-center">
                            <div>
                              <span className="text-[8.5px] text-gray-400 font-bold uppercase block">Grand Total</span>
                              <span className="font-mono text-xs font-black text-slate-900">${grandTotal.toLocaleString()}</span>
                            </div>
                            <div className="border-x border-slate-200">
                              <span className="text-[8.5px] text-emerald-600 font-bold uppercase block">Total Paid</span>
                              <span className="font-mono text-xs font-black text-emerald-700">${totalPaid.toLocaleString()}</span>
                            </div>
                            <div>
                              <span className="text-[8.5px] text-red-500 font-bold uppercase block">Balance Due</span>
                              <span className="font-mono text-xs font-black text-red-650">${balanceDue.toLocaleString()}</span>
                            </div>
                          </div>

                          {/* Progress bar */}
                          <div className="space-y-1">
                            <div className="flex justify-between text-[9px] font-bold text-gray-400">
                              <span>Payment Collections Progress</span>
                              <span className="font-mono text-slate-700">{percentPaid}%</span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden animate-pulse">
                              <div 
                                className={`h-full rounded-full transition-all duration-500 ${
                                  percentPaid === 100 ? "bg-emerald-500" : percentPaid >= 50 ? "bg-blue-500" : "bg-amber-500"
                                }`}
                                style={{ width: `${percentPaid}%` }}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Transaction Ledger List */}
                        <div className="space-y-2">
                          <span className="text-[9.5px] uppercase font-bold text-slate-500 tracking-wider block">Recorded Transactions ({transactions.length})</span>
                          
                          {transactions.length === 0 ? (
                            <div className="text-center p-4 bg-slate-50/50 border border-dashed border-slate-200 rounded-xl text-gray-400 text-[10.5px]">
                              No transactions recorded yet. Click below to enter a payment.
                            </div>
                          ) : (
                            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                              {transactions.map((tx) => (
                                <div key={tx.id} className="flex items-center justify-between p-2 rounded-lg border border-slate-150 bg-white shadow-3xs text-[10.5px]">
                                  <div className="space-y-0.5">
                                    <div className="flex items-center gap-1.5 font-bold text-slate-800">
                                      <span className="bg-slate-100 text-slate-800 text-[8.5px] px-1.5 py-0.5 rounded-sm uppercase tracking-wider font-mono">
                                        {tx.method}
                                      </span>
                                      {tx.notes && (
                                        <span className="text-slate-500 text-[9.5px] truncate max-w-[120px]" title={tx.notes}>
                                          {tx.notes}
                                        </span>
                                      )}
                                    </div>
                                    <span className="text-[9px] text-gray-400 block">
                                      {new Date(tx.date).toLocaleDateString()}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <span className="font-mono font-black text-emerald-700 text-xs">
                                      +${tx.amount.toLocaleString()}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteTransaction(selectedAttendee, tx.id)}
                                      className="p-1 rounded-md text-gray-405 hover:text-red-600 hover:bg-red-50 transition-all cursor-pointer"
                                      title="Delete recorded transaction"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Add Payment Form / Trigger Button */}
                        <div className="space-y-2">
                          {!showAddPaymentForm ? (
                            <button
                              type="button"
                              onClick={() => {
                                setShowAddPaymentForm(true);
                                setPayAmount(balanceDue > 0 ? balanceDue.toString() : "");
                              }}
                              className="w-full py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-250 rounded-xl text-[10.5px] font-bold cursor-pointer transition-colors shadow-2xs text-center flex items-center justify-center gap-1.5"
                            >
                              <CreditCard className="w-3.5 h-3.5" />
                              <span>Record New Payment / Partial</span>
                            </button>
                          ) : (
                            <form onSubmit={handleFormSubmit} className="bg-slate-50/80 border border-slate-200 p-3 rounded-xl space-y-2.5 animate-in fade-in duration-200">
                              <span className="text-[9.5px] uppercase font-black text-indigo-900 tracking-wider block">Record New Entry</span>
                              
                              {payError && (
                                <p className="text-[9.5px] text-red-650 font-semibold leading-normal">{payError}</p>
                              )}

                              <div className="grid grid-cols-2 gap-2">
                                {/* Amount */}
                                <div className="space-y-1">
                                  <label className="text-[9px] font-bold text-gray-400 block uppercase">Amount ($)</label>
                                  <div className="relative">
                                    <span className="absolute left-2.5 top-1.5 text-gray-400 font-bold font-mono">$</span>
                                    <input
                                      type="number"
                                      step="0.01"
                                      placeholder="0.00"
                                      value={payAmount}
                                      onChange={(e) => setPayAmount(e.target.value)}
                                      className="pl-5 pr-2 py-1.5 text-xs block w-full rounded-md border border-gray-300 text-gray-900 font-mono font-bold focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                                    />
                                  </div>
                                </div>

                                {/* Method */}
                                <div className="space-y-1">
                                  <label className="text-[9px] font-bold text-gray-400 block uppercase">Method</label>
                                  <select
                                    value={payMethod}
                                    onChange={(e) => setPayMethod(e.target.value)}
                                    className="py-1.5 px-2 text-xs block w-full rounded-md border border-gray-300 bg-white font-bold"
                                  >
                                    <option value="Zelle">Zelle</option>
                                    <option value="CashApp">CashApp</option>
                                    <option value="Cash">Cash</option>
                                    <option value="Check">Check</option>
                                    <option value="PayPal">PayPal</option>
                                    <option value="Other">Other</option>
                                  </select>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-2">
                                {/* Date */}
                                <div className="space-y-1">
                                  <label className="text-[9px] font-bold text-gray-400 block uppercase">Date Paid</label>
                                  <input
                                    type="date"
                                    value={payDate}
                                    onChange={(e) => setPayDate(e.target.value)}
                                    className="px-2 py-1.5 text-xs block w-full rounded-md border border-gray-300 bg-white font-semibold"
                                  />
                                </div>

                                {/* Notes */}
                                <div className="space-y-1">
                                  <label className="text-[9px] font-bold text-gray-400 block uppercase">Memo / Ref #</label>
                                  <input
                                    type="text"
                                    placeholder="e.g. Deposit"
                                    value={payNotes}
                                    onChange={(e) => setPayNotes(e.target.value)}
                                    className="px-2 py-1.5 text-xs block w-full rounded-md border border-gray-300 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                                  />
                                </div>
                              </div>

                              <div className="flex justify-end gap-1.5 pt-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setShowAddPaymentForm(false);
                                    setPayError("");
                                  }}
                                  className="px-2.5 py-1.5 bg-white border border-gray-300 text-gray-700 text-[10px] font-bold rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="submit"
                                  className="px-3 py-1.5 bg-indigo-600 border border-indigo-600 text-white text-[10px] font-black rounded-lg cursor-pointer hover:bg-indigo-700 transition-colors shadow-2xs"
                                >
                                  Save Payment
                                </button>
                              </div>
                            </form>
                          )}
                        </div>

                        {/* Milestone Installments Quick-Mark Checklist */}
                        <div className="border-t border-gray-150 pt-3 space-y-2">
                          <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider block">Milestone Installments Checklist</span>
                          <div className="grid grid-cols-2 gap-1.5">
                            {getPaymentMilestones(selectedAttendee.formData.selectedPackageId, selectedAttendee.formData.addDetroitJacket).map((m, mIdx) => {
                              const hasMilestoneTx = transactions.some(tx => tx.notes === `${m.date} Milestone`);
                              return (
                                <button
                                  key={mIdx}
                                  type="button"
                                  onClick={() => handleToggleMilestone(selectedAttendee, m.date, !hasMilestoneTx)}
                                  className={`p-2 rounded-xl text-left border text-[10px] transition-all cursor-pointer ${
                                    hasMilestoneTx 
                                      ? "bg-emerald-50/60 border-emerald-250 text-emerald-800 font-extrabold" 
                                      : "bg-slate-50/50 border-slate-150 text-slate-600 hover:bg-slate-50 font-semibold"
                                  }`}
                                >
                                  <div className="flex items-center justify-between leading-none mb-1">
                                    <span>{m.date}</span>
                                    <span className="font-mono text-[10.5px]">${m.amount}</span>
                                  </div>
                                  <span className="text-[8.5px] font-medium block">
                                    {hasMilestoneTx ? "✓ Paid Milestone" : "● Mark Paid (Zelle)"}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Shipping Address Box */}
                  <div className="border-t border-gray-100 pt-4 space-y-1.5">
                    <span className="text-[9px] uppercase font-bold text-gray-400 tracking-wider block">Mailing Coordinates</span>
                    <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 font-bold text-slate-800 leading-relaxed font-mono">
                      {selectedAttendee.formData.shippingAddress.street}
                      <br />
                      {selectedAttendee.formData.shippingAddress.city}, {selectedAttendee.formData.shippingAddress.state} {selectedAttendee.formData.shippingAddress.zipCode}
                    </div>
                  </div>

                  {/* Sizing & Core Choices */}
                  <div className="border-t border-gray-100 pt-4 space-y-2">
                    <span className="text-[9px] uppercase font-bold text-gray-400 tracking-wider block">Core Package Sizing</span>
                    <div className="flex gap-4">
                      <div>
                        <span className="text-gray-400 text-[10px] block mb-1">Core Shirt</span>
                        <span className="font-extrabold bg-blue-100 text-brand-blue border border-blue-250 px-2.5 py-1 rounded-md text-xs">
                          {selectedAttendee.formData.shirtSize}
                        </span>
                      </div>
                      {selectedAttendee.formData.addDetroitJacket && (
                        <div>
                          <span className="text-gray-400 text-[10px] block mb-1">Jacket Size</span>
                          <span className="font-extrabold bg-indigo-50 text-indigo-850 border border-indigo-200 px-2.5 py-1 rounded-md text-xs">
                            {selectedAttendee.formData.jacketSize}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Jacket Customization Details */}
                  {selectedAttendee.formData.addDetroitJacket && (
                    <div className="border-t border-gray-100 pt-4 space-y-2.5 bg-indigo-50/20 p-3 rounded-xl border border-indigo-100/50">
                      <span className="text-[9.5px] uppercase font-black text-indigo-900 tracking-wider block flex items-center gap-1.5">
                        <ShoppingBag className="w-3.5 h-3.5 text-indigo-700" /> Jacket Line Embroidery
                      </span>
                      
                      <div className="space-y-1.5 text-[11px]">
                        <p className="flex justify-between border-b border-indigo-100/20 pb-1.5">
                          <span className="text-gray-400">Crossing Year:</span>
                          <strong className="text-gray-900 font-mono">{selectedAttendee.formData.jacketCrossingYear}</strong>
                        </p>
                        <p className="flex justify-between border-b border-indigo-100/20 pb-1.5">
                          <span className="text-gray-400">Line Name:</span>
                          <strong className="text-slate-900 select-all font-bold">"{selectedAttendee.formData.jacketLineName}"</strong>
                        </p>
                        <p className="flex justify-between border-b border-indigo-100/20 pb-1.5">
                          <span className="text-gray-400">Entire Line Name:</span>
                          <strong className="text-slate-950 select-all font-bold">"{selectedAttendee.formData.jacketEntireLineName}"</strong>
                        </p>
                        <p className="flex justify-between pb-0.5">
                          <span className="text-gray-400">Line Number:</span>
                          <strong className="text-slate-900 font-mono bg-indigo-100/50 px-1.5 py-0.5 rounded-md">{selectedAttendee.formData.jacketLineNumber}</strong>
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Committee Notes / Wishes */}
                  <div className="border-t border-gray-100 pt-4 space-y-1.5">
                    <span className="text-[9px] uppercase font-bold text-gray-400 tracking-wider block">Committee Notes & Requests</span>
                    <div className="bg-slate-50 border border-slate-150 rounded-lg p-3 text-[11px] leading-relaxed text-gray-750 min-h-[50px] italic">
                      {selectedAttendee.formData.specialRequests ? (
                        `"${selectedAttendee.formData.specialRequests}"`
                      ) : (
                        <span className="text-gray-300">No notes provided for this registration.</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer panel controls */}
                <div className="border-t border-gray-100 p-4.5 bg-slate-50 flex items-center justify-end gap-2.5 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => handleStartEdit(selectedAttendee)}
                    className="flex items-center gap-1.5 px-3 py-2 border border-blue-200 text-brand-blue rounded-lg bg-white hover:bg-blue-50 text-[11px] font-bold cursor-pointer transition-colors shadow-2xs"
                  >
                    <Edit className="w-3.5 h-3.5 text-brand-blue-hover" />
                    <span>Edit Profile</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteEntry(selectedAttendee.ref)}
                    className="flex items-center gap-1 px-3 py-2 border border-red-200 text-red-650 rounded-lg bg-white hover:bg-red-50 text-[11px] font-bold cursor-pointer transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedAttendee(null)}
                    className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-300 text-gray-700 rounded-lg text-[11px] font-bold cursor-pointer"
                  >
                    Close
                  </button>
                </div>

              </div>
            </div>
          </div>
        </div>
        );
      })()}

      {/* Custom Stateful Deletion Modal to bypass iframe window.confirm limitations cleanly */}
      {deleteConfirmRef && (() => {
        const entryToDelete = history.find((x) => x.ref === deleteConfirmRef);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs transition-all duration-200" id="delete-confirmation-modal">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl max-w-sm w-full p-6 space-y-4 transform scale-100 transition-all duration-200">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-red-50 text-red-600 rounded-xl flex-shrink-0">
                  <Trash2 className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-display font-black text-slate-900 text-base">
                    Delete Registration?
                  </h4>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    You are deleting the homecoming registration for <span className="font-extrabold text-slate-800">{entryToDelete?.formData.fullName || "this member"}</span> (<code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-[10px]">{deleteConfirmRef}</code>).
                  </p>
                </div>
              </div>

              <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3 text-[11px] leading-relaxed text-amber-900 font-medium">
                <span className="font-extrabold uppercase text-[9px] text-amber-800 tracking-wider block mb-0.5">⚠️ Irreversible Action</span>
                All embroidery customization settings, garment sizes, and package items will be erased from the registry.
              </div>

              <div className="flex items-center gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmRef(null)}
                  className="w-1/2 py-2 px-3 rounded-lg border border-gray-300 bg-white font-bold text-xs text-gray-700 hover:bg-gray-50 cursor-pointer transition-all"
                >
                  Cancel
                </button>
                 <button
                  type="button"
                  onClick={async () => {
                    if (deleteConfirmRef) {
                      try {
                        // Delete document from Firestore
                        await deleteDoc(doc(db, "registrations", deleteConfirmRef));
                      } catch (error) {
                        console.error("Failed to delete registration from Firestore:", error);
                        handleFirestoreError(error, OperationType.DELETE, `registrations/${deleteConfirmRef}`);
                      }

                      // Update local storage fallback as well
                      try {
                        const updated = history.filter((x) => x.ref !== deleteConfirmRef);
                        localStorage.setItem("bbi_homecoming_2026_history", JSON.stringify(updated));
                      } catch (e) {
                        console.error("Failed to update local storage on delete:", e);
                      }
                    }

                    if (selectedAttendee?.ref === deleteConfirmRef) {
                      setSelectedAttendee(null);
                    }
                    setDeleteConfirmRef(null);
                  }}
                  className="w-1/2 py-2 px-3 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-xs cursor-pointer transition-all"
                >
                  Confirm Delete
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Custom Stateful Edit Modal */}
      {editingAttendee && editForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto" id="edit-profile-modal">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl max-w-2xl w-full my-8 transform scale-100 transition-all duration-200 flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-150 flex items-center justify-between bg-slate-950 rounded-t-2xl">
              <div className="flex items-center gap-2 text-white">
                <Edit className="w-4 h-4 text-brand-blue-light" />
                <h4 className="font-display font-black text-xs uppercase tracking-widest text-brand-blue-light">
                  Edit Registrant: {editingAttendee.ref}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditingAttendee(null);
                  setEditForm(null);
                }}
                className="text-slate-450 hover:text-white transition-colors cursor-pointer p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 text-xs text-gray-750 font-sans flex-1">
              {/* Contact Information Section */}
              <div className="space-y-4">
                <h5 className="font-display font-extrabold text-[10px] uppercase tracking-wider text-slate-500 border-b border-gray-100 pb-1">
                  Contact Information
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase font-black tracking-wider text-gray-500 mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      value={editForm.fullName}
                      onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                      className={`block w-full rounded-lg border bg-white px-3 py-2 text-gray-900 shadow-xs focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue focus:outline-hidden ${
                        editErrors.fullName ? "border-red-500" : "border-gray-300"
                      }`}
                    />
                    {editErrors.fullName && (
                      <p className="text-[10px] text-red-500 font-semibold mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> {editErrors.fullName}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-black tracking-wider text-gray-500 mb-1">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      value={editForm.email}
                      onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                      className={`block w-full rounded-lg border bg-white px-3 py-2 text-gray-900 shadow-xs focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue focus:outline-hidden ${
                        editErrors.email ? "border-red-500" : "border-gray-300"
                      }`}
                    />
                    {editErrors.email && (
                      <p className="text-[10px] text-red-500 font-semibold mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> {editErrors.email}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-black tracking-wider text-gray-500 mb-1">
                      Phone Number *
                    </label>
                    <input
                      type="text"
                      value={editForm.phone}
                      onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                      className={`block w-full rounded-lg border bg-white px-3 py-2 text-gray-900 shadow-xs focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue focus:outline-hidden ${
                        editErrors.phone ? "border-red-500" : "border-gray-300"
                      }`}
                    />
                    {editErrors.phone && (
                      <p className="text-[10px] text-red-500 font-semibold mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> {editErrors.phone}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Package & Customize Options */}
              <div className="space-y-4">
                <h5 className="font-display font-extrabold text-[10px] uppercase tracking-wider text-slate-500 border-b border-gray-100 pb-1">
                  Package & Apparel Choices
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase font-black tracking-wider text-gray-500 mb-1">
                      Homecoming Package *
                    </label>
                    <select
                      value={editForm.selectedPackageId}
                      onChange={(e) => setEditForm({ ...editForm, selectedPackageId: e.target.value })}
                      className="block w-full rounded-lg border bg-white border-gray-300 px-3 py-2 text-gray-900 shadow-xs focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue focus:outline-hidden"
                    >
                      {PACKAGE_OPTIONS.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} (${p.price})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-black tracking-wider text-gray-500 mb-1">
                      T-Shirt Size *
                    </label>
                    <select
                      value={editForm.shirtSize}
                      onChange={(e) => setEditForm({ ...editForm, shirtSize: e.target.value })}
                      className={`block w-full rounded-lg border bg-white px-3 py-2 text-gray-900 shadow-xs focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue focus:outline-hidden ${
                        editErrors.shirtSize ? "border-red-500" : "border-gray-300"
                      }`}
                    >
                      <option value="">Select a shirt size...</option>
                      {SHIRT_SIZES.map((sz) => (
                        <option key={sz} value={sz}>
                          Size {sz}
                        </option>
                      ))}
                    </select>
                    {editErrors.shirtSize && (
                      <p className="text-[10px] text-red-500 font-semibold mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> {editErrors.shirtSize}
                      </p>
                    )}
                  </div>
                </div>

                {/* Checkbox Addons */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100 mt-2">
                  <label className="flex items-start gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={editForm.addFootballTicket}
                      onChange={(e) => setEditForm({ ...editForm, addFootballTicket: e.target.checked })}
                      className="h-4 w-4 rounded-sm border-gray-300 text-brand-blue focus:ring-brand-blue mt-0.5"
                    />
                    <div className="space-y-0.5">
                      <span className="font-bold text-slate-800">Add Football Ticket RSVP</span>
                      <p className="text-[10px] text-gray-400">Claims external intent to buy CCU Game RSVP</p>
                    </div>
                  </label>
                  <label className="flex items-start gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={editForm.addDetroitJacket}
                      onChange={(e) => setEditForm({ ...editForm, addDetroitJacket: e.target.checked })}
                      className="h-4 w-4 rounded-sm border-gray-300 text-brand-blue focus:ring-brand-blue mt-0.5"
                    />
                    <div className="space-y-0.5">
                      <span className="font-bold text-slate-800">Include Carhartt Jacket (+$135)</span>
                      <p className="text-[10px] text-gray-400">Embroidery-ready heavyweight wool jacket</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Jacket custom details if checked */}
              {editForm.addDetroitJacket && (
                <div className="bg-indigo-50/30 p-4 rounded-xl border border-indigo-100/50 space-y-4 animate-in fade-in zoom-in-95 duration-150">
                  <h5 className="font-display font-extrabold text-[10px] uppercase tracking-wider text-indigo-900 flex items-center gap-1">
                    <ShoppingBag className="w-3.5 h-3.5 text-indigo-700" /> Custom Jacket Embroidery
                  </h5>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[10px] uppercase font-black tracking-wider text-indigo-950 mb-1">
                        Jacket Size *
                      </label>
                      <select
                        value={editForm.jacketSize}
                        onChange={(e) => setEditForm({ ...editForm, jacketSize: e.target.value })}
                        className={`block w-full rounded-lg border bg-white px-3 py-2 text-gray-900 shadow-xs focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue focus:outline-hidden ${
                          editErrors.jacketSize ? "border-red-500" : "border-gray-300"
                        }`}
                      >
                        <option value="">Select...</option>
                        {SHIRT_SIZES.map((sz) => (
                          <option key={sz} value={sz}>
                            Size {sz}
                          </option>
                        ))}
                      </select>
                      {editErrors.jacketSize && (
                        <p className="text-[10px] text-red-500 font-semibold mt-1 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> {editErrors.jacketSize}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-black tracking-wider text-indigo-950 mb-1">
                        Crossing Year *
                      </label>
                      <input
                        type="text"
                        value={editForm.jacketCrossingYear}
                        onChange={(e) => setEditForm({ ...editForm, jacketCrossingYear: e.target.value })}
                        className={`block w-full rounded-lg border bg-white px-3 py-2 text-gray-900 shadow-xs focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue focus:outline-hidden ${
                          editErrors.jacketCrossingYear ? "border-red-500" : "border-gray-300"
                        }`}
                        placeholder="e.g. SPR 26"
                      />
                      {editErrors.jacketCrossingYear && (
                        <p className="text-[10px] text-red-500 font-semibold mt-1 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> {editErrors.jacketCrossingYear}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-black tracking-wider text-indigo-950 mb-1">
                        Line Number *
                      </label>
                      <input
                        type="text"
                        value={editForm.jacketLineNumber}
                        onChange={(e) => setEditForm({ ...editForm, jacketLineNumber: e.target.value })}
                        className={`block w-full rounded-lg border bg-white px-3 py-2 text-gray-900 shadow-xs focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue focus:outline-hidden ${
                          editErrors.jacketLineNumber ? "border-red-500" : "border-gray-300"
                        }`}
                        placeholder="e.g. #04"
                      />
                      {editErrors.jacketLineNumber && (
                        <p className="text-[10px] text-red-500 font-semibold mt-1 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> {editErrors.jacketLineNumber}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] uppercase font-black tracking-wider text-indigo-950 mb-1">
                        Line Name *
                      </label>
                      <input
                        type="text"
                        value={editForm.jacketLineName}
                        onChange={(e) => setEditForm({ ...editForm, jacketLineName: e.target.value })}
                        className={`block w-full rounded-lg border bg-white px-3 py-2 text-gray-900 shadow-xs focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue focus:outline-hidden ${
                          editErrors.jacketLineName ? "border-red-500" : "border-gray-300"
                        }`}
                        placeholder="e.g. S.S. MERCURY"
                      />
                      {editErrors.jacketLineName && (
                        <p className="text-[10px] text-red-500 font-semibold mt-1 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> {editErrors.jacketLineName}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-black tracking-wider text-indigo-950 mb-1">
                        Entire Line Name *
                      </label>
                      <input
                        type="text"
                        value={editForm.jacketEntireLineName}
                        onChange={(e) => setEditForm({ ...editForm, jacketEntireLineName: e.target.value })}
                        className={`block w-full rounded-lg border bg-white px-3 py-2 text-gray-900 shadow-xs focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue focus:outline-hidden ${
                          editErrors.jacketEntireLineName ? "border-red-500" : "border-gray-300"
                        }`}
                        placeholder="e.g. 19 SOULS OF DESTRUCTION"
                      />
                      {editErrors.jacketEntireLineName && (
                        <p className="text-[10px] text-red-500 font-semibold mt-1 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> {editErrors.jacketEntireLineName}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Shipping Address coordinates */}
              <div className="space-y-4">
                <h5 className="font-display font-extrabold text-[10px] uppercase tracking-wider text-slate-500 border-b border-gray-100 pb-1">
                  Mailing Coordinates
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                  <div className="sm:col-span-6">
                    <label className="block text-[10px] uppercase font-black tracking-wider text-gray-500 mb-1">
                      Street Address *
                    </label>
                    <input
                      type="text"
                      value={editForm.shippingAddress.street}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          shippingAddress: { ...editForm.shippingAddress, street: e.target.value }
                        })
                      }
                      className={`block w-full rounded-lg border bg-white px-3 py-2 text-gray-900 shadow-xs focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue focus:outline-hidden ${
                        editErrors.street ? "border-red-500" : "border-gray-300"
                      }`}
                    />
                    {editErrors.street && (
                      <p className="text-[10px] text-red-500 font-semibold mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> {editErrors.street}
                      </p>
                    )}
                  </div>
                  <div className="sm:col-span-3">
                    <label className="block text-[10px] uppercase font-black tracking-wider text-gray-500 mb-1">
                      City *
                    </label>
                    <input
                      type="text"
                      value={editForm.shippingAddress.city}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          shippingAddress: { ...editForm.shippingAddress, city: e.target.value }
                        })
                      }
                      className={`block w-full rounded-lg border bg-white px-3 py-2 text-gray-900 shadow-xs focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue focus:outline-hidden ${
                        editErrors.city ? "border-red-500" : "border-gray-300"
                      }`}
                    />
                    {editErrors.city && (
                      <p className="text-[10px] text-red-500 font-semibold mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> {editErrors.city}
                      </p>
                    )}
                  </div>
                  <div className="sm:col-span-1.5">
                    <label className="block text-[10px] uppercase font-black tracking-wider text-gray-500 mb-1">
                      State *
                    </label>
                    <select
                      value={editForm.shippingAddress.state}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          shippingAddress: { ...editForm.shippingAddress, state: e.target.value }
                        })
                      }
                      className={`block w-full rounded-lg border bg-white px-2 py-2 text-gray-900 shadow-xs focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue focus:outline-hidden ${
                        editErrors.state ? "border-red-500" : "border-gray-300"
                      }`}
                    >
                      <option value="">--</option>
                      {STATE_LIST.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                    {editErrors.state && (
                      <p className="text-[10px] text-red-500 font-semibold mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> {editErrors.state}
                      </p>
                    )}
                  </div>
                  <div className="sm:col-span-1.5">
                    <label className="block text-[10px] uppercase font-black tracking-wider text-gray-500 mb-1">
                      ZIP *
                    </label>
                    <input
                      type="text"
                      value={editForm.shippingAddress.zipCode}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          shippingAddress: { ...editForm.shippingAddress, zipCode: e.target.value }
                        })
                      }
                      className={`block w-full rounded-lg border bg-white px-2 py-2 text-gray-900 shadow-xs focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue focus:outline-hidden ${
                        editErrors.zipCode ? "border-red-500" : "border-gray-300"
                      }`}
                    />
                    {editErrors.zipCode && (
                      <p className="text-[10px] text-red-500 font-semibold mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> {editErrors.zipCode}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Committee notes */}
              <div className="space-y-4">
                <h5 className="font-display font-extrabold text-[10px] uppercase tracking-wider text-slate-500 border-b border-gray-100 pb-1">
                  Committee Notes & Special Requests
                </h5>
                <div>
                  <textarea
                    rows={2}
                    value={editForm.specialRequests}
                    onChange={(e) => setEditForm({ ...editForm, specialRequests: e.target.value })}
                    className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-xs focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue focus:outline-hidden sm:text-xs"
                    placeholder="Dietary constraints, delivery wishes, comments..."
                  />
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-150 bg-slate-50 flex items-center justify-end gap-2.5 rounded-b-2xl">
              <button
                type="button"
                onClick={() => {
                  setEditingAttendee(null);
                  setEditForm(null);
                }}
                className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-300 text-gray-700 rounded-lg text-xs font-bold cursor-pointer transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSavingEdit}
                onClick={handleSaveEdit}
                className="px-5 py-2 bg-brand-blue hover:bg-brand-blue-dark text-white rounded-lg text-xs font-bold cursor-pointer shadow-md transition-all flex items-center gap-1.5 disabled:opacity-80 disabled:cursor-not-allowed"
              >
                {isSavingEdit ? (
                  <>
                    <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 stroke-[2.5]" />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
