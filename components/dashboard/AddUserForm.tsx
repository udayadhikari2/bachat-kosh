"use client";

import { useState } from "react";
import { createUser, updateUser } from "@/lib/actions/user";
import { 
  Loader2, 
  X, 
  UserPlus, 
  Mail, 
  Shield, 
  Building, 
  Key,
  AlertCircle 
} from "lucide-react";

interface AddUserFormProps {
  onClose: () => void;
  organizations?: any[]; 
  fixedOrgId?: string;   
  defaultRole?: "DEVELOPER" | "ADMIN" | "USER";
  initialData?: any;
  isDeveloperMode?: boolean;
}

export default function AddUserForm({ 
  onClose, 
  organizations = [], 
  fixedOrgId,
  defaultRole = "USER",
  initialData,
  isDeveloperMode = false
}: AddUserFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(event.currentTarget);
    if (fixedOrgId && !formData.get("organizationId")) {
      formData.append("organizationId", fixedOrgId);
    }
    
    const result = initialData
      ? await updateUser(initialData._id, formData)
      : await createUser(formData);

    if (result.success) {
      onClose();
    } else {
      setError(result.error || "Something went wrong");
    }
    setLoading(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in duration-300">
        <div className="flex justify-between items-center p-6 border-b border-slate-800 bg-slate-900/50">
          <h2 className="text-xl font-bold text-white flex items-center">
            <UserPlus className="w-5 h-5 mr-2 text-emerald-400" />
            {initialData ? "Edit User Account" : "Add New Member"}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl flex items-center">
              <AlertCircle className="w-4 h-4 mr-2" />
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Full Name</label>
              <input
                name="name"
                required
                defaultValue={initialData?.name}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-emerald-500/50 outline-none transition-all"
                placeholder="John Doe"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    name="email"
                    type="email"
                    required
                    defaultValue={initialData?.email}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-12 pr-4 py-3 text-white focus:ring-2 focus:ring-emerald-500/50 outline-none transition-all"
                    placeholder="john@example.com"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Role</label>
                <div className="relative">
                  <Shield className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <select
                    name="role"
                    defaultValue={initialData?.role || defaultRole}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-12 pr-4 py-3 text-white focus:ring-2 focus:ring-emerald-500/50 outline-none transition-all appearance-none"
                  >
                    <option value="ADMIN">Admin (Manager)</option>
                    <option value="USER">User (Member)</option>
                  </select>
                </div>
              </div>
            </div>

            {!fixedOrgId && organizations.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Assigned Organization</label>
                <div className="relative">
                  <Building className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <select
                    name="organizationId"
                    required
                    defaultValue={initialData?.organizationId?._id || initialData?.organizationId || ""}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-12 pr-4 py-3 text-white focus:ring-2 focus:ring-emerald-500/50 outline-none transition-all appearance-none"
                  >
                    <option value="">Select Organization</option>
                    {organizations.map((org) => (
                      <option key={org._id} value={org._id}>{org.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Account Number</label>
                <input
                  name="accountNumber"
                  defaultValue={initialData?.accountNumber}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-emerald-500/50 outline-none transition-all"
                  placeholder="KOSH-001"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Initial Password</label>
                <div className="relative">
                  <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    name="password"
                    defaultValue={initialData ? "" : "User@123"}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-12 pr-4 py-3 text-white focus:ring-2 focus:ring-emerald-500/50 outline-none transition-all"
                    placeholder={initialData ? "Leave blank to keep current" : "User@123"}
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-4 pt-2">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  name="isLoanApprover"
                  id="isLoanApprover"
                  value="true"
                  defaultChecked={initialData?.isLoanApprover}
                  className="w-4 h-4 rounded border-slate-800 bg-slate-950 text-emerald-500 focus:ring-emerald-500/50"
                />
                <label htmlFor="isLoanApprover" className="text-sm font-medium text-slate-300">
                  Loan Approver
                </label>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  name="isSecondaryAdmin"
                  id="isSecondaryAdmin"
                  value="true"
                  defaultChecked={initialData?.isSecondaryAdmin}
                  className="w-4 h-4 rounded border-slate-800 bg-slate-950 text-emerald-500 focus:ring-emerald-500/50"
                />
                <label htmlFor="isSecondaryAdmin" className="text-sm font-medium text-slate-300">
                  Secondary Admin
                </label>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-4 pt-6 mt-6 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 text-sm font-medium text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-emerald-600/20 transition-all flex items-center disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (initialData ? "Update Account" : "Create Member")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
