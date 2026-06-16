/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { OrderForm, PACKAGE_OPTIONS } from "../types";
import { CheckCircle2, Copy, MapPin, Phone, Mail, Clock, Printer, Ticket, ShoppingBag, Receipt, Calendar } from "lucide-react";
import BBIChapterLogo from "./BBIChapterLogo";
import { getPaymentMilestones } from "../lib/paymentUtils";

interface ConfirmationStepProps {
  formData: OrderForm;
  orderRefNumber: string;
  onReset: () => void;
}

export default function ConfirmationStep({
  formData,
  orderRefNumber,
  onReset
}: ConfirmationStepProps) {
  const selectedPackage = PACKAGE_OPTIONS.find((p) => p.id === formData.selectedPackageId);

  // Math totals calculation
  const basePackagePrice = selectedPackage?.price || 0;
  const footballTicketPrice = 0; // Purchased directly via the Coastal Carolina Football Ticket Office website ($37-$57)
  const detroitJacketPrice = formData.addDetroitJacket ? 135 : 0;
  const grandTotal = basePackagePrice + footballTicketPrice + detroitJacketPrice;

  // Deposit calculations
  const packageDeposit = selectedPackage ? 100 : 0;
  const jacketDeposit = formData.addDetroitJacket ? 70 : 0;
  const totalDepositDue = packageDeposit + jacketDeposit;
  const remainingBalance = grandTotal - totalDepositDue;

  // Simple routine to handle print dialog safely
  const handlePrint = () => {
    window.print();
  };

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(orderRefNumber);
    alert(`Copied Order Reference Number ${orderRefNumber} to clipboard!`);
  };

  return (
    <div className="space-y-8 animate-fade-in" id="confirmation-container">
      {/* Decorative Top Stamp */}
      <div className="text-center pt-4">
        <div className="inline-flex items-center justify-center relative p-5 bg-blue-50 rounded-full border border-blue-100">
          <BBIChapterLogo size={140} className="relative z-10 filter drop-shadow-md" />
          <div className="absolute inset-0 bg-blue-100/40 rounded-full animate-ping scale-95 opacity-50 pointer-events-none" />
        </div>
      </div>

      {/* Primary Success Header */}
      <div className="text-center max-w-xl mx-auto space-y-2">
        <div className="inline-flex items-center gap-1.5 bg-emerald-100 border border-emerald-200 px-4 py-1.5 rounded-full text-emerald-800 text-xs font-black uppercase tracking-wider mb-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          Order Successfully Placed
        </div>
        <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
          Thank You, {formData.fullName.split(" ")[0]}!
        </h2>
        <p className="text-sm text-gray-500 leading-relaxed">
          Your Homecoming Package registration is confirmed. Our committee has been notified and you are now registered for Beta Beta Iota Chapter Homecoming 2026.
        </p>
      </div>

      {/* Monospaced Order Reference Card */}
      <div className="max-w-md mx-auto bg-slate-50 border border-slate-200 rounded-2xl p-6 text-center shadow-xs">
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">
          Your Order Reference Number
        </span>
        <div className="flex items-center justify-center gap-2 mt-1.5">
          <code className="font-mono text-lg sm:text-xl font-black text-brand-blue tracking-widest bg-blue-50/50 px-4 py-2 rounded-lg border border-brand-blue/20">
            {orderRefNumber}
          </code>
          <button
            type="button"
            onClick={handleCopyToClipboard}
            title="Copy reference number to clipboard"
            className="p-2 text-gray-400 hover:text-brand-blue hover:bg-white rounded-lg border border-transparent hover:border-gray-200 transition-all cursor-pointer"
          >
            <Copy className="w-4 h-4" />
          </button>
        </div>
        <p className="text-[11px] text-gray-400 mt-3 font-medium col-span-full">
          Prepare this reference number for package collection on-campus and check-in at tailgate environments.
        </p>
      </div>

      <div className="border-t border-gray-100 pt-6">
        <h3 className="font-display text-base font-bold text-gray-900 mb-4">
          Order Confirmation Details
        </h3>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 text-sm text-gray-600">
          {/* Box 1: Package Itemized List */}
          <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-4 shadow-2xs">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs text-brand-blue font-bold uppercase tracking-wider">
                  Registration Category
                </span>
                <h4 className="font-display font-extrabold text-gray-900 text-base leading-snug mt-0.5">
                  {selectedPackage?.name}
                </h4>
              </div>
              <span className="font-mono text-lg font-black text-brand-blue block">
                ${basePackagePrice}
              </span>
            </div>

            <div className="border-t border-gray-100 pt-3">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-2">
                Order Content Includes
              </span>
              <ul className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs text-gray-500">
                {selectedPackage?.items.map((item, idx) => (
                  <li key={idx} className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-brand-blue/60 rounded-full flex-shrink-0" />
                    <span className="truncate" title={item}>{item}</span>
                  </li>
                ))}
              </ul>
              {selectedPackage?.note && (
                <p className="text-[10px] text-amber-700 font-medium mt-2.5">
                  * Note: {selectedPackage.note}
                </p>
              )}
            </div>

            {/* Add Ons segment */}
            <div className="border-t border-gray-100 pt-3">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-2">
                Add Ons
              </span>
              {!formData.addFootballTicket && !formData.addDetroitJacket ? (
                <span className="text-xs text-gray-400 italic">None selected</span>
              ) : (
                <ul className="space-y-1.5 text-xs text-slate-700 font-semibold">
                  {formData.addFootballTicket && (
                    <li className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full flex-shrink-0" />
                        Football Game Ticket RSVP
                      </span>
                      <span className="font-mono text-emerald-600 font-black">$0</span>
                    </li>
                  )}
                  {formData.addDetroitJacket && (
                    <li className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 bg-blue-500 rounded-full flex-shrink-0" />
                        Carhartt Style Jacket ({formData.jacketSize})
                      </span>
                      <span className="font-mono text-brand-blue font-black">+$135</span>
                    </li>
                  )}
                </ul>
              )}
            </div>
          </div>

          {/* Box 2: Fulfillment & Coordination Profile */}
          <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-4 shadow-2xs">
            <div>
              <span className="text-xs text-gray-400 font-bold uppercase tracking-wider block mb-1">
                Core T-Shirt Size
              </span>
              <span className="inline-flex items-center justify-center text-xs font-black bg-blue-100 text-brand-blue border border-blue-200 px-3 py-1 rounded-sm">
                SIZE {formData.shirtSize}
              </span>
            </div>

            <div className="border-t border-gray-100 pt-3 space-y-3.5">
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                  Deliver To (Shipping Address)
                </span>
                <p className="text-xs text-gray-700 leading-relaxed font-semibold">
                  {formData.shippingAddress.street}
                  <br />
                  {formData.shippingAddress.city}, {formData.shippingAddress.state} {formData.shippingAddress.zipCode}
                </p>
              </div>

              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                  Contact Coordinates
                </span>
                <div className="text-xs text-gray-500 space-y-0.5">
                  <p className="font-semibold text-gray-700">{formData.fullName}</p>
                  <p className="flex items-center gap-1"><Mail className="w-3 h-3 text-gray-400" /> {formData.email}</p>
                  <p className="flex items-center gap-1"><Phone className="w-3 h-3 text-gray-400" /> {formData.phone}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CARHARTT STYLE JACKET DETAILS CONFIRMATION SUMMARY BLOCK */}
      {formData.addDetroitJacket && (
        <div className="bg-slate-900 text-white rounded-xl border border-slate-800 p-5 shadow-xs">
          <div className="border-b border-slate-800 pb-2.5 mb-3">
            <h4 className="font-display font-extrabold text-xs uppercase tracking-wider text-brand-blue-light flex items-center gap-2">
              <ShoppingBag className="w-4 h-4" />
              Carhartt Style Jacket Customization Confirmations
            </h4>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-xs font-medium">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-widest mb-0.5">Jacket Size</span>
              <span className="text-white font-extrabold">{formData.jacketSize}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-widest mb-0.5">Crossing Year</span>
              <span className="text-white font-extrabold">{formData.jacketCrossingYear}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-widest mb-0.5">Line Name</span>
              <span className="text-white font-extrabold">{formData.jacketLineName}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-widest mb-0.5">Entire Line Name</span>
              <span className="text-white font-extrabold">{formData.jacketEntireLineName}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-widest mb-0.5">Line Number</span>
              <span className="text-white font-extrabold">#{formData.jacketLineNumber}</span>
            </div>
          </div>
        </div>
      )}

      {/* FINAL INVOICE STATEMENT */}
      <div className="bg-slate-50 border border-gray-250 rounded-xl p-5 max-w-2xl mx-auto shadow-inner">
        <h4 className="font-display font-bold text-gray-900 flex items-center gap-2 text-xs uppercase tracking-wider mb-4 border-b border-gray-200 pb-2.5">
          <Receipt className="w-4.5 h-4.5 text-gray-400" strokeWidth={2.5} />
          Receipt Summary Invoice & Required Deposit
        </h4>

        <div className="space-y-3 text-xs text-gray-650 font-medium">
          {/* Base package item */}
          <div className="flex justify-between items-center">
            <span>{selectedPackage?.name}</span>
            <span className="font-mono text-gray-900 font-bold">${basePackagePrice}</span>
          </div>

          {/* Football ticket item */}
          {formData.addFootballTicket && (
            <div className="flex justify-between items-center text-emerald-850 bg-emerald-50/50 px-2.5 py-1.5 rounded-lg border border-emerald-100/50">
              <span className="flex items-center gap-1.5">
                <Ticket className="w-3.5 h-3.5 text-emerald-600" /> CCU Football Game Ticket RSVP (Direct purchase)
              </span>
              <span className="font-mono font-bold">$0 (External Buy Range $37 - $57)</span>
            </div>
          )}

          {/* Carhartt Style Jacket item */}
          {formData.addDetroitJacket && (
            <div className="flex justify-between items-center text-blue-800">
              <span className="flex items-center gap-1.5 font-semibold">
                <ShoppingBag className="w-3.5 h-3.5 text-blue-600" /> Carhartt Style Jacket (Custom embroidered)
              </span>
              <span className="font-mono font-bold">+$135</span>
            </div>
          )}

          <div className="pt-3.5 border-t border-gray-200 flex justify-between items-center text-sm font-bold text-gray-950">
            <span>Overall Order Value Total</span>
            <span className="font-mono text-base text-gray-900">${grandTotal}</span>
          </div>

          {/* Deposit & Balance Milestone Timelines */}
          <div className="pt-4 mt-2 border-t border-dashed border-gray-300 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Milestone 1: July 19 Deposit */}
              <div className="bg-blue-50/80 border border-blue-200 rounded-xl p-4 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] text-brand-blue font-black uppercase tracking-widest block mb-1">
                    🟢 REQUIRED DEPOSIT (OWED BY JULY 19, 2026)
                  </span>
                  <p className="text-xs text-gray-500 leading-relaxed font-semibold">
                    This secures your official homecoming package slot and any custom garment tailoring order.
                  </p>
                </div>
                <div className="mt-4 flex items-baseline justify-between border-t border-blue-105 pt-2">
                  <span className="text-[11.5px] font-bold text-gray-700">Deposit Due:</span>
                  <span className="font-mono text-2xl font-black text-brand-blue">
                    ${totalDepositDue}
                  </span>
                </div>
              </div>

              {/* Milestone 2: Sept 4 Final Balance */}
              <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] text-amber-800 font-black uppercase tracking-widest block mb-1">
                    ⏰ REMAINING BALANCE (DUE BY SEPTEMBER 4, 2026)
                  </span>
                  <p className="text-xs text-gray-500 leading-relaxed font-semibold">
                    The outstanding rest of your registration checkout total must be cleared in full by the final cutoff.
                  </p>
                </div>
                <div className="mt-4 flex items-baseline justify-between border-t border-amber-100/70 pt-2">
                  <span className="text-[11.5px] font-bold text-gray-700">Balance Owed:</span>
                  <span className="font-mono text-2xl font-black text-amber-700">
                    ${remainingBalance}
                  </span>
                </div>
              </div>
            </div>

            {/* Detailed Installment Payment Schedule */}
            <div className="bg-white border border-gray-200 rounded-xl p-4.5 space-y-3.5 shadow-2xs">
              <div className="flex items-center gap-2 border-b border-gray-100 pb-2.5">
                <Calendar className="w-4 h-4 text-brand-blue" />
                <span className="text-[10px] text-gray-500 font-extrabold uppercase tracking-widest block">
                  Detailed Treasury Installment Schedule
                </span>
                <span className="ml-auto text-[9px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-black">
                  Ref: {selectedPackage?.id ? selectedPackage.name.slice(0, 1) + " Package" : ""}
                </span>
              </div>
              
              <p className="text-[11px] text-gray-500 leading-normal">
                To simplify preparation, the committee has mapped out the official installment schedule steps. All payments sent should align with these dates:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mt-2">
                {getPaymentMilestones(formData.selectedPackageId, formData.addDetroitJacket).map((m, idx) => (
                  <div 
                    key={idx} 
                    className={`p-3 rounded-lg border flex flex-col justify-between transition-all ${
                      m.amount === 0 
                        ? "bg-slate-50/50 border-gray-150" 
                        : "bg-linear-to-b from-slate-50 to-white hover:to-slate-50 border-gray-200 hover:border-gray-350 hover:shadow-2xs"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between border-b border-gray-100/60 pb-1.5 mb-2">
                        <span className="font-display font-black text-xs text-slate-900">{m.date}</span>
                        <span className={`font-mono text-xs font-black ${m.amount === 0 ? "text-emerald-600" : "text-brand-blue"}`}>
                          ${m.amount}
                        </span>
                      </div>
                      
                      {m.amount === 0 ? (
                        <div className="space-y-1 py-1">
                          <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-xs uppercase tracking-wider inline-block">
                            Cleared & Fully Settled
                          </span>
                          <p className="text-[10px] text-gray-400">No installment due on this date for your selected package tier.</p>
                        </div>
                      ) : (
                        <div className="space-y-1 py-1">
                          <span className="text-[9px] font-bold text-brand-blue bg-blue-550/10 text-brand-blue px-1.5 py-0.5 rounded-xs uppercase tracking-wider inline-block">
                            Overall Amount Due
                          </span>
                          <p className="text-[10px] text-gray-400 leading-normal">
                            Multi-installment overall payment due on this date.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Payment Coordinates instructions */}
            <div className="bg-white/95 p-4 rounded-xl border border-gray-200 space-y-3 shadow-3xs">
              <span className="text-[10px] text-gray-400 font-extrabold uppercase tracking-widest block">
                How to Submit Payments
              </span>
              <p className="text-[11px] text-gray-500 leading-normal">
                All deposits and final payments must be sent directly to our chapter treasury via payment coordinates below. Please include your **Name** and reference code <code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-[10px] text-brand-blue font-bold">{orderRefNumber}</code> in the transfer memo:
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-slate-50 border border-gray-200 p-3 rounded-lg flex items-center justify-between">
                  <span className="font-extrabold text-xs text-gray-750">Zelle Transfer:</span>
                  <span className="font-mono font-black text-xs text-brand-blue">8439021914</span>
                </div>
                <div className="bg-slate-50 border border-gray-200 p-3 rounded-lg flex items-center justify-between">
                  <span className="font-extrabold text-xs text-gray-750">CashApp Handle:</span>
                  <span className="font-mono font-black text-xs text-brand-blue">$Brian191401</span>
                </div>
              </div>

              {/* Deposit Sub-breakdown items */}
              <div className="pt-2 text-[10px] text-gray-400 font-bold uppercase tracking-wider flex flex-wrap gap-x-4 border-t border-gray-100">
                <span>• Homecoming Package Spot Deposit: $100</span>
                {formData.addDetroitJacket && <span>• Custom Jacket Order Deposit: $70</span>}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Special Notice Bar - removed Fulfillment Schedule */}

      {/* Action Buttons */}
      <div className="pt-6 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-center gap-3">
        <button
          type="button"
          onClick={handlePrint}
          className="w-full sm:w-auto px-6 py-3 rounded-lg border border-gray-300 bg-white text-gray-700 font-bold text-sm shadow-xs hover:bg-gray-50 transition-all flex items-center justify-center gap-2 cursor-pointer touch-manipulation min-h-[48px]"
        >
          <Printer className="w-4 h-4 text-gray-400" />
          Print Confirmation Receipt
        </button>
        <button
          type="button"
          onClick={onReset}
          className="w-full sm:w-auto px-8 py-3 rounded-lg bg-brand-blue text-white font-bold text-sm shadow-md hover:bg-brand-blue-dark hover:shadow-lg transition-all flex items-center justify-center gap-1 cursor-pointer touch-manipulation min-h-[48px]"
        >
          Order Another Package
        </button>
      </div>

      {/* Signature Seal Credits */}
      <div className="text-center text-xs text-gray-400 pt-4 pb-2 border-t border-gray-100 max-w-sm mx-auto leading-relaxed">
        <strong>Beta Beta Iota Chapter</strong>
        <br />
        Phi Beta Sigma Fraternity, Inc. • Est. 2004
        <br />
        <span className="font-mono text-[10px]">Beta Beta Iota Homecoming Portal • Brotherhood • Scholarship • Service</span>
      </div>
    </div>
  );
}
