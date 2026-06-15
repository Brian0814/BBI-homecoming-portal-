/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { OrderForm, PACKAGE_OPTIONS } from "../types";
import { User, Phone, Mail, MapPin, Shirt, CheckCircle, Package, Receipt, Ticket, ShoppingBag, Palette } from "lucide-react";

interface ReviewStepProps {
  formData: OrderForm;
  onNavigateToStep: (step: number) => void;
}

export default function ReviewStep({ formData, onNavigateToStep }: ReviewStepProps) {
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

  return (
    <div className="space-y-6" id="review-step-container">
      <div className="border-b border-gray-200 pb-4">
        <h3 className="font-display text-xl font-bold text-gray-900 leading-6">
          Step 4: Review Your Homecoming Package Order
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          Almost done! Please review your submission details and selected premium options before submitting your order to the Beta Beta Iota Chapter.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Module 1: Your Info & Contact */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs relative">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-display font-bold text-gray-900 flex items-center gap-2 text-sm uppercase tracking-wide">
              <User className="w-5 h-5 text-brand-blue" />
              1. Contact Information
            </h4>
            <button
              type="button"
              onClick={() => onNavigateToStep(0)}
              className="text-xs font-semibold text-brand-blue hover:underline"
            >
              Edit
            </button>
          </div>
          <div className="space-y-2.5 text-sm">
            <div>
              <span className="text-gray-400 block text-xs font-medium uppercase tracking-wider">Full Name</span>
              <span className="text-gray-900 font-semibold">{formData.fullName}</span>
            </div>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <div>
                <span className="text-gray-400 block text-xs font-medium uppercase tracking-wider">Email Address</span>
                <span className="text-gray-900 font-medium flex items-center gap-1.5 truncate">
                  <Mail className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" /> {formData.email}
                </span>
              </div>
              <div>
                <span className="text-gray-400 block text-xs font-medium uppercase tracking-wider">Phone Number</span>
                <span className="text-gray-900 font-medium flex items-center gap-1.5 truncate">
                  <Phone className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" /> {formData.phone}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Module 2: Shipping Coordinates */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs relative">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-display font-bold text-gray-900 flex items-center gap-2 text-sm uppercase tracking-wide">
              <MapPin className="w-5 h-5 text-brand-blue" />
              2. Shipping Address
            </h4>
            <button
              type="button"
              onClick={() => onNavigateToStep(0)}
              className="text-xs font-semibold text-brand-blue hover:underline"
            >
              Edit
            </button>
          </div>
          <div className="space-y-3 text-sm">
            <div>
              <span className="text-gray-400 block text-xs font-medium uppercase tracking-wider">Mailing Address</span>
              <p className="text-gray-900 mt-1 font-semibold leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100">
                {formData.shippingAddress.street}
                <br />
                {formData.shippingAddress.city}, {formData.shippingAddress.state} {formData.shippingAddress.zipCode}
              </p>
            </div>
            <p className="text-[10px] text-amber-600 bg-amber-50 p-1.5 rounded-sm border border-amber-100 flex items-center gap-1.5 font-medium">
              ⚠️ Shipping is non-reroutable once packaged; double-check zip code accuracy!
            </p>
          </div>
        </div>

        {/* Module 3: Custom Details */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs relative">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-display font-bold text-gray-900 flex items-center gap-2 text-sm uppercase tracking-wide">
              <Shirt className="w-5 h-5 text-brand-blue" />
              3. Customized Sizing & Notes
            </h4>
            <button
              type="button"
              onClick={() => onNavigateToStep(1)}
              className="text-xs font-semibold text-brand-blue hover:underline"
            >
              Edit
            </button>
          </div>
          <div className="space-y-3.5 text-sm">
            <div>
              <span className="text-gray-400 block text-xs font-medium uppercase tracking-wider mb-1">Package T-Shirt Size</span>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-extrabold uppercase bg-blue-100 text-brand-blue border border-blue-200">
                Size {formData.shirtSize}
              </span>
            </div>
            <div>
              <span className="text-gray-400 block text-xs font-medium uppercase tracking-wider mb-1">Special Committee Requests</span>
              <div className="bg-slate-50 border border-slate-100 p-3 rounded-lg text-xs leading-relaxed text-gray-700 min-h-[50px]">
                {formData.specialRequests ? (
                  formData.specialRequests
                ) : (
                  <span className="text-gray-400 italic">No special instructions or requests provided.</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Module 4: Selected Package Detail */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs relative">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-display font-bold text-gray-900 flex items-center gap-2 text-sm uppercase tracking-wide">
              <Package className="w-5 h-5 text-brand-blue" />
              4. Homecoming Package Box Category
            </h4>
            <button
              type="button"
              onClick={() => onNavigateToStep(2)}
              className="text-xs font-semibold text-brand-blue hover:underline"
            >
              Edit
            </button>
          </div>

          {selectedPackage ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h5 className="font-display font-extrabold text-blue-900 text-base leading-tight">
                    {selectedPackage.name}
                  </h5>
                  <p className="text-xs text-brand-blue/70 font-semibold mt-0.5">
                    Official 2026 Homecoming Registrant Box
                  </p>
                </div>
                <div className="text-right">
                  <span className="font-mono text-base font-extrabold text-brand-blue bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-md">
                    ${selectedPackage.price}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-blue-900/60 block text-[10px] font-bold uppercase tracking-wider mb-1.5">
                  Core Package Box Items ({selectedPackage.items.length})
                </span>
                <div className="grid grid-cols-2 gap-x-2 gap-y-1 bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-[11px] text-gray-705">
                  {selectedPackage.items.map((it, idx) => (
                    <div key={idx} className="flex items-center gap-1.5 truncate">
                      <CheckCircle className="w-3.5 h-3.5 text-brand-blue/75 flex-shrink-0" />
                      <span className="truncate">{it}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-sm text-red-600 font-semibold">No package selected!</p>
              <button
                type="button"
                onClick={() => onNavigateToStep(2)}
                className="mt-2 text-xs text-brand-blue hover:underline"
              >
                Choose package now
              </button>
            </div>
          )}
        </div>
      </div>

      {/* CARHARTT STYLE JACKET DETAILS SUMMARY BLOCK */}
      {formData.addDetroitJacket && (
        <div className="bg-slate-900 text-white rounded-xl border border-slate-800 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-2.5">
            <h4 className="font-display font-extrabold text-sm uppercase tracking-wide text-brand-blue-light flex items-center gap-2">
              <Palette className="w-4.5 h-4.5" />
              Carhartt Style Jacket Customization Summary
            </h4>
            <button
              type="button"
              onClick={() => onNavigateToStep(1)}
              className="text-xs font-semibold text-brand-blue-light hover:underline"
            >
              Modify Customization
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-xs">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-widest mb-0.5">Jacket Size</span>
              <span className="text-white font-extrabold">{formData.jacketSize || <span className="text-red-400">Missing</span>}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-widest mb-0.5">Crossing Year</span>
              <span className="text-white font-extrabold">{formData.jacketCrossingYear || <span className="text-red-400">Missing</span>}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-widest mb-0.5">Line Name</span>
              <span className="text-white font-extrabold">{formData.jacketLineName || <span className="text-red-400">Missing</span>}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-widest mb-0.5">Entire Line Name</span>
              <span className="text-white font-extrabold">{formData.jacketEntireLineName || <span className="text-red-400">Missing</span>}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-widest mb-0.5">Line Number</span>
              <span className="text-white font-extrabold">#{formData.jacketLineNumber || <span className="text-red-400">Missing</span>}</span>
            </div>
          </div>
        </div>
      )}

      {/* ITEMIZED COMBINED REJECT checkout RECEIPT */}
      <div className="bg-slate-50 border border-gray-250 rounded-xl p-5 shadow-inner">
        <h4 className="font-display font-bold text-gray-900 flex items-center gap-2 text-xs uppercase tracking-wider mb-4 border-b border-gray-200 pb-2.5">
          <Receipt className="w-4.5 h-4.5 text-gray-400" strokeWidth={2.5} />
          Itemized Price & Deposit Breakdown
        </h4>

        <div className="space-y-3 text-xs text-gray-600 font-medium">
          {/* Base package item */}
          <div className="flex justify-between items-center">
            <span>{selectedPackage?.name || "Selected Package"}</span>
            <span className="font-mono font-bold text-gray-800">${basePackagePrice}</span>
          </div>

          {/* Football ticket item */}
          {formData.addFootballTicket && (
            <div className="flex justify-between items-center text-emerald-850 bg-emerald-50/60 px-2.5 py-2 rounded-lg border border-emerald-100">
              <span className="flex items-center gap-1.5 font-semibold text-[11px]">
                <Ticket className="w-3.5 h-3.5 text-emerald-600" /> CCU Football Game RSVP (Purchased Directly)
              </span>
              <span className="font-mono font-bold">$0 (Ticket Range $37 - $57)</span>
            </div>
          )}

          {/* Carhartt Style Jacket item */}
          {formData.addDetroitJacket && (
            <div className="flex justify-between items-center text-blue-800 bg-blue-50/50 px-2 py-1.5 rounded-md border border-blue-100/50">
              <span className="flex items-center gap-1.5 text-[11px] font-semibold">
                <ShoppingBag className="w-3.5 h-3.5 text-blue-600" /> Optional Add-On: Carhartt Style Jacket (Qty 1)
              </span>
              <span className="font-mono font-bold">+$135</span>
            </div>
          )}

          <div className="pt-3 border-t border-gray-200 flex justify-between items-center text-sm font-bold text-gray-950">
            <span>Overall Order Value Total</span>
            <span className="font-mono text-base text-gray-900">${grandTotal}</span>
          </div>

          {/* New Deposit Due Highlight Box */}
          <div className="pt-4 mt-2 border-t border-dashed border-gray-300 bg-blue-50/70 p-4 rounded-xl border border-blue-105 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <span className="text-[10px] text-brand-blue font-black uppercase tracking-wider block">
                Required Deposit Due July 19, 2026
              </span>
              <div className="text-[11px] text-gray-700 mt-1.5 space-y-1">
                <p className="font-medium text-gray-600">Please submit your deposit directly to:</p>
                <div className="bg-white/80 p-2 rounded-lg border border-blue-100 space-y-1.5 max-w-sm">
                  <div className="flex items-center justify-between gap-2.5">
                    <span className="font-bold text-gray-700">Brian Johnson Zelle:</span>
                    <span className="font-mono font-black text-brand-blue">8439021914</span>
                  </div>
                  <div className="flex items-center justify-between gap-2.5 border-t border-gray-100 pt-1.5">
                    <span className="font-bold text-gray-700">Brian Johnson CashApp:</span>
                    <span className="font-mono font-black text-brand-blue">$Brian191401</span>
                  </div>
                </div>
              </div>
              <div className="mt-3.5 flex flex-wrap gap-2 text-[10px] text-gray-450 font-bold">
                <span>• Homecoming Package Spot: $100</span>
                {formData.addDetroitJacket && <span>• Custom Jacket Order: +$70</span>}
              </div>
            </div>
            <div className="text-right sm:self-center">
              <span className="text-[10px] text-gray-450 font-bold block uppercase tracking-wide">
                Initial Deposit Total
              </span>
              <span className="font-mono text-xl sm:text-2xl font-black text-brand-blue block">
                ${totalDepositDue}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
