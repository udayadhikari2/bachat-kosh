"use client";

import { useState, useEffect } from "react";
import { X, KeyRound, Eye, EyeOff, Loader2, ShieldCheck, UserCog, Mail, Lock, User } from "lucide-react";
import { assignOrgAdmin, updateOrgAdminCredentials, getOrgAdminInfo } from "@/lib/actions/organization";

interface Props {
  org: { _id: string; name: string };
  onClose: () => void;
  onSuccess: () => void;
}

export default function OrgAdminCredentialsModal({ org, onClose, onSuccess }: Props) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [existingAdmin, setExistingAdmin] = useState<{ name: string; email: string } | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const isUpdate = !!existingAdmin;

  useEffect(() => {
    async function fetchAdmin() {
      setLoading(true);
      const res = await getOrgAdminInfo(org._id);
      if (res.success && res.admin) {
        setExistingAdmin(res.admin);
        setName(res.admin.name);
        setEmail(res.admin.email);
      }
      setLoading(false);
    }
    fetchAdmin();
  }, [org._id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!isUpdate && !name.trim()) return setError("Admin name is required");
    if (!isUpdate && !email.trim()) return setError("Email is required");
    if (!isUpdate && !password) return setError("Password is required");
    if (password && password !== confirmPassword) return setError("Passwords do not match");
    if (password && password.length < 6) return setError("Password must be at least 6 characters");

    setSubmitting(true);
    try {
      let res;
      if (isUpdate) {
        res = await updateOrgAdminCredentials(
          org._id,
          name !== existingAdmin?.name ? name : undefined,
          email !== existingAdmin?.email ? email : undefined,
          password || undefined
        );
      } else {
        res = await assignOrgAdmin(org._id, name, email, password);
      }

      if (!res.success) {
        setError(res.error || "Something went wrong");
      } else {
        setSuccess(isUpdate ? "Admin credentials updated!" : "Admin account created successfully!");
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 1200);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl shadow-black/50 animate-in fade-in zoom-in duration-200">

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${isUpdate ? "bg-amber-500/10" : "bg-emerald-500/10"}`}>
              {isUpdate
                ? <UserCog className="w-5 h-5 text-amber-400" />
                : <KeyRound className="w-5 h-5 text-emerald-400" />
              }
            </div>
            <div>
              <h2 className="text-white font-bold text-base">
                {loading ? "Loading..." : isUpdate ? "Update Admin Credentials" : "Assign Admin"}
              </h2>
              <p className="text-slate-500 text-xs mt-0.5 truncate max-w-[220px]">{org.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-500 hover:text-white hover:bg-slate-800 rounded-xl transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="p-12 flex justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">

            {/* Existing admin badge */}
            {isUpdate && (
              <div className="flex items-center gap-3 p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl">
                <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
                <div className="text-xs">
                  <p className="text-amber-300 font-bold">Admin already assigned</p>
                  <p className="text-slate-400 mt-0.5">Leave password blank to keep it unchanged</p>
                </div>
              </div>
            )}

            {/* Name */}
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block">
                Admin Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Bikash Adhikari"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 outline-none transition-all"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block">
                Email / Username
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="admin@organization.com"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 outline-none transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block">
                {isUpdate ? "New Password" : "Password"}
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder={isUpdate ? "Leave blank to keep current" : "Min. 6 characters"}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-12 py-3 text-sm text-white focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            {(!isUpdate || password) && (
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type={showConfirm ? "text" : "password"}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-12 py-3 text-sm text-white focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {/* Error / Success */}
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs font-medium">
                {error}
              </div>
            )}
            {success && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs font-medium flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" /> {success}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting}
              className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all active:scale-95 disabled:opacity-60 ${
                isUpdate
                  ? "bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-600/20"
                  : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20"
              }`}
            >
              {submitting
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</>
                : isUpdate
                  ? <><UserCog className="w-4 h-4" /> Update Credentials</>
                  : <><KeyRound className="w-4 h-4" /> Assign Admin</>
              }
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
