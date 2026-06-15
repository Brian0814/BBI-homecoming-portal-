/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { OrderForm, PACKAGE_OPTIONS } from "../types";
import { 
  Users, Trash2, Search, Download, Printer, ArrowUpDown, ChevronDown, 
  Layers, CreditCard, Sparkles, Filter, MoreHorizontal, ShoppingCart, 
  MapPin, Phone, Mail, FileText, ArrowLeft, Ticket, ShoppingBag, Eye, Calendar
} from "lucide-react";

interface HistoryEntry {
  ref: string;
  date: string;
  formData: OrderForm;
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

export default function AdminPortal({ onBackToForm }: AdminPortalProps) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPackage, setFilterPackage] = useState("all");
  const [filterJacket, setFilterJacket] = useState("all");
  const [activeSortField, setActiveSortField] = useState<"date" | "name" | "total">("date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [selectedAttendee, setSelectedAttendee] = useState<HistoryEntry | null>(null);
  const [deleteConfirmRef, setDeleteConfirmRef] = useState<string | null>(null);

  // Load history from localStorage or seed mock records if empty
  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem("bbi_homecoming_2026_history");
      if (savedHistory) {
        const parsed = JSON.parse(savedHistory);
        if (parsed && parsed.length > 0) {
          setHistory(parsed);
          return;
        }
      }
    } catch (e) {
      console.warn("Could not load order history, using mock data:", e);
    }
    
    // Fallback to storing seed mock data
    setHistory(SEED_MOCK_DATA);
    try {
      localStorage.setItem("bbi_homecoming_2026_history", JSON.stringify(SEED_MOCK_DATA));
    } catch (e) {
      console.error(e);
    }
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

  // Delete handler
  const handleDeleteEntry = (ref: string) => {
    setDeleteConfirmRef(ref);
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

  // Statistics summaries calculations
  const totalEntries = history.length;
  const totalRevenue = history.reduce((sum, item) => sum + calculateGrandTotal(item.formData), 0);
  const totalDepositDueOverall = history.reduce((sum, item) => {
    const pkg = PACKAGE_OPTIONS.find((p) => p.id === item.formData.selectedPackageId);
    const packageDeposit = pkg ? 100 : 0;
    const jacketDeposit = item.formData.addDetroitJacket ? 70 : 0;
    return sum + packageDeposit + jacketDeposit;
  }, 0);
  const totalRemainingBalanceOverall = totalRevenue - totalDepositDueOverall;
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

      {/* 2. Interactive Analytical Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4" id="stats-dashboard">
        {/* Card 1: Submissions */}
        <div className="bg-white border border-gray-200 p-4 rounded-2xl flex flex-col justify-between shadow-2xs relative overflow-hidden">
          <div>
            <span className="text-[10px] uppercase font-black text-gray-400 tracking-wider block">Intake Submissions</span>
            <span className="font-mono text-2xl font-black text-brand-blue block mt-1">{totalEntries} Members</span>
          </div>
          <p className="text-[10px] text-gray-400 mt-3 font-semibold leading-none flex items-center gap-1">
            <Sparkles className="w-3" /> Real-time saved registry
          </p>
          <div className="absolute top-2 right-2 p-1 bg-blue-50 text-brand-blue rounded-md"><Users className="w-4 h-4" /></div>
        </div>

        {/* Card 2: Total Owed (Overall Value) */}
        <div className="bg-white border border-gray-200 p-4 rounded-2xl flex flex-col justify-between shadow-2xs relative overflow-hidden">
          <div>
            <span className="text-[10px] uppercase font-black text-gray-400 tracking-wider block">Total Projected</span>
            <span className="font-mono text-2xl font-black text-slate-800 block mt-1">${totalRevenue}</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-3 font-semibold leading-none">
            Checkout Grand Total
          </p>
          <div className="absolute top-2 right-2 p-1 bg-gray-100 text-slate-600 rounded-md"><CreditCard className="w-4 h-4" /></div>
        </div>

        {/* Card 3: Deposits Owed by July 19 */}
        <div className="bg-blue-50/50 border border-blue-200 p-4 rounded-2xl flex flex-col justify-between shadow-2xs relative overflow-hidden">
          <div>
            <span className="text-[10px] uppercase font-black text-brand-blue tracking-wider block">Due 7/19 (Deposits)</span>
            <span className="font-mono text-2xl font-black text-brand-blue block mt-1">${totalDepositDueOverall}</span>
          </div>
          <p className="text-[10px] text-blue-700/80 mt-3 font-bold leading-none">
            🟢 Initial installment target
          </p>
          <div className="absolute top-2 right-2 p-1 bg-blue-105 text-brand-blue rounded-md"><Calendar className="w-4 h-4" /></div>
        </div>

        {/* Card 4: Remaining Balance Owed by Sept 4 */}
        <div className="bg-amber-50/60 border border-amber-250 p-4 rounded-2xl flex flex-col justify-between shadow-2xs relative overflow-hidden">
          <div>
            <span className="text-[10px] uppercase font-black text-amber-800 tracking-wider block">Due 9/4 (Balances)</span>
            <span className="font-mono text-2xl font-black text-amber-700 block mt-1">${totalRemainingBalanceOverall}</span>
          </div>
          <p className="text-[10px] text-amber-800/80 mt-3 font-bold leading-none">
            ⏰ Outstanding target
          </p>
          <div className="absolute top-2 right-2 p-1 bg-amber-100 text-amber-700 rounded-md"><Calendar className="w-4 h-4" /></div>
        </div>

        {/* Card 5: Jackets */}
        <div className="bg-white border border-gray-200 p-4 rounded-2xl flex flex-col justify-between shadow-2xs relative overflow-hidden">
          <div>
            <span className="text-[10px] uppercase font-black text-gray-400 tracking-wider block">Custom Jackets</span>
            <span className="font-mono text-2xl font-black text-indigo-600 block mt-1">{totalJacketOrders} Orders</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-3 font-semibold leading-none">
            {Math.round((totalJacketOrders / (totalEntries || 1)) * 100)}% custom order
          </p>
          <div className="absolute top-2 right-2 p-1 bg-indigo-50 text-indigo-600 rounded-md"><ShoppingBag className="w-4 h-4" /></div>
        </div>

        {/* Card 6: Game RSVPs */}
        <div className="bg-white border border-gray-200 p-4 rounded-2xl flex flex-col justify-between shadow-2xs relative overflow-hidden">
          <div>
            <span className="text-[10px] uppercase font-black text-gray-400 tracking-wider block">Game RSVPs</span>
            <span className="font-mono text-2xl font-black text-amber-600 block mt-1">{totalTicketsSold} RSVPs</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-3 font-semibold leading-none">
            Game interest block
          </p>
          <div className="absolute top-2 right-2 p-1 bg-amber-50 text-amber-600 rounded-md"><Ticket className="w-4 h-4" /></div>
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

      {/* 4. Table Grid Lists & Details Overlay Column */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Registration Table List */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
          <div className="border-b border-gray-150 p-4 bg-slate-50/50 flex items-center justify-between">
            <span className="text-xs font-black text-slate-800 uppercase tracking-widest block">
              Active Member Register ({processedRecords.length} results)
            </span>
            <div className="flex gap-2 text-[10px] text-gray-400 font-bold">
              <span>Sort:</span>
              <button onClick={() => toggleSort("date")} className={`hover:underline cursor-pointer flex items-center gap-0.5 ${activeSortField === "date" ? "text-brand-blue" : ""}`}>
                Date {activeSortField === "date" && (sortDirection === "asc" ? "▲" : "▼")}
              </button>
              <button onClick={() => toggleSort("name")} className={`hover:underline cursor-pointer flex items-center gap-0.5 ${activeSortField === "name" ? "text-brand-blue" : ""}`}>
                Name {activeSortField === "name" && (sortDirection === "asc" ? "▲" : "▼")}
              </button>
              <button onClick={() => toggleSort("total")} className={`hover:underline cursor-pointer flex items-center gap-0.5 ${activeSortField === "total" ? "text-brand-blue" : ""}`}>
                Total {activeSortField === "total" && (sortDirection === "asc" ? "▲" : "▼")}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            {processedRecords.length > 0 ? (
              <table className="min-w-full divide-y divide-gray-200 text-xs">
                <thead>
                  <tr className="bg-slate-50 text-gray-500 uppercase font-bold tracking-wider text-[10px]">
                    <th className="px-4 py-3 text-left">Member Name</th>
                    <th className="px-4 py-3 text-left hidden sm:table-cell">Reg Category</th>
                    <th className="px-4 py-3 text-center">Add-Ons</th>
                    <th className="px-4 py-3 text-right">Sum</th>
                    <th className="px-4 py-3 text-right">Action</th>
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
                        className={`hover:bg-blue-50/20 cursor-pointer transition-colors ${
                          selectedAttendee?.ref === item.ref ? "bg-blue-50/50" : ""
                        }`}
                        onClick={() => setSelectedAttendee(item)}
                      >
                        {/* Member Name details */}
                        <td className="px-4 py-3.5">
                          <p className="font-extrabold text-gray-900">{item.formData.fullName}</p>
                          <p className="text-[10px] text-gray-400 font-mono mt-0.5">{item.ref}</p>
                        </td>

                        {/* Reg Package type */}
                        <td className="px-4 py-3.5 hidden sm:table-cell">
                          <p className="font-semibold text-slate-800 truncate max-w-[140px]">{pkg?.name || "None Chosen"}</p>
                          <p className="text-[10px] text-gray-400 font-semibold">{item.formData.shirtSize ? `Size ${item.formData.shirtSize} T-Shirt` : ""}</p>
                        </td>

                        {/* Add-on badges */}
                        <td className="px-4 py-3.5 text-center">
                          <div className="inline-flex flex-wrap gap-1 items-center justify-center">
                            {isTicket && (
                              <span className="bg-emerald-50 text-emerald-800 border border-emerald-100 text-[9px] font-black uppercase px-1.5 py-0.5 rounded-sm flex items-center gap-0.5" title="Football ticket purchased">
                                <Ticket className="w-2.5 h-2.5" /> Ticket
                              </span>
                            )}
                            {isJacket && (
                              <span className="bg-indigo-50 text-indigo-800 border border-indigo-100 text-[9px] font-black uppercase px-1.5 py-0.5 rounded-sm flex items-center gap-0.5" title="Carhartt Style Jacket purchased">
                                <ShoppingBag className="w-2.5 h-2.5" /> Jacket ({item.formData.jacketSize})
                              </span>
                            )}
                            {!isTicket && !isJacket && (
                              <span className="text-[9px] text-gray-300 font-bold block">No Addons</span>
                            )}
                          </div>
                        </td>

                        {/* SUM total */}
                        <td className="px-4 py-3.5 text-right font-mono">
                          <p className="font-black text-slate-900 text-sm">${total}</p>
                          {(() => {
                            const { depositDue, balanceDue } = calculateDepositAndBalance(item.formData);
                            return (
                              <p className="text-[9.5px] font-sans font-bold mt-1 tracking-tight leading-none whitespace-nowrap">
                                <span className="text-brand-blue" title="Required deposit due July 19">7/19: ${depositDue}</span>
                                <span className="mx-1 text-gray-300">|</span>
                                <span className="text-amber-700" title="Remaining balance due September 4">9/4: ${balanceDue}</span>
                              </p>
                            );
                          })()}
                        </td>

                        {/* Action parameters */}
                        <td className="px-4 py-3.5 text-right space-x-1.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => setSelectedAttendee(item)}
                            className="p-1 px-2 rounded-md bg-slate-100 hover:bg-brand-blue hover:text-white text-gray-500 font-bold text-[10px] cursor-pointer transition-all"
                          >
                            Details
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteEntry(item.ref)}
                            className="p-1 rounded-md hover:bg-red-50 text-gray-400 hover:text-red-600 cursor-pointer transition-colors"
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
              <div className="text-center py-10 px-4">
                <Layers className="w-10 h-10 text-gray-300 mx-auto mb-2" />
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

        {/* Selected Registrant Expand Details Column */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-xs overflow-hidden">
          <div className="bg-slate-950 font-display font-black text-[10px] uppercase tracking-widest text-brand-blue-light p-4 flex items-center justify-between">
            <span>Registrant Profile Detail</span>
            {selectedAttendee && (
              <span className="bg-brand-blue text-white px-2 py-0.5 rounded-sm font-mono text-[9px]">
                {selectedAttendee.ref}
              </span>
            )}
          </div>

          {selectedAttendee ? (
            <div className="p-5 space-y-5 text-xs text-gray-700">
              {/* Full Header Name */}
              <div>
                <h4 className="font-display font-black text-gray-950 text-base leading-snug">
                  {selectedAttendee.formData.fullName}
                </h4>
                <p className="text-[10px] text-gray-400 font-medium flex items-center gap-1 mt-1">
                  <Calendar className="w-3" /> Registered on: {new Date(selectedAttendee.date).toLocaleDateString()} at {new Date(selectedAttendee.date).toLocaleTimeString()}
                </p>
              </div>

              {/* Contact Block Grid */}
              <div className="border-t border-gray-100 pt-3 space-y-2">
                <p className="flex items-center gap-2 font-medium">
                  <Mail className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                  <span className="truncate">{selectedAttendee.formData.email}</span>
                </p>
                <p className="flex items-center gap-2 font-medium">
                  <Phone className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                  <span>{selectedAttendee.formData.phone}</span>
                </p>
              </div>

              {/* Homecoming Treasury Milestone Balance Sheet */}
              {(() => {
                const { total, depositDue, balanceDue } = calculateDepositAndBalance(selectedAttendee.formData);
                return (
                  <div className="border-t border-gray-100 pt-3 space-y-2">
                    <span className="text-[10px] uppercase font-extrabold text-slate-500 tracking-wider block">Treasury Payment Milestones</span>
                    <div className="bg-slate-50 hover:bg-slate-100/70 border border-gray-250 p-3 rounded-xl space-y-2 text-xs transition-colors duration-150">
                      <div className="flex items-center justify-between font-extrabold text-slate-800">
                        <span>Total Registered Cost:</span>
                        <span className="font-mono text-gray-950 text-sm">${total}</span>
                      </div>
                      <div className="border-t border-gray-200 pt-2 space-y-1 text-[11px]">
                        <div className="flex items-center justify-between font-bold text-blue-755 hover:text-brand-blue">
                          <span>🟢 Required Deposit (by July 19):</span>
                          <span className="font-mono text-brand-blue font-black">${depositDue}</span>
                        </div>
                        <div className="flex items-center justify-between font-bold text-amber-900">
                          <span>⏰ Remaining Balance (by Sept 4):</span>
                          <span className="font-mono text-amber-700 font-black">${balanceDue}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Shipping Address Box */}
              <div className="border-t border-gray-100 pt-3 space-y-1.5">
                <span className="text-[9px] uppercase font-bold text-gray-400 tracking-wider block">Mailing Coordinates</span>
                <div className="bg-slate-50 border border-slate-100 rounded-lg p-2.5 font-bold text-gray-800 leading-relaxed">
                  {selectedAttendee.formData.shippingAddress.street}
                  <br />
                  {selectedAttendee.formData.shippingAddress.city}, {selectedAttendee.formData.shippingAddress.state} {selectedAttendee.formData.shippingAddress.zipCode}
                </div>
              </div>

              {/* Sizing & Core Choices */}
              <div className="border-t border-gray-100 pt-3 space-y-1.5">
                <span className="text-[9px] uppercase font-bold text-gray-400 tracking-wider block">Core Package Sizing</span>
                <div className="flex gap-4">
                  <div>
                    <span className="text-gray-400 block mb-0.5">Core Shirt</span>
                    <span className="font-black bg-blue-100 text-brand-blue px-2 py-0.5 rounded-sm">
                      SIZE {selectedAttendee.formData.shirtSize}
                    </span>
                  </div>
                  {selectedAttendee.formData.addDetroitJacket && (
                    <div>
                      <span className="text-gray-400 block mb-0.5">Jacket Size</span>
                      <span className="font-black bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-sm">
                        SIZE {selectedAttendee.formData.jacketSize}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Jacket Customization Details */}
              {selectedAttendee.formData.addDetroitJacket && (
                <div className="border-t border-gray-100 pt-3 space-y-2.5 bg-indigo-50/30 p-2.5 rounded-lg border border-indigo-100/50">
                  <span className="text-[9px] uppercase font-bold text-indigo-900 tracking-wider block flex items-center gap-1">
                    <ShoppingBag className="w-3 h-3" /> Jacket Embroidery Details
                  </span>
                  
                  <div className="space-y-1.5 text-[11px]">
                    <p className="flex justify-between border-b border-indigo-100/30 pb-1">
                      <span className="text-gray-400">Crossing Year:</span>
                      <strong className="text-gray-900">{selectedAttendee.formData.jacketCrossingYear}</strong>
                    </p>
                    <p className="flex justify-between border-b border-indigo-100/30 pb-1">
                      <span className="text-gray-400">Line Name:</span>
                      <strong className="text-gray-900">{selectedAttendee.formData.jacketLineName}</strong>
                    </p>
                    <p className="flex justify-between border-b border-indigo-100/30 pb-1">
                      <span className="text-gray-400">Entire Line Name:</span>
                      <strong className="text-gray-900">{selectedAttendee.formData.jacketEntireLineName}</strong>
                    </p>
                    <p className="flex justify-between pb-1">
                      <span className="text-gray-400">Line Number:</span>
                      <strong className="text-gray-900">#{selectedAttendee.formData.jacketLineNumber}</strong>
                    </p>
                  </div>
                </div>
              )}

              {/* Committee Notes / Wishes */}
              <div className="border-t border-gray-100 pt-3 space-y-1.5">
                <span className="text-[9px] uppercase font-bold text-gray-400 tracking-wider block">Committee Notes & Requests</span>
                <div className="bg-slate-50 border border-slate-100 rounded-lg p-2.5 text-[11px] leading-relaxed text-gray-650 min-h-[50px] italic">
                  {selectedAttendee.formData.specialRequests ? (
                    `"${selectedAttendee.formData.specialRequests}"`
                  ) : (
                    <span className="text-gray-300">No notes provided for this registration.</span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-gray-400 text-xs">
              <Eye className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <span>Click any member row on the left panel to review full customized sizing details, shipping addresses, and lineage embroidery.</span>
            </div>
          )}
        </div>
      </div>

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
                  onClick={() => {
                    const updated = history.filter((x) => x.ref !== deleteConfirmRef);
                    setHistory(updated);
                    try {
                      localStorage.setItem("bbi_homecoming_2026_history", JSON.stringify(updated));
                    } catch (e) {
                      console.error(e);
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
    </div>
  );
}
