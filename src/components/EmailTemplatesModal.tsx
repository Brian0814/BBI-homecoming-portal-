/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useRef } from "react";
import { 
  SystemEmailTemplate, 
  HistoryEntry 
} from "../types";
import { 
  DEFAULT_EMAIL_TEMPLATES, 
  EMAIL_MERGE_TOKENS, 
  containsDetroitWord, 
  saveEmailTemplateToFirestore, 
  saveEmailTemplatesToStorage 
} from "../lib/emailTemplates";
import { replaceMergeTokens, sanitizeEmailText } from "../lib/paymentUtils";
import { db } from "../lib/firebase";
import { 
  Mail, 
  Sparkles, 
  Check, 
  AlertCircle, 
  RefreshCw, 
  Eye, 
  Edit3, 
  Plus, 
  Trash2, 
  X, 
  Save, 
  ShieldCheck, 
  Tag,
  AlertTriangle,
  Info
} from "lucide-react";

interface EmailTemplatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  templates: SystemEmailTemplate[];
  onUpdateTemplates: (updated: SystemEmailTemplate[]) => void;
  history: HistoryEntry[];
  initialTemplateId?: string;
}

export const EmailTemplatesModal: React.FC<EmailTemplatesModalProps> = ({
  isOpen,
  onClose,
  templates,
  onUpdateTemplates,
  history,
  initialTemplateId = "paid_in_full_receipt"
}) => {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(initialTemplateId);
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");
  const [previewAttendeeIndex, setPreviewAttendeeIndex] = useState<number>(0);

  // Active template editing state
  const activeTemplate = useMemo(() => {
    return templates.find(t => t.id === selectedTemplateId) || templates[0] || DEFAULT_EMAIL_TEMPLATES[0];
  }, [templates, selectedTemplateId]);

  const [editSubject, setEditSubject] = useState<string>(activeTemplate?.subject || "");
  const [editBody, setEditBody] = useState<string>(activeTemplate?.body || "");
  const [editName, setEditName] = useState<string>(activeTemplate?.name || "");
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [activeField, setActiveField] = useState<"subject" | "body">("body");

  const subjectInputRef = useRef<HTMLInputElement>(null);
  const bodyTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync state whenever activeTemplate changes
  React.useEffect(() => {
    if (activeTemplate) {
      setEditSubject(activeTemplate.subject);
      setEditBody(activeTemplate.body);
      setEditName(activeTemplate.name);
      setSaveSuccess(false);
    }
  }, [activeTemplate]);

  // If initialTemplateId prop changes while open
  React.useEffect(() => {
    if (initialTemplateId && templates.some(t => t.id === initialTemplateId)) {
      setSelectedTemplateId(initialTemplateId);
    }
  }, [initialTemplateId, templates]);

  if (!isOpen) return null;

  // Detroit word detection in active inputs
  const subjectHasDetroit = containsDetroitWord(editSubject);
  const bodyHasDetroit = containsDetroitWord(editBody);
  const anyDetroitDetected = subjectHasDetroit || bodyHasDetroit;

  // Handle automatic removal of "Detroit"
  const handleAutoRemoveDetroit = () => {
    setEditSubject(sanitizeEmailText(editSubject));
    setEditBody(sanitizeEmailText(editBody));
  };

  // Insert token at cursor position
  const handleInsertToken = (tokenTag: string) => {
    if (activeField === "subject") {
      const input = subjectInputRef.current;
      if (!input) {
        setEditSubject(prev => prev + " " + tokenTag);
        return;
      }
      const start = input.selectionStart || 0;
      const end = input.selectionEnd || 0;
      const next = editSubject.substring(0, start) + tokenTag + editSubject.substring(end);
      setEditSubject(next);
      setTimeout(() => {
        input.focus();
        input.setSelectionRange(start + tokenTag.length, start + tokenTag.length);
      }, 0);
    } else {
      const textarea = bodyTextareaRef.current;
      if (!textarea) {
        setEditBody(prev => prev + " " + tokenTag);
        return;
      }
      const start = textarea.selectionStart || 0;
      const end = textarea.selectionEnd || 0;
      const next = editBody.substring(0, start) + tokenTag + editBody.substring(end);
      setEditBody(next);
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + tokenTag.length, start + tokenTag.length);
      }, 0);
    }
  };

  // Reset current template to clean default
  const handleResetToDefault = () => {
    const def = DEFAULT_EMAIL_TEMPLATES.find(t => t.id === selectedTemplateId);
    if (!def) return;
    if (window.confirm(`Reset "${def.name}" to its original default wording?`)) {
      setEditSubject(def.subject);
      setEditBody(def.body);
      setEditName(def.name);
    }
  };

  // Save changes
  const handleSaveTemplate = async () => {
    setIsSaving(true);
    try {
      // 1. Sanitize to strictly guarantee no "Detroit"
      const cleanSubject = sanitizeEmailText(editSubject.trim());
      const cleanBody = sanitizeEmailText(editBody.trim());
      const cleanName = sanitizeEmailText(editName.trim()) || activeTemplate.name;

      const updatedTemplate: SystemEmailTemplate = {
        ...activeTemplate,
        name: cleanName,
        subject: cleanSubject,
        body: cleanBody,
        updatedAt: new Date().toISOString()
      };

      const nextList = templates.map(t => t.id === updatedTemplate.id ? updatedTemplate : t);

      // 2. Save to Firestore
      try {
        await saveEmailTemplateToFirestore(db, updatedTemplate);
      } catch (err) {
        console.warn("Firestore save failed, saving locally:", err);
      }

      // 3. Save to localStorage
      saveEmailTemplatesToStorage(nextList);

      // 4. Update parent state
      onUpdateTemplates(nextList);

      setEditSubject(cleanSubject);
      setEditBody(cleanBody);
      setEditName(cleanName);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error("Failed to save email template:", err);
    } finally {
      setIsSaving(false);
    }
  };

  // Create new custom template
  const handleCreateNewCustomTemplate = () => {
    const newId = `custom_template_${Date.now()}`;
    const newTemplate: SystemEmailTemplate = {
      id: newId,
      name: "New Custom Broadcast Template",
      category: "Custom",
      badgeColor: "bg-purple-100 text-purple-900 border-purple-200",
      description: "Custom user-defined template for targeted announcements.",
      defaultFilter: "all",
      subject: "BBI Homecoming 2026: Notice for {{fullName}}",
      body: `Dear Brother {{fullName}},\n\n[Write your customized message here]\n\nFraternally,\nBBI Homecoming Committee`,
      isCustom: true,
      updatedAt: new Date().toISOString()
    };

    const nextList = [...templates, newTemplate];
    saveEmailTemplatesToStorage(nextList);
    onUpdateTemplates(nextList);
    setSelectedTemplateId(newId);
  };

  // Delete custom template
  const handleDeleteCustomTemplate = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this custom template?")) return;
    const nextList = templates.filter(t => t.id !== id);
    saveEmailTemplatesToStorage(nextList);
    onUpdateTemplates(nextList);
    if (selectedTemplateId === id) {
      setSelectedTemplateId(templates[0]?.id || "paid_in_full_receipt");
    }
  };

  // Mock / real attendee for preview
  const previewAttendee: HistoryEntry = history[previewAttendeeIndex] || {
    ref: "BBI-HMC26-SAMPLE",
    date: new Date().toISOString(),
    formData: {
      fullName: "Bro. Marcus Vance",
      email: "marcus.vance@example.com",
      phone: "(313) 555-0199",
      shippingAddress: {
        street: "1906 Heritage Blvd",
        city: "Southfield",
        state: "MI",
        zipCode: "48075"
      },
      shirtSize: "XL",
      specialRequests: "Tailgate brotherhood seating",
      selectedPackageId: "langston-taylor",
      addFootballTicket: true,
      addDetroitJacket: true,
      jacketSize: "XL",
      jacketCrossingYear: "Spring 2012",
      jacketLineName: "The Sovereign 7",
      jacketEntireLineName: "The Unbreakable Vanguard",
      jacketLineNumber: "3"
    },
    paymentTransactions: [
      {
        id: "tx-1",
        date: "2026-07-15",
        amount: 75,
        method: "Zelle",
        notes: "July 19 Milestone Deposit"
      }
    ]
  };

  const previewSubject = sanitizeEmailText(replaceMergeTokens(editSubject, previewAttendee));
  const previewBody = sanitizeEmailText(replaceMergeTokens(editBody, previewAttendee));

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5"
      id="email-templates-modal-overlay"
    >
      <div 
        className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        id="email-templates-modal-card"
      >
        {/* Top Header */}
        <div className="bg-slate-950 px-5 py-4 flex items-center justify-between text-white border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display font-extrabold text-base tracking-tight text-white">
                  System Email Templates Manager
                </h3>
                <span className="flex items-center gap-1 bg-emerald-950 text-emerald-300 border border-emerald-800/80 px-2 py-0.5 rounded-full text-[10px] font-bold">
                  <ShieldCheck className="w-3 h-3" />
                  No &quot;Detroit&quot; Enforced
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Update wording, schedules, and merge fields for all automated and broadcast emails.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            title="Close Template Manager"
            id="close-email-templates-modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Detroit Word Policy Banner */}
        <div className="bg-gradient-to-r from-indigo-50 via-blue-50 to-slate-50 border-b border-indigo-100 px-5 py-2.5 flex items-center justify-between gap-3 text-xs text-indigo-950">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-indigo-600 flex-shrink-0" />
            <span>
              <strong>System Policy:</strong> All emails from this system are configured without the word &quot;Detroit&quot;. Any accidental inclusions are automatically sanitized upon save.
            </span>
          </div>
          {anyDetroitDetected && (
            <button
              type="button"
              onClick={handleAutoRemoveDetroit}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white font-bold text-[11px] rounded-md shadow-xs cursor-pointer transition-colors flex-shrink-0 animate-pulse"
              id="clean-detroit-btn"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Clean &quot;Detroit&quot; from Draft</span>
            </button>
          )}
        </div>

        {/* Modal Main Body: 2 Columns */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          
          {/* Left Sidebar: Template Directory */}
          <div className="w-full md:w-80 bg-slate-50 border-r border-slate-200 flex flex-col flex-shrink-0 overflow-y-auto">
            <div className="p-3.5 border-b border-slate-200 flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                System Templates ({templates.length})
              </span>
              <button
                type="button"
                onClick={handleCreateNewCustomTemplate}
                className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-white hover:bg-indigo-50 px-2 py-1 rounded-md border border-slate-200 shadow-2xs transition-colors cursor-pointer"
                title="Create a new custom template"
                id="create-custom-template-btn"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New</span>
              </button>
            </div>

            <div className="p-2 space-y-1.5">
              {templates.map(tmpl => {
                const isSelected = tmpl.id === selectedTemplateId;
                return (
                  <div
                    key={tmpl.id}
                    onClick={() => setSelectedTemplateId(tmpl.id)}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                      isSelected 
                        ? "bg-white border-indigo-400 shadow-sm ring-2 ring-indigo-500/10" 
                        : "bg-white/80 hover:bg-white border-slate-200 text-slate-700 hover:border-slate-300"
                    }`}
                    id={`template-tab-${tmpl.id}`}
                  >
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${tmpl.badgeColor || "bg-slate-100 text-slate-800 border-slate-200"}`}>
                        {tmpl.category}
                      </span>
                      {tmpl.isCustom && (
                        <button
                          type="button"
                          onClick={(e) => handleDeleteCustomTemplate(tmpl.id, e)}
                          className="text-slate-400 hover:text-red-600 p-1 rounded hover:bg-red-50 transition-colors"
                          title="Delete custom template"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <h4 className={`text-xs font-bold leading-tight ${isSelected ? "text-indigo-950" : "text-slate-900"}`}>
                      {tmpl.name}
                    </h4>
                    <p className="text-[11px] text-slate-500 line-clamp-2 mt-1 leading-snug">
                      {tmpl.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Workspace: Editor & Live Preview */}
          <div className="flex-1 flex flex-col bg-white overflow-hidden">
            
            {/* Top Workspace Toolbar */}
            <div className="px-5 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50/70">
              <div className="flex items-center gap-2">
                <div className="flex bg-slate-200/80 p-0.5 rounded-lg border border-slate-300">
                  <button
                    type="button"
                    onClick={() => setActiveTab("edit")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
                      activeTab === "edit"
                        ? "bg-white text-indigo-900 shadow-2xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                    id="tab-edit-template"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit Template</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("preview")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
                      activeTab === "preview"
                        ? "bg-white text-indigo-900 shadow-2xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                    id="tab-preview-template"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Live Attendee Preview</span>
                  </button>
                </div>

                {saveSuccess && (
                  <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-md animate-in fade-in">
                    <Check className="w-3.5 h-3.5" />
                    Template Saved!
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {DEFAULT_EMAIL_TEMPLATES.some(d => d.id === selectedTemplateId) && (
                  <button
                    type="button"
                    onClick={handleResetToDefault}
                    className="flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-slate-900 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer shadow-2xs"
                    title="Reset to clean default wording"
                    id="reset-template-default-btn"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
                    <span>Reset Default</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleSaveTemplate}
                  disabled={isSaving}
                  className="flex items-center gap-1.5 text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 px-4 py-1.5 rounded-lg shadow-sm cursor-pointer transition-all"
                  id="save-template-btn"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSaving ? "Saving..." : "Save Template"}</span>
                </button>
              </div>
            </div>

            {/* Editor Tab Content */}
            {activeTab === "edit" ? (
              <div className="flex-1 p-5 overflow-y-auto space-y-4">
                
                {/* Template Name & Category */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Template Title
                    </label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full text-xs font-bold px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                      placeholder="e.g. Paid in Full Official Receipt"
                      id="input-template-title"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Category
                    </label>
                    <span className="inline-block px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 w-full text-center">
                      {activeTemplate.category}
                    </span>
                  </div>
                </div>

                {/* Subject Line */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <span>Email Subject Line</span>
                      {subjectHasDetroit && (
                        <span className="text-[10px] text-amber-700 bg-amber-100 font-bold px-1.5 py-0.2 rounded border border-amber-200">
                          &quot;Detroit&quot; detected
                        </span>
                      )}
                    </label>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {editSubject.length} chars
                    </span>
                  </div>
                  <input
                    ref={subjectInputRef}
                    type="text"
                    value={editSubject}
                    onFocus={() => setActiveField("subject")}
                    onChange={(e) => setEditSubject(e.target.value)}
                    className={`w-full text-xs font-semibold px-3 py-2.5 border rounded-lg focus:ring-2 outline-none font-mono ${
                      subjectHasDetroit 
                        ? "border-amber-400 bg-amber-50/20 focus:ring-amber-400" 
                        : "border-slate-300 bg-white focus:ring-indigo-500 focus:border-indigo-500"
                    }`}
                    placeholder="Subject line with dynamic tokens..."
                    id="input-template-subject"
                  />
                </div>

                {/* Merge Tokens Inserter Toolbar */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-600 flex items-center gap-1">
                      <Tag className="w-3 h-3 text-indigo-600" />
                      Insert Dynamic Merge Tokens (Target: {activeField === "subject" ? "Subject" : "Body"})
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Click any token to insert at cursor
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                    {EMAIL_MERGE_TOKENS.map(token => (
                      <button
                        key={token.tag}
                        type="button"
                        onClick={() => handleInsertToken(token.tag)}
                        className="px-2 py-1 bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 rounded text-[11px] font-mono font-semibold text-slate-700 hover:text-indigo-700 transition-colors shadow-2xs cursor-pointer flex items-center gap-1"
                        title={`${token.label}: ${token.desc}`}
                      >
                        <span className="text-indigo-600">+</span>
                        <span>{token.tag}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Email Body Editor */}
                <div className="flex-1 flex flex-col min-h-[260px]">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <span>Email Body Content</span>
                      {bodyHasDetroit && (
                        <span className="text-[10px] text-amber-700 bg-amber-100 font-bold px-1.5 py-0.2 rounded border border-amber-200">
                          &quot;Detroit&quot; detected
                        </span>
                      )}
                    </label>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {editBody.split("\n").length} lines • {editBody.length} chars
                    </span>
                  </div>
                  <textarea
                    ref={bodyTextareaRef}
                    rows={12}
                    value={editBody}
                    onFocus={() => setActiveField("body")}
                    onChange={(e) => setEditBody(e.target.value)}
                    className={`w-full flex-1 p-3.5 text-xs font-mono border rounded-xl outline-none focus:ring-2 leading-relaxed resize-y ${
                      bodyHasDetroit 
                        ? "border-amber-400 bg-amber-50/20 focus:ring-amber-400 text-slate-900" 
                        : "border-slate-300 bg-white focus:ring-indigo-500 focus:border-indigo-500 text-slate-800"
                    }`}
                    placeholder="Compose email body with merge tokens..."
                    id="textarea-template-body"
                  />
                </div>

                {/* Bottom Detroit Removal Alert if active */}
                {anyDetroitDetected && (
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between gap-3 text-xs text-amber-900">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                      <span>
                        The word &quot;Detroit&quot; was detected in this template. Saving will automatically strip or replace it according to system rules.
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleAutoRemoveDetroit}
                      className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-xs cursor-pointer shadow-xs"
                    >
                      Strip &quot;Detroit&quot; Now
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* Live Preview Tab */
              <div className="flex-1 p-5 overflow-y-auto space-y-4 bg-slate-50/50">
                <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-700">
                      Previewing with Attendee:
                    </span>
                    {history.length > 0 ? (
                      <select
                        value={previewAttendeeIndex}
                        onChange={(e) => setPreviewAttendeeIndex(Number(e.target.value))}
                        className="text-xs font-bold border border-slate-300 rounded-lg px-2.5 py-1 bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                      >
                        {history.map((att, idx) => (
                          <option key={att.ref} value={idx}>
                            {att.formData.fullName} ({att.ref})
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-xs font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                        Bro. Marcus Vance (Sample)
                      </span>
                    )}
                  </div>

                  <div className="text-[11px] text-slate-500">
                    Preview rendered using active draft template
                  </div>
                </div>

                {/* Rendered Email Preview Container */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                  <div className="bg-slate-100 px-4 py-3 border-b border-slate-200 space-y-1 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-500 w-16">To:</span>
                      <span className="font-mono text-slate-800">{previewAttendee.formData.fullName} &lt;{previewAttendee.formData.email}&gt;</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-500 w-16">Subject:</span>
                      <span className="font-bold text-slate-900">{previewSubject}</span>
                    </div>
                  </div>
                  <div className="p-5 font-mono text-xs text-slate-800 whitespace-pre-wrap leading-relaxed">
                    {previewBody}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-100 px-5 py-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <span>Updates saved here apply to all 1-Click Mail Merge dispatches and Attendee email actions.</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-white hover:bg-slate-200 border border-slate-300 rounded-lg font-bold text-slate-700 cursor-pointer transition-colors shadow-2xs"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
