/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import { 
  EarmarkedFund, 
  EarmarkedFundAllocation, 
  HistoryEntry, 
  PACKAGE_OPTIONS 
} from "../types";
import { 
  X, 
  Plus, 
  DollarSign, 
  CheckCircle2, 
  Clock, 
  ArrowRight, 
  Trash2, 
  Search, 
  AlertCircle, 
  Calendar, 
  CreditCard, 
  User, 
  Tag, 
  ChevronDown, 
  ChevronUp, 
  Layers, 
  RotateCcw,
  Sparkles,
  Check
} from "lucide-react";
import { getAttendeePaymentStats, getLocalDateString, formatDisplayDate } from "../lib/paymentUtils";

interface EarmarkedFundsModalProps {
  isOpen: boolean;
  onClose: () => void;
  earmarkedFunds: EarmarkedFund[];
  history: HistoryEntry[];
  onAddFund: (data: {
    amount: number;
    sourceName: string;
    email?: string;
    phone?: string;
    date: string;
    method: string;
    notes?: string;
  }) => Promise<void>;
  onUpdateFund?: (fund: EarmarkedFund) => Promise<void>;
  onDeleteFund: (fundId: string) => Promise<void>;
  onApplyFundToRegistration: (
    fundId: string,
    registrationRef: string,
    amount: number,
    date: string,
    notes: string
  ) => Promise<void>;
  onDeallocateFund: (fundId: string, allocationId: string) => Promise<void>;
  initialTargetRef?: string;
}

