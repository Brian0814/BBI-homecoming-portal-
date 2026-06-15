/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { PackageOption, PACKAGE_OPTIONS } from "../types";
import { Check, ShieldAlert, Award, Star, Inbox, HelpCircle } from "lucide-react";

interface PackageStepProps {
  selectedPackageId: string;
  onSelect: (packageId: string) => void;
  errors: Record<string, string>;
}

// Map package IDs to beautiful dynamic icon badges for fraternal prestige
const getPackageIcon = (id: string) => {
  switch (id) {
    case "langston-taylor":
      return <Award className="w-6 h-6 text-yellow-500 animate-pulse" />;
    case "leonard-morse":
      return <Star className="w-6 h-6 text-brand-blue" />;
    case "charles-brown":
      return <Check className="w-6 h-6 text-emerald-600" />;
    case "box-items":
      return <Inbox className="w-6 h-6 text-blue-500" />;
    default:
      return <HelpCircle className="w-6 h-6 text-gray-500" />;
  }
};

export default function PackageStep({
  selectedPackageId,
  onSelect,
  errors
}: PackageStepProps) {
  return (
    <div className="space-y-6" id="package-step-container">
      <div className="border-b border-gray-200 pb-4">
        <h3 className="font-display text-xl font-bold text-gray-900 leading-6">
          Step 3: Select Your Homecoming Package
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          The Beta Beta Iota Chapter offers these custom packages for our 2026 Homecoming. All prices listed represent overall package totals; select exactly one package to proceed.
        </p>
      </div>

      {/* --- GIFTS CARD / INTENSIVE FLYER INSPIRED PANEL --- */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 text-white shadow-lg relative overflow-hidden" id="gift-box-alliance-panel">
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-blue/10 rounded-full translate-x-20 -translate-y-20 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-44 h-44 bg-brand-blue-dark/20 rounded-full -translate-x-10 translate-y-10 pointer-events-none" />

        <div className="relative z-10 space-y-4">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-white/10 pb-4">
            <div>
              <span className="inline-flex items-center gap-1 bg-brand-blue text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border border-blue-400/30 mb-2 shadow-xs">
                🎁 Included in All Packages
              </span>
              <h4 className="font-display font-black text-xl sm:text-2xl uppercase tracking-tight text-white">
                BBI Homecoming Gift Box
              </h4>
              <p className="text-xs text-blue-100 max-w-xl mt-1 leading-relaxed">
                &ldquo;A gift. A symbol. A reminder. Of brotherhood that lasts beyond homecoming.&rdquo; Built for the beach. Worn with pride.
              </p>
            </div>
            <div className="flex-shrink-0 self-start sm:self-center bg-blue-950/60 border border-blue-800/40 rounded-xl px-4 py-3 text-right">
              <span className="text-[10px] text-blue-300 font-extrabold uppercase tracking-wider block">Spot Secure Deposit</span>
              <span className="font-mono text-base font-black text-brand-blue-light block">$100 Deposit Due</span>
              <span className="text-[9px] text-gray-400 block font-medium">Due on/before July 19, 2026</span>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-3 flex items-center gap-2.5">
              <span className="text-xl">👕</span>
              <div>
                <span className="font-extrabold block text-white text-xs">Custom T-Shirt</span>
                <span className="text-[10px] text-gray-400 font-medium">Custom Homecoming Tee</span>
              </div>
            </div>
            <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-3 flex items-center gap-2.5">
              <span className="text-xl">🥤</span>
              <div>
                <span className="font-extrabold block text-white text-xs">BBI Tumbler</span>
                <span className="text-[10px] text-gray-400 font-medium font-sans">Official Sig Tumbler</span>
              </div>
            </div>
            <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-3 flex items-center gap-2.5">
              <span className="text-xl">🏳️</span>
              <div>
                <span className="font-extrabold block text-white text-xs font-sans">Rally Towel</span>
                <span className="text-[10px] text-gray-400 font-medium">Chapter Sport Towel</span>
              </div>
            </div>
            <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-3 flex items-center gap-2.5">
              <span className="text-xl">🥃</span>
              <div>
                <span className="font-extrabold block text-white text-xs font-sans">Whiskey Glass</span>
                <span className="text-[10px] text-gray-400 font-medium">Custom Whiskey Glass</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between text-[10px] font-black uppercase text-blue-305/80 tracking-widest gap-2 pt-2 border-t border-white/5">
            <span>★ Represent BBI. Represent The Beach. ★</span>
            <span className="text-[9px]">ONE CHAPTER. ONE FAMILY. ONE LEGACY.</span>
          </div>
        </div>
      </div>

      {errors.selectedPackageId && (
        <div className="rounded-md bg-red-50 p-4 border border-red-200 flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-red-800">Selection Required</h3>
            <p className="mt-1 text-xs text-red-700">{errors.selectedPackageId}</p>
          </div>
        </div>
      )}

      {/* Dynamic Package Difference / What's NOT Included Callout */}
      <div className="bg-amber-50/70 border border-amber-250 rounded-xl p-4 text-slate-800 shadow-3xs" id="package-comparison-alert">
        <div className="flex gap-3 items-start">
          <div className="bg-amber-100 p-2 rounded-lg text-amber-800 font-bold text-lg select-none leading-none">
            ⚠️
          </div>
          <div className="space-y-1.5 flex-1">
            <h4 className="font-display font-black text-xs uppercase tracking-wider text-amber-800 leading-none">
              Package Difference Comparison Guide (What's NOT Included)
            </h4>
            <div className="text-xs leading-relaxed text-slate-700 font-medium">
              Comparing the <strong className="text-brand-blue font-black">Langston Taylor Alumni Package</strong> and the <strong className="text-slate-900 font-black">Leonard F. Morse Alumni Package</strong>:
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1.5">
              <div className="bg-white/90 p-3 rounded-lg border border-emerald-100 shadow-3xs relative overflow-hidden">
                <div className="absolute top-0 right-0 w-8 h-8 bg-emerald-500/10 rounded-full translate-x-3 -translate-y-3" />
                <span className="font-extrabold text-[10px] text-emerald-800 uppercase tracking-widest block mb-1">
                  ✓ Langston Taylor Alumni Package
                </span>
                <p className="text-[11px] text-emerald-700 font-medium leading-relaxed">
                  Includes the <span className="font-bold underline text-emerald-800">Stepshow Ticket Included</span> ($20 value) and full hospitality access.
                </p>
              </div>
              <div className="bg-white/90 p-3 rounded-lg border border-red-100 shadow-3xs relative overflow-hidden">
                <div className="absolute top-0 right-0 w-8 h-8 bg-red-500/10 rounded-full translate-x-3 -translate-y-3" />
                <span className="font-extrabold text-[10px] text-red-800 uppercase tracking-widest block mb-1">
                  ✗ Leonard F. Morse Alumni Package
                </span>
                <p className="text-[11px] text-red-600 font-semibold leading-relaxed">
                  The <span className="font-bold underline text-red-800">Stepshow Ticket is NOT included</span>. Morse Package subscribers will need to purchase stepsow admission independently.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {PACKAGE_OPTIONS.map((pkg) => {
          const isSelected = selectedPackageId === pkg.id;
          return (
            <div
              key={pkg.id}
              onClick={() => onSelect(pkg.id)}
              className={`relative cursor-pointer rounded-2xl border p-6 transition-all duration-300 ease-out flex flex-col justify-between ${
                isSelected
                  ? "border-brand-blue bg-blue-50/45 shadow-lg scale-[1.01] ring-2 ring-brand-blue"
                  : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-xs hover:scale-[1.005]"
              }`}
              id={`package-card-${pkg.id}`}
            >
              {/* Selected top ribbon badge */}
              {isSelected && (
                <div className="absolute top-0 right-6 -translate-y-1/2 bg-brand-blue text-white text-[10px] font-extrabold uppercase tracking-wide px-3 py-1 rounded-full shadow-md flex items-center gap-1">
                  <Check className="w-3 h-3 stroke-[3]" /> Active Selection
                </div>
              )}

              <div>
                {/* Header row with Title and Price */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className={`p-2 rounded-lg ${isSelected ? "bg-white text-brand-blue border border-brand-blue/30" : "bg-gray-50 text-gray-400"}`}>
                      {getPackageIcon(pkg.id)}
                    </div>
                    <div>
                      <h4 className="font-display font-bold text-gray-900 text-lg leading-tight">
                        {pkg.name}
                      </h4>
                      {pkg.id === "langston-taylor" && (
                        <span className="inline-block mt-1 text-[10px] font-semibold text-brand-blue bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded-sm">
                          Premier Alumni Choice
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-mono text-2xl font-extrabold text-brand-blue block">
                      ${pkg.price}
                    </span>
                    <span className="text-[10px] text-gray-400 font-medium tracking-wider uppercase block">
                      Package Total
                    </span>
                  </div>
                </div>

                {/* Items List */}
                <div className="mt-6">
                  <h5 className="text-[11px] font-semibold tracking-wider text-gray-400 uppercase mb-3">
                    What's Included
                  </h5>
                  <ul className="space-y-2.5 text-xs text-gray-700">
                    {pkg.items.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2.5">
                        <Check className="w-4 h-4 text-brand-blue flex-shrink-0 mt-0.5 stroke-[2.5]" />
                        <span className="leading-relaxed font-semibold">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Special Notes or Warnings */}
              {pkg.note && (
                <div className="mt-5 bg-amber-50/80 border border-amber-200/80 rounded-lg p-3 text-xs text-amber-900">
                  <span className="font-bold block uppercase tracking-wide text-[9px] text-amber-700 mb-0.5">
                    Important Note
                  </span>
                  {pkg.note}
                </div>
              )}

              {/* Bottom selection feedback helper */}
              <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between text-xs">
                <span className={`font-semibold ${isSelected ? "text-brand-blue" : "text-gray-400"}`}>
                  {isSelected ? "✓ Confirmed Selected" : "Click card to select"}
                </span>
                <button
                  type="button"
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                    isSelected
                      ? "bg-brand-blue text-white shadow-xs"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {isSelected ? "Selected" : "Select Package"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
