/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { OrderForm, SHIRT_SIZES } from "../types";
import { Ticket, ShieldAlert, Sparkles, AlertCircle, ShoppingBag, Check } from "lucide-react";

interface DetailsStepProps {
  formData: OrderForm;
  onChange: (fields: Partial<OrderForm>) => void;
  errors: Record<string, string>;
}

export default function DetailsStep({
  formData,
  onChange,
  errors
}: DetailsStepProps) {
  return (
    <div className="space-y-8" id="details-step-container">
      <div className="border-b border-gray-200 pb-4">
        <h3 className="font-display text-xl font-bold text-gray-900 leading-6">
          Step 2: Customization & Optional Add-Ons
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          Provide your apparel size, choose premium homecoming add-ons, and supply custom embroidery specifications if applicable.
        </p>
      </div>

      <div className="space-y-6">
        {/* Core Shirt Size Selector */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 shadow-xs">
          <label htmlFor="shirtSize" className="block text-sm font-extrabold text-slate-900 uppercase tracking-widest text-[11px] mb-1">
            Shirt Size Selection {formData.selectedPackageId === "jacket-only" ? (
              <span className="text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-sm normal-case font-semibold text-[9.5px] tracking-normal ml-1">Optional (Not included in Jacket-Only orders)</span>
            ) : (
              <span className="text-red-500">*</span>
            )}
          </label>
          <p className="text-xs text-slate-500 mb-3.5 leading-relaxed">
            {formData.selectedPackageId === "jacket-only"
              ? "You've selected Jacket-Only. A package shirt is not included in this order category."
              : "The selected size will apply directly to the box shirt included in your core homecoming bag package."}
          </p>
          <div className="relative rounded-md shadow-xs max-w-xs">
            <select
              id="shirtSize"
              name="shirtSize"
              value={formData.shirtSize}
              onChange={(e) => onChange({ shirtSize: e.target.value })}
              className={`block w-full rounded-lg border px-4 py-3 text-gray-900 shadow-xs focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue focus:outline-hidden sm:text-sm ${
                errors.shirtSize ? "border-red-500 focus:ring-red-200" : "border-gray-300"
              }`}
            >
              <option value="">Select a shirt size...</option>
              {SHIRT_SIZES.map((sz) => (
                <option key={sz} value={sz}>
                  Size {sz}
                </option>
              ))}
            </select>
            {errors.shirtSize && (
              <p className="mt-1.5 text-xs text-red-600 font-medium flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                {errors.shirtSize}
              </p>
            )}
          </div>
        </div>

        {/* --- PREMIUM OPTIONAL ADD-ONS SECTION --- */}
        <div>
          <h4 className="font-display font-bold text-gray-950 text-sm uppercase tracking-wider mb-3">
            Premium Optional Add-Ons
          </h4>
          <p className="text-xs text-gray-500 mb-4">
            Select additional custom gear or event slots. These will be added to your order aggregate checkout total.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Football Ticket Option Card */}
            <label
              htmlFor="addFootballTicket"
              className={`relative flex items-start gap-4 rounded-xl border p-4 shadow-xs cursor-pointer transition-all select-none hover:bg-slate-50 ${
                formData.addFootballTicket
                  ? "border-brand-blue bg-blue-50/40 ring-2 ring-brand-blue/10"
                  : "border-gray-200 bg-white"
              }`}
            >
              <div className="flex h-5 items-center">
                <input
                  id="addFootballTicket"
                  name="addFootballTicket"
                  type="checkbox"
                  checked={formData.addFootballTicket}
                  onChange={(e) => onChange({ addFootballTicket: e.target.checked })}
                  className="h-4.5 w-4.5 rounded-sm border-gray-300 text-brand-blue focus:ring-brand-blue"
                />
              </div>
              <div className="flex-1 text-sm/6">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-gray-900 flex items-center gap-1.5">
                    <Ticket className="w-4 h-4 text-brand-blue" /> CCU Football Game RSVP
                  </span>
                  <span className="font-mono font-black text-brand-blue text-[11px] bg-white border border-gray-200 px-2 py-0.5 rounded-md shadow-2xs">
                    $0 (External)
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                  Homecoming game tickets range from $37 - $57. Checking this confirms you plan to purchase yours directly via the Coastal Carolina Football Ticket Office.
                </p>
              </div>
            </label>

            {/* Carhartt Style Jacket Option Card */}
            <label
              htmlFor="addDetroitJacket"
              className={`relative flex items-start gap-4 rounded-xl border p-4 shadow-xs transition-all select-none hover:bg-slate-50 ${
                formData.selectedPackageId === "jacket-only" ? "cursor-not-allowed" : "cursor-pointer"
              } ${
                formData.addDetroitJacket
                  ? "border-brand-blue bg-blue-50/40 ring-2 ring-brand-blue/10"
                  : "border-gray-200 bg-white"
              }`}
            >
              <div className="flex h-5 items-center">
                <input
                  id="addDetroitJacket"
                  name="addDetroitJacket"
                  type="checkbox"
                  checked={formData.addDetroitJacket}
                  disabled={formData.selectedPackageId === "jacket-only"}
                  onChange={(e) => onChange({ addDetroitJacket: e.target.checked })}
                  className="h-4.5 w-4.5 rounded-sm border-gray-300 text-brand-blue focus:ring-brand-blue disabled:opacity-75 disabled:cursor-not-allowed"
                />
              </div>
              <div className="flex-1 text-sm/6">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-gray-900 flex items-center gap-1.5">
                    <ShoppingBag className="w-4 h-4 text-brand-blue" /> Carhartt Style Jacket
                  </span>
                  <span className="font-mono font-black text-brand-blue text-[13px] bg-white border border-gray-200 px-2 py-0.5 rounded-md shadow-2xs">
                    {formData.selectedPackageId === "jacket-only" ? "$135 (Included)" : "+$135"}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                  {formData.selectedPackageId === "jacket-only"
                    ? "Premium heavyweight wool with chenille embroidery. Required and locked because you selected the Jacket Only package."
                    : "Premium heavyweight wool with genuine chenille embroidery details. Requires specific crossing details on next section."}
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* --- CARHARTT STYLE JACKET DETAILS PANEL (EXPANDED DYNAMICALLY) --- */}
        {formData.addDetroitJacket && (
          <div className="bg-white rounded-2xl border border-gray-250 p-5 sm:p-6 text-gray-900 space-y-6 shadow-md transition-all duration-300">
            {/* Header with Sparkles & Pricing alignment */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-gray-200 pb-3">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-brand-blue/10 rounded-md text-brand-blue flex-shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h5 className="font-display font-extrabold text-sm uppercase tracking-wide text-gray-900">
                    Carhartt Style Jacket Personalizer
                  </h5>
                  <p className="text-xs text-gray-500">
                    Fill in your custom crossing and lineage attributes below to tailor your embroidery.
                  </p>
                </div>
              </div>
              <div className="text-right bg-blue-50/50 border border-blue-100 rounded-lg p-2 text-xs self-end sm:self-center">
                <span className="text-[10px] uppercase font-black tracking-wider text-brand-blue block">Jacket Price Detail</span>
                <span className="font-mono text-sm font-black text-brand-blue block">$135 per jacket</span>
                <span className="text-[9px] font-semibold text-blue-700 block mt-0.5">$70 Jacket Deposit Due July 19</span>
              </div>
            </div>

            {/* Flyer Branding Integration Banner */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-gray-50 p-3 sm:p-4 rounded-xl border border-gray-200 text-center">
              <div className="space-y-1">
                <span className="text-base text-brand-blue">🧥</span>
                <span className="block text-[10px] font-extrabold uppercase tracking-wide text-gray-800">Carhartt Style</span>
                <span className="block text-[9px] text-gray-500 leading-tight">Premium Canvas Quality</span>
              </div>
              <div className="space-y-1 border-l border-gray-200">
                <span className="text-base text-brand-blue">🪡</span>
                <span className="block text-[10px] font-extrabold uppercase tracking-wide text-gray-800 font-sans">Detailed Stitch</span>
                <span className="block text-[9px] text-gray-500 leading-tight">Authentic Chenille Patches</span>
              </div>
              <div className="space-y-1 border-l border-gray-200">
                <span className="text-base text-brand-blue">🛡️</span>
                <span className="block text-[10px] font-extrabold uppercase tracking-wide text-gray-800">Built to Last</span>
                <span className="block text-[9px] text-gray-500 leading-tight">Made to Represent BBI</span>
              </div>
              <div className="space-y-1 border-l border-gray-200">
                <span className="text-base text-brand-blue">🌴</span>
                <span className="block text-[10px] font-extrabold uppercase tracking-wide text-gray-800">At The Beach</span>
                <span className="block text-[9px] text-gray-500 leading-tight font-sans">Worn with Proud Pride</span>
              </div>
            </div>

            {/* Slogan */}
            <div className="bg-brand-blue text-white rounded-lg px-3 py-1.5 text-center text-[10px] font-black uppercase tracking-wider">
              Secure Yours for Homecoming 2026! ★ Limited Quantity | Custom Order | Ships Directly to You
            </div>

            {/* Form Controls in clean columns */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-gray-750 text-xs">
              {/* Jacket Size */}
              <div>
                <label htmlFor="jacketSize" className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1">
                  Jacket Size (Regular Fit) <span className="text-red-500">*</span>
                </label>
                <select
                  id="jacketSize"
                  name="jacketSize"
                  value={formData.jacketSize}
                  onChange={(e) => onChange({ jacketSize: e.target.value })}
                  className={`block w-full rounded-lg border bg-white border-gray-300 px-4 py-2.5 text-gray-900 shadow-xs focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue focus:outline-hidden text-xs ${
                    errors.jacketSize ? "border-red-500 focus:ring-red-200" : "border-gray-300"
                  }`}
                >
                  <option value="">Select a jacket size...</option>
                  {SHIRT_SIZES.map((sz) => (
                    <option key={sz} value={sz}>
                      Size {sz} (Regular Fit)
                    </option>
                  ))}
                </select>
                {errors.jacketSize && (
                  <p className="mt-1 text-[11px] text-red-500 flex items-center gap-1 font-medium">
                    <AlertCircle className="w-3.5 h-3.5" /> {errors.jacketSize}
                  </p>
                )}
              </div>

              {/* Crossing Year */}
              <div>
                <label htmlFor="jacketCrossingYear" className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1">
                  Crossing Year <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="jacketCrossingYear"
                  name="jacketCrossingYear"
                  placeholder="e.g. SPR 26 (or FALL 04)"
                  maxLength={10}
                  value={formData.jacketCrossingYear}
                  onChange={(e) => onChange({ jacketCrossingYear: e.target.value })}
                  className={`block w-full rounded-lg border bg-white border-gray-300 px-4 py-2.5 text-gray-900 shadow-xs focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue focus:outline-hidden text-xs ${
                    errors.jacketCrossingYear ? "border-red-500 focus:ring-red-200" : "border-gray-300"
                  }`}
                />
                {errors.jacketCrossingYear && (
                  <p className="mt-1 text-[11px] text-red-500 flex items-center gap-1 font-medium">
                    <AlertCircle className="w-3.5 h-3.5" /> {errors.jacketCrossingYear}
                  </p>
                )}
              </div>

              {/* Line Name */}
              <div>
                <label htmlFor="jacketLineName" className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1">
                  Line Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="jacketLineName"
                  name="jacketLineName"
                  placeholder="e.g. S.S. MERCURY"
                  maxLength={22}
                  value={formData.jacketLineName}
                  onChange={(e) => onChange({ jacketLineName: e.target.value })}
                  className={`block w-full rounded-lg border bg-white border-gray-300 px-4 py-2.5 text-gray-900 shadow-xs focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue focus:outline-hidden text-xs ${
                    errors.jacketLineName ? "border-red-500" : "border-gray-300"
                  }`}
                />
                {errors.jacketLineName && (
                  <p className="mt-1 text-[11px] text-red-500 flex items-center gap-1 font-medium">
                    <AlertCircle className="w-3.5 h-3.5" /> {errors.jacketLineName}
                  </p>
                )}
              </div>

              {/* Line Number */}
              <div>
                <label htmlFor="jacketLineNumber" className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1">
                  Line Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="jacketLineNumber"
                  name="jacketLineNumber"
                  placeholder="e.g. #04 (or 4)"
                  maxLength={6}
                  value={formData.jacketLineNumber}
                  onChange={(e) => onChange({ jacketLineNumber: e.target.value })}
                  className={`block w-full rounded-lg border bg-white border-gray-300 px-4 py-2.5 text-gray-900 shadow-xs focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue focus:outline-hidden text-xs ${
                    errors.jacketLineNumber ? "border-red-500" : "border-gray-300"
                  }`}
                />
                {errors.jacketLineNumber && (
                  <p className="mt-1 text-[11px] text-red-500 flex items-center gap-1 font-medium">
                    <AlertCircle className="w-3.5 h-3.5" /> {errors.jacketLineNumber}
                  </p>
                )}
              </div>

              {/* Your Line's Entire Line Name */}
              <div className="sm:col-span-2">
                <label htmlFor="jacketEntireLineName" className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1">
                  Line's Entire Name (Ship/Club Name) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="jacketEntireLineName"
                  name="jacketEntireLineName"
                  placeholder="e.g. 19 SOULS OF DESTRUCTION"
                  maxLength={35}
                  value={formData.jacketEntireLineName}
                  onChange={(e) => onChange({ jacketEntireLineName: e.target.value })}
                  className={`block w-full rounded-lg border bg-white border-gray-300 px-4 py-2.5 text-gray-900 shadow-xs focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue focus:outline-hidden text-xs ${
                    errors.jacketEntireLineName ? "border-red-500" : "border-gray-300"
                  }`}
                />
                {errors.jacketEntireLineName && (
                  <p className="mt-1 text-[11px] text-red-500 flex items-center gap-1 font-medium">
                    <AlertCircle className="w-3.5 h-3.5" /> {errors.jacketEntireLineName}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Special Requests or Notes */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs">
          <label htmlFor="specialRequests" className="block text-sm font-bold text-gray-950">
            Special Requests or Committee Notes <span className="text-gray-400 font-normal">(Optional)</span>
          </label>
          <p className="text-xs text-gray-500 mt-1 mb-2 leading-relaxed">
            Specify solid dietary constraints for the tailgate/hospitality suite, custom logistics needs, or comments.
          </p>
          <div className="mt-1 w-full">
            <textarea
              id="specialRequests"
              name="specialRequests"
              rows={3}
              placeholder="e.g. Food constraints: Lactose intolerant. Preparing to return home for Homecoming '26!"
              value={formData.specialRequests}
              onChange={(e) => onChange({ specialRequests: e.target.value })}
              className="block w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 shadow-xs focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue focus:outline-hidden sm:text-xs"
              maxLength={1000}
            />
            <div className="mt-1 text-right text-xs text-gray-400">
              {formData.specialRequests.length} / 1000 characters
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
