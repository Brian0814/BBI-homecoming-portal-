/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { OrderForm, PackageOption, PACKAGE_OPTIONS } from "./types";
import BBIChapterLogo from "./components/BBIChapterLogo";
import InfoStep from "./components/InfoStep";
import DetailsStep from "./components/DetailsStep";
import PackageStep from "./components/PackageStep";
import ReviewStep from "./components/ReviewStep";
import ConfirmationStep from "./components/ConfirmationStep";
import AdminPortal from "./components/AdminPortal";
import { ChevronLeft, ChevronRight, Check, PackageOpen, LayoutDashboard, ShoppingCart, Sparkles, Lock, Eye, EyeOff, AlertCircle, RotateCcw, MailCheck } from "lucide-react";
import { initAuth, googleSignIn, logout } from "./lib/firebaseAuth";
import { sendGmailMessage, generateConfirmationEmail } from "./lib/gmailUtils";
import GmailAuthWidget from "./components/GmailAuthWidget";
import { User } from "firebase/auth";

const LOCAL_STORAGE_KEY = "bbi_homecoming_2026_order";
const ORDER_HISTORY_KEY = "bbi_homecoming_2026_history";

export default function App() {
  // Flag to toggle between Standard Web Intake Form and Administrator Admin view
  const [isAdminView, setIsAdminView] = useState<boolean>(false);

  // Password protection states for Admin Dashboard (gated with 'beachmab')
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem("bbi_admin_auth") === "true";
    } catch {
      return false;
    }
  });
  const [passwordInput, setPasswordInput] = useState<string>("");
  const [passwordError, setPasswordError] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);

  const handleAdminLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === "beachmab") {
      setIsAdminAuthenticated(true);
      setPasswordError("");
      try {
        sessionStorage.setItem("bbi_admin_auth", "true");
      } catch (err) {
        console.error(err);
      }
    } else {
      setPasswordError("Incorrect security passcode. Please try again.");
    }
  };

  // Initialize form with clean defaults (no persistent drafts across refreshes)
  const [formData, setFormData] = useState<OrderForm>({
    fullName: "",
    email: "",
    phone: "",
    shippingAddress: {
      street: "",
      city: "",
      state: "",
      zipCode: ""
    },
    shirtSize: "",
    specialRequests: "",
    selectedPackageId: "",
    // Addons
    addFootballTicket: false,
    addDetroitJacket: false,
    // Jacket customized details
    jacketSize: "",
    jacketCrossingYear: "",
    jacketLineName: "",
    jacketEntireLineName: "",
    jacketLineNumber: ""
  });

  // Google Auth integration states for Gmail API
  const [googleUser, setGoogleUser] = useState<User | null>(null);
  const [googleToken, setGoogleToken] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);
  const [emailStatus, setEmailStatus] = useState<"idle" | "sending" | "sent" | "failed">("idle");
  const [emailErrorMsg, setEmailErrorMsg] = useState<string>("");

  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setGoogleUser(user);
        setGoogleToken(token);
        setIsAuthLoading(false);
      },
      () => {
        setGoogleUser(null);
        setGoogleToken(null);
        setIsAuthLoading(false);
      }
    );
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const handleGoogleSignIn = async () => {
    setIsAuthLoading(true);
    try {
      const result = await googleSignIn();
      if (result) {
        setGoogleUser(result.user);
        setGoogleToken(result.accessToken);
      }
    } catch (err) {
      console.error("Sign in failed:", err);
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleGoogleSignOut = async () => {
    setIsAuthLoading(true);
    try {
      await logout();
      setGoogleUser(null);
      setGoogleToken(null);
    } catch (err) {
      console.error("Sign out failed:", err);
    } finally {
      setIsAuthLoading(false);
    }
  };

  const [activeStep, setActiveStep] = useState<number>(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [orderRefNumber, setOrderRefNumber] = useState<string>("");
  const [showResetConfirm, setShowResetConfirm] = useState<boolean>(false);

  // Clear any existing legacy local storage drafts on mount to guarantee starting completely fresh
  useEffect(() => {
    try {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    } catch (e) {
      console.warn("Could not clear legacy item on mount:", e);
    }
  }, []);

  // Read current package details
  const selectedPackage = PACKAGE_OPTIONS.find((pkg) => pkg.id === formData.selectedPackageId);

  // Interactive total calculating math
  const ticketCost = 0; // CCU Tickets are purchased directly from CCU Ticket Office website ($37 - $57)
  const jacketCost = formData.addDetroitJacket ? 135 : 0;
  const finalPrice = (selectedPackage?.price || 0) + ticketCost + jacketCost;

  // Form field changes
  const handleFormChange = (fields: Partial<OrderForm>) => {
    setFormData((prev) => ({
      ...prev,
      ...fields
    }));
    // Clear the error for this field
    const fieldName = Object.keys(fields)[0];
    if (fieldName && errors[fieldName]) {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy[fieldName];
        return copy;
      });
    }
  };

  // Address subfields changes
  const handleAddressChange = (addressFields: Partial<OrderForm["shippingAddress"]>) => {
    setFormData((prev) => ({
      ...prev,
      shippingAddress: {
        ...prev.shippingAddress,
        ...addressFields
      }
    }));
    // Clear errors for specific fields
    const fieldName = Object.keys(addressFields)[0];
    if (fieldName && errors[fieldName]) {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy[fieldName];
        return copy;
      });
    }
  };

  // Field validation
  const validateStep = (step: number): boolean => {
    const stepErrors: Record<string, string> = {};

    if (step === 0) {
      // Step 1: Contact
      if (!formData.fullName.trim()) {
        stepErrors.fullName = "Full name is required.";
      } else if (formData.fullName.trim().length < 2) {
        stepErrors.fullName = "Please enter your valid full name.";
      }

      if (!formData.email.trim()) {
        stepErrors.email = "Email address is required.";
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
        stepErrors.email = "Please enter a valid email address.";
      }

      if (!formData.phone.trim()) {
        stepErrors.phone = "Phone number is required.";
      } else if (formData.phone.trim().replace(/\D/g, "").length < 7) {
        stepErrors.phone = "Please enter a valid phone number.";
      }

      const addr = formData.shippingAddress;
      if (!addr.street.trim()) {
        stepErrors.street = "Street address is required.";
      }
      if (!addr.city.trim()) {
        stepErrors.city = "City name is required.";
      }
      if (!addr.state) {
        stepErrors.state = "State selection is required.";
      }
      if (!addr.zipCode.trim()) {
        stepErrors.zipCode = "ZIP Code is required.";
      } else if (!/^\d{5}(-\d{4})?$/.test(addr.zipCode.trim())) {
        stepErrors.zipCode = "ZIP Code must be 5 digits (e.g. 30314).";
      }
    }

    if (step === 1) {
      // Step 2: Custom Sizing & Add-On customizer constraints
      if (!formData.shirtSize) {
        stepErrors.shirtSize = "Core package t-shirt size is required.";
      }

      if (formData.addDetroitJacket) {
        if (!formData.jacketSize) {
          stepErrors.jacketSize = "Jacket size is required if adding the customized Carhartt Style jacket.";
        }
        if (!formData.jacketCrossingYear.trim()) {
          stepErrors.jacketCrossingYear = "Crossing year is required for customized embroidery (e.g., SPR 26).";
        }
        if (!formData.jacketLineName.trim()) {
          stepErrors.jacketLineName = "Line Name / Line initials is required.";
        }
        if (!formData.jacketEntireLineName.trim()) {
          stepErrors.jacketEntireLineName = "The entire line's name or ship name is required.";
        }
        if (!formData.jacketLineNumber.trim()) {
          stepErrors.jacketLineNumber = "Your individual line number is required (e.g. 4 or #04).";
        }
      }
    }

    if (step === 2) {
      // Step 3: Choose Package
      if (!formData.selectedPackageId) {
        stepErrors.selectedPackageId = "You must select exactly one homecoming package category.";
      }
    }

    setErrors(stepErrors);
    return Object.keys(stepErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(activeStep)) {
      setActiveStep((prev) => prev + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleBack = () => {
    setActiveStep((prev) => Math.max(0, prev - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleNavigateToStep = (stepNumber: number) => {
    if (stepNumber < activeStep) {
      setActiveStep(stepNumber);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      let canGo = true;
      for (let i = activeStep; i < stepNumber; i++) {
        if (!validateStep(i)) {
          canGo = false;
          break;
        }
      }
      if (canGo) {
        setActiveStep(stepNumber);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    }
  };

  const handleOrderSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Verify all steps are fully valid before generating confirmation
    let isAllValid = true;
    for (let s = 0; s < 3; s++) {
      if (!validateStep(s)) {
        isAllValid = false;
        setActiveStep(s);
        break;
      }
    }

    if (isAllValid) {
      // Generate order reference number
      const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
      let randomPart = "";
      for (let i = 0; i < 5; i++) {
        randomPart += characters.charAt(Math.floor(Math.random() * characters.length));
      }
      const refCode = `BBI-HMC26-${randomPart}`;
      setOrderRefNumber(refCode);
      setIsSubmitted(true);

      // Persist submission state in history
      try {
        const existingHistory = JSON.parse(localStorage.getItem(ORDER_HISTORY_KEY) || "[]");
        existingHistory.push({
          ref: refCode,
          date: new Date().toISOString(),
          formData
        });
        localStorage.setItem(ORDER_HISTORY_KEY, JSON.stringify(existingHistory));
      } catch (e) {
        console.error("Could not write order history:", e);
      }

      // Asynchronously trigger Gmail dispatch to ensure page enters confirmation state instantly
      if (googleToken) {
        setEmailStatus("sending");
        setEmailErrorMsg("");
        sendGmailMessage(googleToken, formData.email, `BBI Homecoming 2026 - Registration Confirmed [${refCode}]`, generateConfirmationEmail(formData, refCode))
          .then(() => {
            setEmailStatus("sent");
          })
          .catch((err) => {
            console.error("Failed to dispatch email:", err);
            setEmailStatus("failed");
            setEmailErrorMsg(err?.message || "Unknown Gmail service error");
          });
      } else {
        setEmailStatus("idle");
      }

      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleReset = () => {
    setFormData({
      fullName: "",
      email: "",
      phone: "",
      shippingAddress: {
        street: "",
        city: "",
        state: "",
        zipCode: ""
      },
      shirtSize: "",
      specialRequests: "",
      selectedPackageId: "",
      addFootballTicket: false,
      addDetroitJacket: false,
      jacketSize: "",
      jacketCrossingYear: "",
      jacketLineName: "",
      jacketEntireLineName: "",
      jacketLineNumber: ""
    });
    setErrors({});
    setIsSubmitted(false);
    setOrderRefNumber("");
    setActiveStep(0);
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const stepsConfig = [
    { title: "Your Info", desc: "Contact & Address" },
    { title: "Your Details", desc: "Size & Add-Ons" },
    { title: "Choose Package", desc: "Registration Package" }
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between" id="app-root-container">
      {/* 1. Header Hero Banner */}
      <header className="bg-brand-blue text-white shadow-md relative overflow-hidden" id="main-header">
        {/* Subtle royal blue background geometric accent rings */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-brand-blue-light/10 rounded-full translate-x-20 -translate-y-20 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-60 h-60 bg-brand-blue-dark/20 rounded-full -translate-x-10 translate-y-10 pointer-events-none" />

        <div className="max-w-4xl mx-auto px-4 py-6 sm:py-8 relative z-10">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-5 text-center sm:text-left">
            <div className="flex flex-col sm:flex-row items-center gap-5">
              {/* Crest SVG Emblem */}
              <BBIChapterLogo size={110} className="filter drop-shadow-md bg-white p-1 rounded-full border-2 border-white" />
              
              <div className="space-y-1">
                <span className="text-blue-200 text-xs font-black tracking-widest uppercase block">
                  PHI BETA SIGMA FRATERNITY, INC.
                </span>
                <span className="text-blue-100 text-[10px] font-bold uppercase tracking-wider block">
                  BBI Chapter • Est. 2004
                </span>
                <h1 className="font-display text-2xl sm:text-3.5xl font-black uppercase tracking-tight text-white leading-tight">
                  Homecoming 2026 Package Portal
                </h1>
                <p className="text-xs sm:text-sm text-blue-100 font-semibold">
                  November 5-8, 2026 • Conway, SC • Coastal Carolina University
                </p>
              </div>
            </div>

            {/* Quick Switch Admin Mode Button */}
            <div className="flex-shrink-0 self-center">
              <button
                type="button"
                onClick={() => {
                  setIsAdminView(!isAdminView);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border font-bold text-xs shadow-md transition-all cursor-pointer ${
                  isAdminView
                    ? "bg-white text-brand-blue border-white hover:bg-slate-50"
                    : "bg-brand-blue-dark text-white border-brand-blue-light hover:bg-brand-blue-darker"
                }`}
              >
                {isAdminView ? (
                  <>
                    <ShoppingCart className="w-4 h-4" /> Go to Order Form
                  </>
                ) : (
                  <>
                    <LayoutDashboard className="w-4 h-4" /> Admin Dashboard
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* 2. Main content block - Toggles between Admin dashboard and Intake form */}
      <main className="max-w-4xl w-full mx-auto px-4 py-8 flex-1">
        {/* Persistent Email configuration HUD */}
        <div className="mb-6">
          <GmailAuthWidget
            user={googleUser}
            accessToken={googleToken}
            onSignIn={handleGoogleSignIn}
            onSignOut={handleGoogleSignOut}
            isLoading={isAuthLoading}
          />
        </div>

        {isAdminView ? (
          !isAdminAuthenticated ? (
            /* PASSPHRASE AUTHENTICATION SHIELD CARD */
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8 max-w-md mx-auto my-8">
              <div className="text-center space-y-4">
                <div className="inline-flex p-3 bg-blue-50 rounded-full text-brand-blue">
                  <Lock className="w-8 h-8 text-brand-blue" />
                </div>
                <div>
                  <h2 className="font-display text-xl font-black text-slate-900 tracking-tight">
                    Admin Dashboard Authorization
                  </h2>
                  <p className="text-xs text-gray-500 mt-1">
                    Please input the chapter security credential to unlock active registrants and excel datasets.
                  </p>
                </div>
              </div>

              <form onSubmit={handleAdminLoginSubmit} className="mt-6 space-y-4">
                <div className="space-y-1">
                  <label htmlFor="adminPass" className="block text-[10px] uppercase font-black tracking-wider text-gray-500">
                    Administrator Password
                  </label>
                  <div className="relative rounded-lg shadow-2xs">
                    <input
                      type={showPassword ? "text" : "password"}
                      id="adminPass"
                      placeholder="Enter password..."
                      value={passwordInput}
                      onChange={(e) => {
                        setPasswordInput(e.target.value);
                        setPasswordError("");
                      }}
                      className={`block w-full rounded-lg border px-3.5 py-3 text-sm focus:outline-hidden focus:ring-2 ${
                        passwordError
                          ? "border-red-500 focus:ring-red-200"
                          : "border-gray-300 focus:ring-brand-blue/20 focus:border-brand-blue"
                      }`}
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {passwordError && (
                    <p className="text-[11px] text-red-500 font-medium flex items-center gap-1 mt-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {passwordError}
                    </p>
                  )}
                </div>

                <div className="pt-2 flex flex-col gap-2">
                  <button
                    type="submit"
                    className="w-full inline-flex items-center justify-center px-4 py-3 rounded-xl bg-brand-blue text-white font-bold text-xs shadow-md hover:bg-brand-blue-dark transition-all cursor-pointer min-h-[44px]"
                  >
                    Unlock Dashboard
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAdminView(false);
                      setPasswordError("");
                    }}
                    className="w-full inline-flex items-center justify-center px-4 py-3 rounded-xl border border-gray-300 bg-white text-gray-700 font-bold text-xs shadow-2xs hover:bg-gray-50 transition-all cursor-pointer min-h-[44px]"
                  >
                    Cancel & Go Back
                  </button>
                </div>
              </form>
            </div>
          ) : (
            /* ADMIN DASHBOARD */
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8 animate-in fade-in zoom-in-95 duration-200">
              <AdminPortal
                onBackToForm={() => setIsAdminView(false)}
                googleToken={googleToken}
                googleUser={googleUser}
              />
            </div>
          )
        ) : !isSubmitted ? (
          /* REGULAR INTAKE STEPS SCREEN */
          <div className="space-y-6">
            
            {/* DEV TOOLBAR / CONVENIENT AUTO-FILL TESTING DECK */}
            <div className="bg-slate-900 text-white rounded-2xl p-4.5 shadow-md border border-slate-800 space-y-3.5" id="dev-testing-deck">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="p-1 px-2 bg-brand-blue/30 text-brand-blue-light border border-brand-blue-light/20 rounded-md text-[10px] font-black uppercase tracking-wider animate-pulse">
                    DEV HELPER
                  </div>
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-100">
                      Form Preview & Quick Test Deck
                    </h3>
                    <p className="text-[10px] text-slate-400">
                      Skip manual form entry. Instantly populate mock data and jump directly to see layout updates!
                    </p>
                  </div>
                </div>
                
                <span className="text-[9px] text-slate-500 font-mono">
                  State: Step {activeStep + 1}
                </span>
              </div>

              <div className="flex flex-wrap gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setFormData({
                      fullName: "Brother Brian Johnson",
                      email: "brianojohnson80@gmail.com",
                      phone: "8439021914",
                      shippingAddress: {
                        street: "178 BLke",
                        city: "Conway",
                        state: "SC",
                        zipCode: "29526"
                      },
                      shirtSize: "XL",
                      specialRequests: "Please wrap the alumni package securely together.",
                      selectedPackageId: "langston-taylor",
                      addFootballTicket: true,
                      addDetroitJacket: true,
                      jacketSize: "XL",
                      jacketCrossingYear: "SPR 04",
                      jacketLineName: "BBI",
                      jacketEntireLineName: "14 Solitary Marines",
                      jacketLineNumber: "#04"
                    });
                    setErrors({});
                    setActiveStep(3); // Goes directly to the Review page (step index 3 is Review)
                  }}
                  className="flex-1 min-w-[200px] text-left p-2.5 bg-slate-850 hover:bg-slate-800 rounded-lg border border-slate-800 hover:border-slate-700 transition-all text-xs cursor-pointer group"
                >
                  <span className="font-extrabold text-blue-400 block group-hover:text-blue-300">
                    ⚡ Fill: Langston Taylor Alumni + Jacket
                  </span>
                  <span className="text-[9.5px] text-slate-400 font-medium">
                    Populates Langston Taylor, adds $135 Detroit Jacket, and jumps to Step 4 (Review).
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setFormData({
                      fullName: "Hon. Leonard Morse Test",
                      email: "morse_example@gmail.com",
                      phone: "8435550191",
                      shippingAddress: {
                        street: "1914 Blue Crescent Dr",
                        city: "Conway",
                        state: "SC",
                        zipCode: "29526"
                      },
                      shirtSize: "L",
                      specialRequests: "",
                      selectedPackageId: "leonard-morse",
                      addFootballTicket: false,
                      addDetroitJacket: false,
                      jacketSize: "",
                      jacketCrossingYear: "",
                      jacketLineName: "",
                      jacketEntireLineName: "",
                      jacketLineNumber: ""
                    });
                    setErrors({});
                    setActiveStep(3); // Goes directly to the Review page
                  }}
                  className="flex-1 min-w-[200px] text-left p-2.5 bg-slate-850 hover:bg-slate-800 rounded-lg border border-slate-800 hover:border-slate-700 transition-all text-xs cursor-pointer group"
                >
                  <span className="font-extrabold text-amber-400 block group-hover:text-amber-300">
                    ⚡ Fill: Morse Package (No Jacket)
                  </span>
                  <span className="text-[9.5px] text-slate-400 font-medium">
                    Populates Leonard Morse Package, no add-ons, and jumps directly to Step 4 (Review).
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    // Populate and instantly submit to confirmation/invoice schedule screen
                    setFormData({
                      fullName: "Brother Brian Johnson",
                      email: "brianojohnson80@gmail.com",
                      phone: "8439021914",
                      shippingAddress: {
                        street: "178 BLke",
                        city: "Conway",
                        state: "SC",
                        zipCode: "29526"
                      },
                      shirtSize: "XL",
                      specialRequests: "Preloaded demo checkout profile",
                      selectedPackageId: "langston-taylor",
                      addFootballTicket: true,
                      addDetroitJacket: true,
                      jacketSize: "XL",
                      jacketCrossingYear: "SPR 04",
                      jacketLineName: "BBI",
                      jacketEntireLineName: "14 Solitary Marines",
                      jacketLineNumber: "#04"
                    });
                    setErrors({});
                    setOrderRefNumber("BBI-PREVIEW-99452");
                    setIsSubmitted(true);
                  }}
                  className="flex-1 min-w-[200px] text-left p-2.5 bg-brand-blue/90 hover:bg-brand-blue text-white rounded-lg border border-brand-blue-light/20 shadow-xs transition-all text-xs cursor-pointer group"
                >
                  <span className="font-black block text-white">
                    🚀 Jump straight to Order Confirmation page
                  </span>
                  <span className="text-[9.5px] text-blue-100 font-medium">
                    Generates a mock receipt showing all add-ons and the official Payment Schedule!
                  </span>
                </button>
              </div>
            </div>

            {/* PROGRESS INDICATOR: 3 Steps */}
            <nav className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs" aria-label="Progress">
              <div className="flex items-center justify-between gap-2 max-w-2xl mx-auto">
                {stepsConfig.map((st, idx) => {
                  const isCompleted = activeStep > idx;
                  const isActive = activeStep === idx;
                  const isUpcoming = activeStep < idx;

                  return (
                    <React.Fragment key={idx}>
                      <button
                        type="button"
                        onClick={() => handleNavigateToStep(idx)}
                        disabled={isUpcoming}
                        className="flex flex-col items-center flex-1 focus:outline-hidden touch-manipulation group"
                      >
                        {/* Step Circle Indicator */}
                        <div className="relative flex items-center justify-center">
                          <span
                            className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
                              isCompleted
                                ? "bg-brand-blue text-white ring-4 ring-blue-100"
                                : isActive
                                ? "bg-brand-blue-light text-white ring-4 ring-blue-100 scale-105"
                                : "bg-gray-100 text-gray-400 group-hover:bg-gray-200"
                            }`}
                          >
                            {isCompleted ? (
                              <Check className="w-5 h-5 stroke-[3.5]" />
                            ) : (
                              idx + 1
                            )}
                          </span>
                        </div>
                        
                        {/* Step Title & Details */}
                        <span
                          className={`mt-2.5 text-xs text-center font-bold tracking-tight block transition-all ${
                            isActive ? "text-brand-blue font-black scale-[1.02]" : "text-gray-500"
                          }`}
                        >
                          {st.title}
                        </span>
                        <span className="hidden sm:block text-[10px] text-gray-400 font-medium text-center mt-0.5">
                          {st.desc}
                        </span>
                      </button>

                      {idx < stepsConfig.length - 1 && (
                        <div className="flex-1 max-w-[80px] h-0.5 self-center -translate-y-4">
                          <div
                            className={`h-full w-full rounded-sm transition-all duration-300 ${
                              activeStep > idx ? "bg-brand-blue" : "bg-gray-200"
                            }`}
                          />
                        </div>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>

              {/* Extra Review banner for Step 4 review state overlay */}
              {activeStep === 3 && (
                <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-center gap-1.5 text-xs text-brand-blue font-bold">
                  <Sparkles className="w-4 h-4 text-brand-blue-light animate-spin" />
                  Currently in final Step: Review your details before submit
                </div>
              )}
            </nav>

            {/* FORM CONTAINER */}
            <form onSubmit={handleOrderSubmit} id="portal-form">
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8">
                {/* Active step selector frame */}
                {activeStep === 0 && (
                  <InfoStep
                    formData={formData}
                    onChange={handleFormChange}
                    onAddressChange={handleAddressChange}
                    errors={errors}
                  />
                )}

                {activeStep === 1 && (
                  <DetailsStep
                    formData={formData}
                    onChange={handleFormChange}
                    errors={errors}
                  />
                )}

                {activeStep === 2 && (
                  <PackageStep
                    selectedPackageId={formData.selectedPackageId}
                    onSelect={(pkgId) => handleFormChange({ selectedPackageId: pkgId })}
                    errors={errors}
                  />
                )}

                {activeStep === 3 && (
                  <ReviewStep
                    formData={formData}
                    onNavigateToStep={handleNavigateToStep}
                  />
                )}

                {/* --- FLOATING / PROMINENT ACCUMULATED PACKAGE TOTAL HERO BAR --- */}
                {/* Visual guideline: "Display the selected package total prominently as the order total" */}
                {selectedPackage && activeStep < 3 && (
                  <div className="mt-8 bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-center justify-between shadow-xs">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-brand-blue rounded-md text-white">
                        <PackageOpen className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-400 font-extrabold uppercase tracking-widest block">
                          Selected Order Category
                        </span>
                        <span className="font-display font-extrabold text-blue-950 text-sm leading-tight block">
                          {selectedPackage.name}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-gray-400 font-extrabold uppercase tracking-widest block">
                        Subtotal Checkout Total
                      </span>
                      <span className="font-mono text-xl sm:text-2xl font-black text-brand-blue leading-tight block">
                        ${finalPrice}
                      </span>
                    </div>
                  </div>
                )}

                {/* FOOTER ACTION BUTTONS PANEL */}
                <div className="mt-8 pt-6 border-t border-gray-100 flex flex-wrap items-center justify-between gap-4">
                  {/* LEFT SIDE ACTION GROUP */}
                  <div className="flex flex-wrap items-center gap-2">
                    {/* BACK BUTTON */}
                    {activeStep > 0 && (
                      <button
                        type="button"
                        onClick={handleBack}
                        className="inline-flex items-center gap-1 px-5 py-3 rounded-xl border border-gray-300 bg-white text-gray-700 font-bold text-sm shadow-xs hover:bg-gray-50 transition-all cursor-pointer min-h-[48px] touch-manipulation"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        Back
                      </button>
                    )}

                    {/* DYNAMIC CONFIRMING RESET BUTTON */}
                    {showResetConfirm ? (
                      <div className="flex items-center gap-1.5 bg-red-50 border border-red-200 p-1.5 rounded-xl animate-in fade-in zoom-in-95 duration-150">
                        <span className="text-[10px] text-red-750 font-bold px-1.5 whitespace-nowrap">Clear all fields?</span>
                        <button
                          type="button"
                          onClick={() => {
                            handleReset();
                            setShowResetConfirm(false);
                          }}
                          className="px-2.5 py-1.5 bg-red-600 hover:bg-red-700 text-white font-black text-[10px] uppercase tracking-wider rounded-lg shadow-2xs transition-all cursor-pointer"
                        >
                          Confirm
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowResetConfirm(false)}
                          className="px-2.5 py-1.5 bg-white border border-gray-200 text-gray-700 font-bold text-[10px] uppercase tracking-wider rounded-lg hover:bg-gray-50 transition-all cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowResetConfirm(true)}
                        className="inline-flex items-center gap-1.5 px-4 py-3 rounded-xl border border-dashed border-gray-300 text-gray-500 hover:text-red-650 hover:border-red-300 hover:bg-red-50/20 font-bold text-xs transition-all cursor-pointer min-h-[48px] touch-manipulation"
                        title="Reset all form inputs to start fresh"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Reset Form
                      </button>
                    )}
                  </div>

                  {/* NEXT / REVIEW / SUBMIT BUTTONS */}
                  {activeStep < 3 ? (
                    <button
                      type="button"
                      onClick={handleNext}
                      className="inline-flex items-center gap-1 px-8 py-3 rounded-xl bg-brand-blue text-white font-bold text-sm shadow-md hover:bg-brand-blue-dark hover:shadow-lg transition-all cursor-pointer min-h-[48px] touch-manipulation"
                    >
                      {activeStep === 2 ? "Review Order" : "Next Step"}
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      type="submit"
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-10 py-3.5 rounded-xl bg-brand-blue text-white font-extrabold text-sm shadow-md hover:bg-brand-blue-dark hover:shadow-lg transition-all cursor-pointer min-h-[48px] touch-manipulation"
                    >
                      <Check className="w-5 h-5 stroke-[3]" />
                      Submit Package Order (${finalPrice})
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>
        ) : (
          /* CONFIRMATION SCREEN COMPONENT */
          <div className="bg-white rounded-2xl border border-gray-200 shadow-md p-6 sm:p-8">
            <ConfirmationStep
              formData={formData}
              orderRefNumber={orderRefNumber}
              onReset={handleReset}
              emailStatus={emailStatus}
              emailErrorMsg={emailErrorMsg}
            />
          </div>
        )}
      </main>

      {/* 3. Footer Block */}
      <footer className="bg-slate-900 text-gray-400 py-6 text-center border-t border-slate-850 text-xs relative" id="main-footer">
        <div className="max-w-4xl mx-auto px-4 space-y-2">
          {/* Footer toggle layout to let them access Admin mode if needed */}
          <div className="flex justify-center items-center gap-4 mb-3 pb-3 border-b border-slate-850 text-gray-450 font-bold">
            <button
              onClick={() => {
                setIsAdminView(false);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className={`hover:text-white cursor-pointer ${!isAdminView ? "text-white underline decoration-brand-blue-light decoration-2" : ""}`}
            >
              Order Intake Form
            </button>
            <span className="text-slate-800">|</span>
            <button
              onClick={() => {
                setIsAdminView(true);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className={`hover:text-white cursor-pointer ${isAdminView ? "text-white underline decoration-brand-blue-light decoration-2" : ""}`}
            >
              Admin Dashboard
            </button>
          </div>

          <p className="font-semibold text-gray-300">
            Beta Beta Iota Chapter • Phi Beta Sigma Fraternity, Inc.
          </p>
          <p className="font-mono text-[10px] text-gray-500">
            Official Chapter established 2004 — Brotherhood • Scholarship • Service
          </p>
          <p className="text-gray-600 text-[10px]">
            &copy; 2026 Beta Beta Iota Chapter. All rights reserved. For questions regarding shipment options, please email the chapter committee.
          </p>
        </div>
      </footer>
    </div>
  );
}
