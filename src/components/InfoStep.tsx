/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { OrderForm, STATE_LIST } from "../types";

interface InfoStepProps {
  formData: OrderForm;
  onChange: (fields: Partial<OrderForm>) => void;
  onAddressChange: (fields: Partial<OrderForm["shippingAddress"]>) => void;
  errors: Record<string, string>;
}

export default function InfoStep({
  formData,
  onChange,
  onAddressChange,
  errors
}: InfoStepProps) {
  return (
    <div className="space-y-6" id="info-step-container">
      <div className="border-b border-gray-200 pb-4">
        <h3 className="font-display text-xl font-bold text-gray-900 leading-6">
          Step 1: Your Contact & Shipping Information
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          Please enter your contact info and shipping address where your Homecoming 2026 box items will be mailed.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-y-5 gap-x-4 sm:grid-cols-6">
        {/* Full Name */}
        <div className="sm:col-span-6">
          <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">
            Full Name <span className="text-red-500">*</span>
          </label>
          <div className="mt-1.5">
            <input
              type="text"
              name="fullName"
              id="fullName"
              required
              placeholder="e.g. Bro. Langston Taylor"
              value={formData.fullName}
              onChange={(e) => onChange({ fullName: e.target.value })}
              className={`block w-full rounded-lg border px-4 py-3 text-gray-900 shadow-xs focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue focus:outline-hidden sm:text-sm ${
                errors.fullName ? "border-red-500 focus:ring-red-200 focus:border-red-500" : "border-gray-300"
              }`}
            />
            {errors.fullName && (
              <p className="mt-1.5 text-xs text-red-600 font-medium">{errors.fullName}</p>
            )}
          </div>
        </div>

        {/* Email Address */}
        <div className="sm:col-span-3">
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Email Address <span className="text-red-500">*</span>
          </label>
          <div className="mt-1.5">
            <input
              type="email"
              name="email"
              id="email"
              required
              placeholder="e.g. sigma@chapter.edu"
              value={formData.email}
              onChange={(e) => onChange({ email: e.target.value })}
              className={`block w-full rounded-lg border px-4 py-3 text-gray-900 shadow-xs focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue focus:outline-hidden sm:text-sm ${
                errors.email ? "border-red-500 focus:ring-red-200 focus:border-red-500" : "border-gray-300"
              }`}
            />
            {errors.email && (
              <p className="mt-1.5 text-xs text-red-600 font-medium">{errors.email}</p>
            )}
          </div>
        </div>

        {/* Phone Number */}
        <div className="sm:col-span-3">
          <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
            Phone Number <span className="text-red-500">*</span>
          </label>
          <div className="mt-1.5">
            <input
              type="tel"
              name="phone"
              id="phone"
              required
              placeholder="e.g. (114) 191-4191"
              value={formData.phone}
              onChange={(e) => onChange({ phone: e.target.value })}
              className={`block w-full rounded-lg border px-4 py-3 text-gray-900 shadow-xs focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue focus:outline-hidden sm:text-sm ${
                errors.phone ? "border-red-500 focus:ring-red-200 focus:border-red-500" : "border-gray-300"
              }`}
            />
            {errors.phone && (
              <p className="mt-1.5 text-xs text-red-600 font-medium">{errors.phone}</p>
            )}
          </div>
        </div>

        {/* Shipping Header */}
        <div className="sm:col-span-6 mt-4 pt-4 border-t border-gray-100">
          <h4 className="font-display text-base font-semibold text-gray-900">
            Shipping Address
          </h4>
        </div>

        {/* Street Address */}
        <div className="sm:col-span-6">
          <label htmlFor="street" className="block text-sm font-medium text-gray-700">
            Street Address <span className="text-red-500">*</span>
          </label>
          <div className="mt-1.5">
            <input
              type="text"
              name="street"
              id="street"
              required
              placeholder="145 Founders Way, Apt 1914"
              value={formData.shippingAddress.street}
              onChange={(e) => onAddressChange({ street: e.target.value })}
              className={`block w-full rounded-lg border px-4 py-3 text-gray-900 shadow-xs focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue focus:outline-hidden sm:text-sm ${
                errors.street ? "border-red-500 focus:ring-red-200 focus:border-red-500" : "border-gray-300"
              }`}
            />
            {errors.street && (
              <p className="mt-1.5 text-xs text-red-600 font-medium">{errors.street}</p>
            )}
          </div>
        </div>

        {/* City */}
        <div className="sm:col-span-3">
          <label htmlFor="city" className="block text-sm font-medium text-gray-700">
            City <span className="text-red-500">*</span>
          </label>
          <div className="mt-1.5">
            <input
              type="text"
              name="city"
              id="city"
              required
              placeholder="e.g. Atlanta"
              value={formData.shippingAddress.city}
              onChange={(e) => onAddressChange({ city: e.target.value })}
              className={`block w-full rounded-lg border px-4 py-3 text-gray-900 shadow-xs focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue focus:outline-hidden sm:text-sm ${
                errors.city ? "border-red-500 focus:ring-red-200 focus:border-red-500" : "border-gray-300"
              }`}
            />
            {errors.city && (
              <p className="mt-1.5 text-xs text-red-600 font-medium">{errors.city}</p>
            )}
          </div>
        </div>

        {/* State */}
        <div className="sm:col-span-1.5">
          <label htmlFor="state" className="block text-sm font-medium text-gray-700">
            State <span className="text-red-500">*</span>
          </label>
          <div className="mt-1.5">
            <select
              id="state"
              name="state"
              value={formData.shippingAddress.state}
              onChange={(e) => onAddressChange({ state: e.target.value })}
              className={`block w-full rounded-lg border px-3 py-3 text-gray-900 shadow-xs focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue focus:outline-hidden sm:text-sm ${
                errors.state ? "border-red-500 focus:ring-red-200 focus:border-red-500" : "border-gray-300"
              }`}
            >
              <option value="">--</option>
              {STATE_LIST.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
            {errors.state && (
              <p className="mt-1.5 text-xs text-red-600 font-medium">{errors.state}</p>
            )}
          </div>
        </div>

        {/* ZIP Code */}
        <div className="sm:col-span-1.5">
          <label htmlFor="zipCode" className="block text-sm font-medium text-gray-700">
            ZIP Code <span className="text-red-500">*</span>
          </label>
          <div className="mt-1.5">
            <input
              type="text"
              name="zipCode"
              id="zipCode"
              required
              placeholder="30314"
              maxLength={10}
              value={formData.shippingAddress.zipCode}
              onChange={(e) => onAddressChange({ zipCode: e.target.value })}
              className={`block w-full rounded-lg border px-4 py-3 text-gray-900 shadow-xs focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue focus:outline-hidden sm:text-sm ${
                errors.zipCode ? "border-red-500 focus:ring-red-200 focus:border-red-500" : "border-gray-300"
              }`}
            />
            {errors.zipCode && (
              <p className="mt-1.5 text-xs text-red-600 font-medium">{errors.zipCode}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