export function EarmarkedFundsModal({
  isOpen,
  onClose,
  earmarkedFunds,
  history,
  onAddFund,
  onDeleteFund,
  onApplyFundToRegistration,
  onDeallocateFund,
  initialTargetRef
}: EarmarkedFundsModalProps) {
  const [activeTab, setActiveTab] = useState<"list" | "create" | "apply">("list");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "available" | "partially_applied" | "fully_applied">("all");
  const [expandedFundIds, setExpandedFundIds] = useState<Record<string, boolean>>({});

  // Form State: Add new fund
  const [formAmount, setFormAmount] = useState("");
  const [formSourceName, setFormSourceName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formDate, setFormDate] = useState(() => getLocalDateString());
  const [formMethod, setFormMethod] = useState("Zelle");
  const [formNotes, setFormNotes] = useState("");
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Apply State: Apply fund to registration
  const [selectedFundForApply, setSelectedFundForApply] = useState<EarmarkedFund | null>(null);
  const [targetRegistrationRef, setTargetRegistrationRef] = useState<string>(initialTargetRef || "");
  const [applyAmount, setApplyAmount] = useState("");
  const [applyDate, setApplyDate] = useState(() => getLocalDateString());
  const [applyNotes, setApplyNotes] = useState("");
  const [applyError, setApplyError] = useState("");
  const [isApplying, setIsApplying] = useState(false);
  const [actionSuccessToast, setActionSuccessToast] = useState<string | null>(null);

  // If initialTargetRef is provided on open, switch to apply tab if funds are available
  React.useEffect(() => {
    if (isOpen && initialTargetRef) {
      setTargetRegistrationRef(initialTargetRef);
      const firstAvailable = earmarkedFunds.find(f => f.remainingAmount > 0);
      if (firstAvailable) {
        setSelectedFundForApply(firstAvailable);
        setActiveTab("apply");
      }
    }
  }, [isOpen, initialTargetRef, earmarkedFunds]);

  // Aggregate stats
  const totalReceived = useMemo(() => 
    earmarkedFunds.reduce((sum, f) => sum + (f.amount || 0), 0)
  , [earmarkedFunds]);

  const totalAllocated = useMemo(() => 
    earmarkedFunds.reduce((sum, f) => sum + (f.allocatedAmount || 0), 0)
  , [earmarkedFunds]);

  const totalRemaining = useMemo(() => 
    earmarkedFunds.reduce((sum, f) => sum + (f.remainingAmount || 0), 0)
  , [earmarkedFunds]);

  // Filtered funds
  const filteredFunds = useMemo(() => {
    return earmarkedFunds.filter((f) => {
      const matchSearch = 
        f.sourceName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (f.notes && f.notes.toLowerCase().includes(searchTerm.toLowerCase())) ||
        f.method.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.id.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchStatus = 
        statusFilter === "all" || f.status === statusFilter;

      return matchSearch && matchStatus;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [earmarkedFunds, searchTerm, statusFilter]);

  // Handle new fund submission
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    const numAmount = parseFloat(formAmount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setFormError("Please enter a valid amount greater than $0.");
      return;
    }

    if (!formSourceName.trim()) {
      setFormError("Please enter the name of the brother or contributor.");
      return;
    }

    setIsSubmitting(true);
    try {
      await onAddFund({
        amount: numAmount,
        sourceName: formSourceName.trim(),
        email: formEmail.trim(),
        phone: formPhone.trim(),
        date: formDate,
        method: formMethod,
        notes: formNotes.trim(),
      });

      // Reset form
      setFormAmount("");
      setFormSourceName("");
      setFormEmail("");
      setFormPhone("");
      setFormDate(getLocalDateString());
      setFormMethod("Zelle");
      setFormNotes("");
      setActiveTab("list");

      showToast(`Earmarked fund of $${numAmount.toLocaleString()} added to Treasury!`);
    } catch (err: any) {
      console.error("Failed to add earmarked fund:", err);
      setFormError(err?.message || "Failed to save earmarked fund. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open apply view for a specific fund
  const handleStartApply = (fund: EarmarkedFund) => {
    setSelectedFundForApply(fund);
    setApplyAmount(String(fund.remainingAmount));
    setApplyDate(getLocalDateString());
    setApplyNotes(`Applied from Earmarked Fund (${fund.sourceName})`);
    setApplyError("");
    setActiveTab("apply");
  };

  // Execute application of fund to registration
  const handleConfirmApply = async (e: React.FormEvent) => {
    e.preventDefault();
    setApplyError("");

    if (!selectedFundForApply) {
      setApplyError("No fund selected.");
      return;
    }

    if (!targetRegistrationRef) {
      setApplyError("Please select a registered brother to apply funds to.");
      return;
    }

    const numAmount = parseFloat(applyAmount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setApplyError("Please enter a valid allocation amount greater than $0.");
      return;
    }

    if (numAmount > selectedFundForApply.remainingAmount) {
      setApplyError(`Amount cannot exceed the remaining fund balance of $${selectedFundForApply.remainingAmount.toLocaleString()}.`);
      return;
    }

    const targetAttendee = history.find(h => h.ref === targetRegistrationRef);
    if (!targetAttendee) {
      setApplyError("Selected registration could not be found.");
      return;
    }

    setIsApplying(true);
    try {
      await onApplyFundToRegistration(
        selectedFundForApply.id,
        targetRegistrationRef,
        numAmount,
        applyDate,
        applyNotes || `Applied from Earmarked Fund (${selectedFundForApply.sourceName})`
      );

      setActiveTab("list");
      setSelectedFundForApply(null);
      showToast(`Applied $${numAmount.toLocaleString()} from ${selectedFundForApply.sourceName} to Brother ${targetAttendee.formData.fullName}!`);
    } catch (err: any) {
      console.error("Failed to apply earmarked fund:", err);
      setApplyError(err?.message || "Failed to apply fund to registration.");
    } finally {
      setIsApplying(false);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedFundIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const showToast = (msg: string) => {
    setActionSuccessToast(msg);
    setTimeout(() => {
      setActionSuccessToast(null);
    }, 4500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div 
        className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-slate-950 px-6 py-4 flex items-center justify-between border-b border-slate-800 text-white flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand-blue/20 border border-brand-blue/40 rounded-xl text-brand-blue-light">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display text-lg font-black text-white tracking-tight">
                  Earmarked Treasury Funds
                </h3>
                <span className="text-[10px] bg-brand-blue/30 text-brand-blue-light border border-brand-blue/40 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                  Holding Ledger
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Track advance payments and donor funds earmarked for future allocation to registrations
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success Toast Banner */}
        {actionSuccessToast && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-6 py-2.5 flex items-center gap-2 text-emerald-800 text-xs font-bold animate-in slide-in-from-top duration-200">
            <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{actionSuccessToast}</span>
          </div>
        )}

        {/* Stats Summary Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-5 bg-slate-50 border-b border-slate-200 flex-shrink-0">
          <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs">
            <span className="text-[10px] text-slate-500 uppercase font-black tracking-wider block">
              Total Earmarked Collected
            </span>
            <span className="font-mono text-xl font-black text-slate-900 block mt-0.5">
              ${totalReceived.toLocaleString()}
            </span>
            <span className="text-[10px] text-slate-400 font-medium">Added to Treasury Collections</span>
          </div>

          <div className="bg-emerald-50/60 p-3.5 rounded-xl border border-emerald-200 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-emerald-800 uppercase font-black tracking-wider block">
                Available to Apply
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <span className="font-mono text-xl font-black text-emerald-700 block mt-0.5">
              ${totalRemaining.toLocaleString()}
            </span>
            <span className="text-[10px] text-emerald-600 font-medium">Unallocated money on hold</span>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs">
            <span className="text-[10px] text-slate-500 uppercase font-black tracking-wider block">
              Applied to Registrations
            </span>
            <span className="font-mono text-xl font-black text-brand-blue block mt-0.5">
              ${totalAllocated.toLocaleString()}
            </span>
            <span className="text-[10px] text-slate-400 font-medium">Credited to brother ledgers</span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 px-6 bg-white gap-4 flex-shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab("list")}
            className={`py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === "list"
                ? "border-brand-blue text-brand-blue"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Earmarked Records ({earmarkedFunds.length})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setFormError("");
              setActiveTab("create");
            }}
            className={`py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === "create"
                ? "border-brand-blue text-brand-blue"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Earmark New Funds</span>
          </button>

          {selectedFundForApply && (
            <button
              type="button"
              onClick={() => setActiveTab("apply")}
              className={`py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === "apply"
                  ? "border-brand-blue text-brand-blue"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <ArrowRight className="w-3.5 h-3.5 text-emerald-600" />
              <span>Apply to Registration ({selectedFundForApply.sourceName})</span>
            </button>
          )}
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* TAB 1: LIST VIEW */}
          {activeTab === "list" && (
            <div className="space-y-4">
              {/* Search & Filter Bar */}
              <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
                <div className="relative w-full sm:w-72">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by name, memo, method..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-brand-blue"
                  />
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Status:</span>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    className="py-1 px-2.5 text-xs border border-slate-200 rounded-lg bg-white text-slate-700 font-semibold focus:outline-hidden"
                  >
                    <option value="all">All Statuses</option>
                    <option value="available">Available Only</option>
                    <option value="partially_applied">Partially Applied</option>
                    <option value="fully_applied">Fully Applied</option>
                  </select>
                </div>
              </div>

              {/* Records List */}
              {filteredFunds.length === 0 ? (
                <div className="text-center py-12 px-4 bg-slate-50/70 border border-dashed border-slate-200 rounded-2xl">
                  <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400 mb-3">
                    <DollarSign className="w-6 h-6" />
                  </div>
                  <h4 className="font-display font-bold text-sm text-slate-800">
                    {earmarkedFunds.length === 0 ? "No Earmarked Funds Recorded Yet" : "No Matching Records Found"}
                  </h4>
                  <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-4">
                    {earmarkedFunds.length === 0 
                      ? "Record advance payments, alumni donations, or unassigned deposits here. They will immediately be added to the Treasury Payments Collected total."
                      : "Try adjusting your search keywords or filter settings."}
                  </p>
                  {earmarkedFunds.length === 0 && (
                    <button
                      type="button"
                      onClick={() => setActiveTab("create")}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-blue hover:bg-brand-blue-dark text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Earmark First Payment</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredFunds.map((fund) => {
                    const isExpanded = Boolean(expandedFundIds[fund.id]);
                    const hasAllocations = fund.allocations && fund.allocations.length > 0;
                    const percentUsed = Math.round((fund.allocatedAmount / (fund.amount || 1)) * 100);

                    return (
                      <div 
                        key={fund.id}
                        className="bg-white border border-slate-200 rounded-xl p-4 shadow-3xs transition-all hover:border-slate-300"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-extrabold text-sm text-slate-900">
                                {fund.sourceName}
                              </h4>

                              {/* Status badge */}
                              {fund.status === "available" && (
                                <span className="inline-flex items-center gap-1 text-[9px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                  Available
                                </span>
                              )}
                              {fund.status === "partially_applied" && (
                                <span className="inline-flex items-center gap-1 text-[9px] bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                  Partially Applied ({percentUsed}%)
                                </span>
                              )}
                              {fund.status === "fully_applied" && (
                                <span className="inline-flex items-center gap-1 text-[9px] bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                                  <CheckCircle2 className="w-2.5 h-2.5 text-slate-500" />
                                  Fully Applied
                                </span>
                              )}

                              <span className="text-[9.5px] font-mono font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-sm">
                                {fund.method}
                              </span>
                            </div>

                            <div className="flex items-center gap-3 text-[10px] text-slate-400">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3 text-slate-400" />
                                Received: <strong className="text-slate-600 font-semibold">{formatDisplayDate(fund.date)}</strong>
                              </span>
                              {fund.email && (
                                <span>• {fund.email}</span>
                              )}
                              {fund.phone && (
                                <span>• {fund.phone}</span>
                              )}
                            </div>

                            {fund.notes && (
                              <p className="text-[11px] text-slate-600 bg-slate-50 border border-slate-150 p-2 rounded-lg mt-1 font-medium">
                                <span className="text-slate-400 uppercase text-[9px] font-bold block">Purpose / Earmark Memo:</span>
                                {fund.notes}
                              </p>
                            )}
                          </div>

                          {/* Financials & Actions */}
                          <div className="flex flex-row sm:flex-col items-end justify-between sm:justify-center gap-2 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100">
                            <div className="text-left sm:text-right">
                              <div className="flex items-baseline gap-1.5">
                                <span className="text-[10px] text-slate-400 uppercase font-bold">Available:</span>
                                <span className="font-mono text-base font-black text-emerald-700">
                                  ${fund.remainingAmount.toLocaleString()}
                                </span>
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono">
                                Total: ${fund.amount.toLocaleString()} • Applied: ${fund.allocatedAmount.toLocaleString()}
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5">
                              {fund.remainingAmount > 0 && (
                                <button
                                  type="button"
                                  onClick={() => handleStartApply(fund)}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-extrabold shadow-xs cursor-pointer transition-all"
                                  title="Apply money to a brother's registration"
                                >
                                  <ArrowRight className="w-3.5 h-3.5" />
                                  <span>Apply to Registration</span>
                                </button>
                              )}

                              {hasAllocations && (
                                <button
                                  type="button"
                                  onClick={() => toggleExpand(fund.id)}
                                  className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                                  title="View applied registration history"
                                >
                                  <span>{fund.allocations.length} Applied</span>
                                  {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                </button>
                              )}

                              {fund.allocatedAmount === 0 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (confirm(`Are you sure you want to delete this earmarked fund record for ${fund.sourceName} ($${fund.amount})?`)) {
                                      onDeleteFund(fund.id);
                                    }
                                  }}
                                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                  title="Delete unallocated fund"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Allocations Breakdown (if expanded) */}
                        {isExpanded && hasAllocations && (
                          <div className="mt-3 pt-3 border-t border-slate-150 space-y-2 bg-slate-50/70 p-3 rounded-xl">
                            <span className="text-[10px] uppercase font-black text-slate-500 tracking-wider block">
                              Allocated to Registrations:
                            </span>
                            <div className="space-y-1.5">
                              {fund.allocations.map((alloc) => (
                                <div 
                                  key={alloc.id}
                                  className="flex items-center justify-between p-2 bg-white border border-slate-200 rounded-lg text-xs"
                                >
                                  <div className="space-y-0.5">
                                    <div className="flex items-center gap-2">
                                      <strong className="text-slate-900 font-bold">{alloc.attendeeName}</strong>
                                      <span className="text-[9.5px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-sm">
                                        {alloc.registrationRef}
                                      </span>
                                    </div>
                                    <div className="text-[10px] text-slate-400">
                                      Applied on {formatDisplayDate(alloc.date)} • {alloc.notes || "No notes"}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono font-black text-emerald-700 text-xs">
                                      +${alloc.amount.toLocaleString()}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (confirm(`Remove this $${alloc.amount} allocation from ${alloc.attendeeName}? The money will be restored to the earmarked fund.`)) {
                                          onDeallocateFund(fund.id, alloc.id);
                                        }
                                      }}
                                      className="p-1 text-slate-400 hover:text-amber-700 hover:bg-amber-50 rounded-md transition-colors cursor-pointer"
                                      title="Revert allocation (refund to earmarked fund)"
                                    >
                                      <RotateCcw className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: CREATE NEW EARMARKED FUND */}
          {activeTab === "create" && (
            <form onSubmit={handleCreateSubmit} className="space-y-5 max-w-xl mx-auto py-2">
              <div className="space-y-1">
                <h4 className="font-display font-black text-base text-slate-900">
                  Earmark Advance / Holding Treasury Money
                </h4>
                <p className="text-xs text-slate-500">
                  Record funds received that are not attached to a specific registration yet. 
                  This money will immediately be added to the total <strong className="text-slate-700">Treasury Payments Collected</strong>.
                </p>
              </div>

              {formError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Amount */}
                <div className="space-y-1">
                  <label className="block text-[10.5px] uppercase font-black tracking-wider text-slate-600">
                    Amount Received ($) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                    <input
                      type="number"
                      step="any"
                      min="1"
                      required
                      placeholder="e.g. 250"
                      value={formAmount}
                      onChange={(e) => setFormAmount(e.target.value)}
                      className="w-full pl-7 pr-3 py-2 text-sm font-mono font-bold bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:border-brand-blue"
                    />
                  </div>
                </div>

                {/* Date */}
                <div className="space-y-1">
                  <label className="block text-[10.5px] uppercase font-black tracking-wider text-slate-600">
                    Date Received *
                  </label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-semibold bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:border-brand-blue"
                  />
                </div>
              </div>

              {/* Source Name */}
              <div className="space-y-1">
                <label className="block text-[10.5px] uppercase font-black tracking-wider text-slate-600">
                  Contributor / Brother Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Bro. Charles Harris, Alumni Chapter, Anonymous Donor"
                  value={formSourceName}
                  onChange={(e) => setFormSourceName(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-semibold bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:border-brand-blue"
                />
              </div>

              {/* Payment Method */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-[10.5px] uppercase font-black tracking-wider text-slate-600">
                    Payment Method *
                  </label>
                  <select
                    value={formMethod}
                    onChange={(e) => setFormMethod(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-semibold bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:border-brand-blue"
                  >
                    <option value="Zelle">Zelle</option>
                    <option value="CashApp">CashApp</option>
                    <option value="Cash">Cash</option>
                    <option value="Check">Check</option>
                    <option value="Bank Wire">Bank Wire / ACH</option>
                    <option value="PayPal">PayPal</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-[10.5px] uppercase font-black tracking-wider text-slate-600">
                    Contact Email (Optional)
                  </label>
                  <input
                    type="email"
                    placeholder="brother@example.com"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-semibold bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:border-brand-blue"
                  />
                </div>
              </div>

              {/* Memo / Notes */}
              <div className="space-y-1">
                <label className="block text-[10.5px] uppercase font-black tracking-wider text-slate-600">
                  Purpose / Earmark Memo (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Deposit for Langston Taylor Alumni Package + Detroit Jacket once confirmed"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:border-brand-blue"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setActiveTab("list")}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-bold cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-brand-blue hover:bg-brand-blue-dark text-white rounded-xl text-xs font-black shadow-md cursor-pointer transition-all disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? "Saving to Treasury..." : "Save Earmarked Fund"}</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: APPLY FUND TO A REGISTRATION */}
          {activeTab === "apply" && selectedFundForApply && (
            <form onSubmit={handleConfirmApply} className="space-y-5 max-w-xl mx-auto py-2">
              <div className="space-y-1">
                <h4 className="font-display font-black text-base text-slate-900">
                  Apply Earmarked Money to Brother's Registration
                </h4>
                <p className="text-xs text-slate-500">
                  Credit funds from <strong className="text-slate-800">{selectedFundForApply.sourceName}</strong> directly 
                  to a brother's registration ledger.
                </p>
              </div>

              {/* Source fund info badge */}
              <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3.5 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-emerald-800 uppercase font-black tracking-wider block">
                    Source Fund Available
                  </span>
                  <p className="text-xs text-emerald-950 font-bold mt-0.5">
                    {selectedFundForApply.sourceName} ({selectedFundForApply.method})
                  </p>
                </div>
                <div className="text-right">
                  <span className="font-mono text-xl font-black text-emerald-700">
                    ${selectedFundForApply.remainingAmount.toLocaleString()}
                  </span>
                  <span className="text-[9.5px] text-emerald-600 block">Remaining Balance</span>
                </div>
              </div>

              {applyError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{applyError}</span>
                </div>
              )}

              {/* Registration Select */}
              <div className="space-y-1">
                <label className="block text-[10.5px] uppercase font-black tracking-wider text-slate-600">
                  Select Registered Brother *
                </label>
                <select
                  required
                  value={targetRegistrationRef}
                  onChange={(e) => {
                    const newRef = e.target.value;
                    setTargetRegistrationRef(newRef);
                    // Pre-fill amount with lesser of fund balance and attendee balance
                    const att = history.find(h => h.ref === newRef);
                    if (att) {
                      const { balanceDue } = getAttendeePaymentStats(att);
                      if (balanceDue > 0) {
                        setApplyAmount(String(Math.min(balanceDue, selectedFundForApply.remainingAmount)));
                      }
                    }
                  }}
                  className="w-full px-3 py-2 text-xs font-semibold bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:border-brand-blue"
                >
                  <option value="">-- Choose an active registration --</option>
                  {history.map((att) => {
                    const { balanceDue, grandTotal, totalPaid } = getAttendeePaymentStats(att);
                    const pkg = PACKAGE_OPTIONS.find(p => p.id === att.formData.selectedPackageId);
                    return (
                      <option key={att.ref} value={att.ref}>
                        {att.formData.fullName} ({att.ref}) • {pkg?.name || "Package"} • Owed: ${balanceDue.toLocaleString()} (Total: ${grandTotal})
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Target Registration Details Summary */}
              {targetRegistrationRef && (() => {
                const target = history.find(h => h.ref === targetRegistrationRef);
                if (!target) return null;
                const { grandTotal, totalPaid, balanceDue, statusLabel, statusColor } = getAttendeePaymentStats(target);
                const pkg = PACKAGE_OPTIONS.find(p => p.id === target.formData.selectedPackageId);

                return (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <strong className="text-slate-900 font-extrabold">{target.formData.fullName}</strong>
                      <span className={`text-[9.5px] font-black uppercase px-2 py-0.5 rounded-full border ${statusColor}`}>
                        {statusLabel}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center pt-1 border-t border-slate-200">
                      <div>
                        <span className="text-[9px] text-slate-400 uppercase font-bold block">Grand Total</span>
                        <span className="font-mono font-black text-slate-800">${grandTotal.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-emerald-600 uppercase font-bold block">Total Paid</span>
                        <span className="font-mono font-black text-emerald-700">${totalPaid.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-red-500 uppercase font-bold block">Balance Due</span>
                        <span className="font-mono font-black text-red-650">${balanceDue.toLocaleString()}</span>
                      </div>
                    </div>

                    {/* Quick fill buttons */}
                    <div className="flex flex-wrap gap-2 pt-1">
                      {balanceDue > 0 && balanceDue <= selectedFundForApply.remainingAmount && (
                        <button
                          type="button"
                          onClick={() => setApplyAmount(String(balanceDue))}
                          className="text-[10px] px-2 py-1 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-md font-bold cursor-pointer transition-colors"
                        >
                          Clear Full Balance Due (${balanceDue})
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setApplyAmount(String(selectedFundForApply.remainingAmount))}
                        className="text-[10px] px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-md font-bold cursor-pointer transition-colors"
                      >
                        Apply Full Fund Balance (${selectedFundForApply.remainingAmount})
                      </button>
                    </div>
                  </div>
                );
              })()}

              {/* Amount & Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-[10.5px] uppercase font-black tracking-wider text-slate-600">
                    Amount to Apply ($) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                    <input
                      type="number"
                      step="any"
                      min="1"
                      max={selectedFundForApply.remainingAmount}
                      required
                      value={applyAmount}
                      onChange={(e) => setApplyAmount(e.target.value)}
                      className="w-full pl-7 pr-3 py-2 text-sm font-mono font-bold bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:border-brand-blue"
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 block">
                    Max: ${selectedFundForApply.remainingAmount.toLocaleString()}
                  </span>
                </div>

                <div className="space-y-1">
                  <label className="block text-[10.5px] uppercase font-black tracking-wider text-slate-600">
                    Transaction Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={applyDate}
                    onChange={(e) => setApplyDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-semibold bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:border-brand-blue"
                  />
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1">
                <label className="block text-[10.5px] uppercase font-black tracking-wider text-slate-600">
                  Ledger Transaction Note
                </label>
                <input
                  type="text"
                  value={applyNotes}
                  onChange={(e) => setApplyNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:border-brand-blue"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setActiveTab("list")}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-bold cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isApplying}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black shadow-md cursor-pointer transition-all disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{isApplying ? "Applying Funds..." : "Confirm & Apply to Registration"}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
