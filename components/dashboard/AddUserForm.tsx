"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useSession } from "next-auth/react";
import { createUser, updateUser, deleteUser, verifyAdminPassword } from "@/lib/actions/user";
import { 
  Loader2, 
  X, 
  UserPlus, 
  Mail, 
  Shield, 
  Key,
  AlertCircle,
  Hash,
  Briefcase,
  ShieldCheck,
  Zap,
  Info,
  Camera,
  Calendar,
  User as UserIcon,
  FileText,
  MapPin,
  Search,
  CheckCircle2,
  Plus,
  Trash2,
  Lock,
  ChevronDown,
  UserMinus,
  Users as UsersIcon
} from "lucide-react";
import Image from "next/image";
import { toast } from "react-hot-toast";

interface AddUserFormProps {
  onClose: () => void;
  organizations?: any[]; 
  users?: any[];
  fixedOrgId?: string;   
  defaultRole?: "DEVELOPER" | "ADMIN" | "USER";
  initialData?: any;
  isDeveloperMode?: boolean;
}

const RELATIONSHIP_OPTIONS = [
  "Husband/Wife",
  "Father",
  "Mother",
  "Son/Daughter",
  "Grandfather",
  "Grandmother",
  "Other"
];

export default function AddUserForm({ 
  onClose, 
  organizations = [], 
  users = [],
  fixedOrgId,
  defaultRole = "USER",
  initialData,
  isDeveloperMode = false
}: AddUserFormProps) {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(initialData?.profileImage || null);
  const [compressedBlob, setCompressedBlob] = useState<Blob | null>(null);
  const [isMinor, setIsMinor] = useState(initialData?.isMinor || false);
  
  const [selectedFamilyMembers, setSelectedFamilyMembers] = useState<any[]>(
    initialData?.familyMembers?.map((f: any) => ({
      memberId: f.memberId?._id || f.memberId,
      relationship: f.relationship || ""
    })) || []
  );
  
  const [showFamilySelector, setShowFamilySelector] = useState(false);
  const [familySearchQuery, setFamilySearchQuery] = useState("");
  
  // Real-time validation
  const [accountNumber, setAccountNumber] = useState(initialData?.accountNumber || "");
  const [accountNumberError, setAccountNumberError] = useState("");
  
  // Guardian Search
  const [guardianId, setGuardianId] = useState(initialData?.guardianId || "");
  const [guardianSearchQuery, setGuardianSearchQuery] = useState("");
  const [showGuardianResults, setShowGuardianResults] = useState(false);
  
  // Delete Confirmation State
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  const compressImage = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new (window as any).Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 800;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0, width, height);

          // Iterate quality to get under 100kb
          let quality = 0.7;
          const step = 0.1;
          
          const attemptCompression = (q: number) => {
            canvas.toBlob((blob) => {
              if (!blob) {
                reject(new Error("Canvas toBlob failed"));
                return;
              }
              if (blob.size < 100 * 1024 || q < 0.1) {
                resolve(blob);
              } else {
                attemptCompression(q - step);
              }
            }, "image/jpeg", q);
          };

          attemptCompression(quality);
        };
        img.onerror = (err: any) => reject(err);
      };
      reader.onerror = (err: any) => reject(err);
    });
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        setLoading(true);
        // Show preview immediately
        const previewReader = new FileReader();
        previewReader.onloadend = () => setImagePreview(previewReader.result as string);
        previewReader.readAsDataURL(file);

        // Compress in background
        const compressed = await compressImage(file);
        setCompressedBlob(compressed);
        setLoading(false);
      } catch (err: any) {
        console.error("Compression failed:", err);
        setLoading(false);
      }
    }
  };

  const handleDobChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dob = new Date(e.target.value);
    if (!isNaN(dob.getTime())) {
      const age = new Date().getFullYear() - dob.getFullYear();
      setIsMinor(age < 16);
    }
  };

  const handleAccountNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.trim();
    setAccountNumber(value);
    
    if (!value) {
      setAccountNumberError("Account number is required");
      return;
    }

    const isDuplicate = users.some(u => 
      u.accountNumber?.toLowerCase() === value.toLowerCase() && 
      u._id !== initialData?._id
    );

    if (isDuplicate) {
      setAccountNumberError("This account number is already assigned");
    } else {
      setAccountNumberError("");
    }
  };

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (accountNumberError) return;
    
    setLoading(true);
    setError("");

    const formData = new FormData(event.currentTarget);
    if (fixedOrgId && !formData.get("organizationId")) {
      formData.append("organizationId", fixedOrgId);
    }
    
    // Replace profileImage with compressed blob if available
    if (compressedBlob) {
      formData.delete("profileImage");
      formData.append("profileImage", compressedBlob, "profile.jpg");
    }
    
    formData.append("familyMembers", JSON.stringify(selectedFamilyMembers));
    
    const result = initialData
      ? await updateUser(initialData._id, formData)
      : await createUser(formData);

    if (result.success) {
      toast.success(initialData ? "Member synchronized" : "Member enrolled successfully");
      onClose();
    } else {
      setError(result.error || "Something went wrong");
    }
    setLoading(false);
  }

  const handleDelete = async () => {
    if (!adminPassword) {
      setDeleteError("Administrator password required");
      return;
    }

    setIsDeleting(true);
    setDeleteError("");

    try {
      const currentUser = session?.user as any;
      const verifyResult = await verifyAdminPassword(currentUser.id, adminPassword);
      
      if (!verifyResult.success) {
        setDeleteError("Invalid administrator password");
        setIsDeleting(false);
        return;
      }

      const result = await deleteUser(initialData._id);
      if (result.success) {
        toast.success("User deleted successfully");
        onClose();
      } else {
        setDeleteError(result.error || "Failed to delete user");
      }
    } catch (err: any) {
      setDeleteError(err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleFamilyMember = (userId: string) => {
    setSelectedFamilyMembers(prev => {
      const exists = prev.find(p => p.memberId === userId);
      if (exists) {
        return prev.filter(p => p.memberId !== userId);
      } else {
        return [...prev, { memberId: userId, relationship: "" }];
      }
    });
  };

  const updateRelationship = (userId: string, rel: string) => {
    setSelectedFamilyMembers(prev => prev.map(p => 
      p.memberId === userId ? { ...p, relationship: rel } : p
    ));
  };

  const filteredUsers = useMemo(() => {
    return users.filter(u => 
      u._id !== initialData?._id &&
      u.role === "USER" &&
      (u.name.toLowerCase().includes(familySearchQuery.toLowerCase()) || 
       u.accountNumber?.toLowerCase().includes(familySearchQuery.toLowerCase()))
    );
  }, [users, familySearchQuery, initialData]);

  const filteredGuardians = useMemo(() => {
    return users.filter(u => 
      !u.isMinor && 
      u._id !== initialData?._id &&
      (u.name.toLowerCase().includes(guardianSearchQuery.toLowerCase()) || 
       u.accountNumber?.toLowerCase().includes(guardianSearchQuery.toLowerCase()))
    );
  }, [users, guardianSearchQuery, initialData]);

  // Helper to get user data from ID for the main form list
  const getSelectedUserDetails = (userId: string) => {
    return users.find(u => u._id === userId);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl animate-in fade-in duration-500 overflow-hidden">
      <div className="w-full max-w-5xl bg-slate-950 border border-white/10 rounded-[40px] shadow-[0_0_100px_rgba(0,0,0,0.9)] overflow-hidden animate-in zoom-in-95 duration-500 relative flex flex-col max-h-[92vh] ring-1 ring-white/10">
        
        {/* Header */}
        <div className="flex justify-between items-center px-8 py-5 border-b border-white/5 bg-white/[0.02] relative z-10 shrink-0">
          <div className="flex items-center gap-4">
             <div className="w-10 h-10 bg-emerald-500/10 rounded-xl border border-white/10 flex items-center justify-center">
                <UserPlus className="w-5 h-5 text-emerald-400" />
             </div>
             <div>
                <h2 className="text-lg font-black text-white uppercase tracking-tight">
                  {initialData ? "Edit Member" : "New Member"}
                </h2>
                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Member Registration Form</p>
             </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl transition-all"
          >
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto custom-scrollbar relative z-10">
          <div className="px-8 py-6 space-y-8">
            {error && (
              <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] font-black uppercase tracking-widest rounded-xl flex items-center gap-3">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Profile Sidebar */}
              <div className="lg:col-span-3 space-y-6">
                 <div className="flex flex-col items-center">
                    <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                       <div className="w-40 h-40 rounded-3xl bg-slate-900 border-2 border-dashed border-white/10 flex items-center justify-center overflow-hidden transition-all group-hover:border-emerald-500/50">
                          {imagePreview ? (
                            <Image 
                              src={imagePreview} 
                              alt="Preview" 
                              fill 
                              sizes="160px"
                              className="object-cover" 
                            />
                          ) : (
                            <Camera className="w-8 h-8 text-slate-800" />
                          )}
                          <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                             <Camera className="w-5 h-5 text-white" />
                          </div>
                          {loading && compressedBlob === null && (
                            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center">
                               <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
                            </div>
                          )}
                       </div>
                       <input type="file" name="profileImage" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageChange} />
                    </div>
                    <div className="flex flex-col items-center mt-3">
                       <p className="text-[9px] text-slate-600 font-black uppercase tracking-widest">Profile Photo</p>
                       {compressedBlob && (
                         <p className="text-[8px] text-emerald-500 font-bold uppercase tracking-tight mt-1">Optimized: {(compressedBlob.size / 1024).toFixed(1)}KB</p>
                       )}
                    </div>
                 </div>

                 <div className="p-4 bg-white/[0.01] border border-white/5 rounded-2xl space-y-3">
                    <div className="flex items-center gap-2">
                       <FileText className="w-3.5 h-3.5 text-amber-500" />
                       <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Documents</span>
                    </div>
                    <label className="flex flex-col items-center justify-center w-full h-20 border-2 border-dashed border-white/5 rounded-xl hover:border-amber-500/30 transition-all cursor-pointer bg-slate-900/20">
                       <Plus className="w-4 h-4 text-slate-700" />
                       <span className="text-[8px] text-slate-600 font-bold uppercase mt-1">ID Document</span>
                       <input type="file" name="identityDocument" className="hidden" />
                    </label>
                 </div>

                 <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center gap-2">
                       <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
                       <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Permissions</span>
                    </div>
                    <div className="space-y-2">
                       <label className="flex items-center justify-between p-2 bg-slate-900/30 border border-white/5 rounded-lg cursor-pointer">
                          <span className="text-[10px] font-bold text-slate-400">Loan Approver</span>
                          <input type="checkbox" name="isLoanApprover" value="true" defaultChecked={initialData?.isLoanApprover} className="w-4 h-4 rounded border-white/10 bg-slate-950 text-emerald-500" />
                       </label>
                       <label className="flex items-center justify-between p-2 bg-slate-900/30 border border-white/5 rounded-lg cursor-pointer">
                          <span className="text-[10px] font-bold text-slate-400">Secondary Admin</span>
                          <input type="checkbox" name="isSecondaryAdmin" value="true" defaultChecked={initialData?.isSecondaryAdmin} className="w-4 h-4 rounded border-white/10 bg-slate-950 text-indigo-500" />
                       </label>
                    </div>
                 </div>
              </div>

              {/* Form Content */}
              <div className="lg:col-span-9 space-y-8">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Basic Info */}
                    <div className="space-y-5">
                       <div className="flex items-center gap-2 pb-2 border-b border-white/5">
                          <span className="text-[10px] font-black text-white uppercase tracking-widest">Basic Details</span>
                       </div>

                       <div className="space-y-4">
                          <div className="space-y-1.5">
                             <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Full Name</label>
                             <input name="name" required defaultValue={initialData?.name} className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-emerald-500/50 outline-none transition-all text-sm" placeholder="Member's legal name" />
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                             <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Nickname</label>
                                <input name="nickname" defaultValue={initialData?.nickname} className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-emerald-500/50 outline-none transition-all text-sm" placeholder="Optional" />
                             </div>
                             <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Gender</label>
                                <select name="gender" defaultValue={initialData?.gender} required className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 text-white text-sm">
                                  <option value="">Select...</option>
                                  <option value="Male">Male</option>
                                  <option value="Female">Female</option>
                                  <option value="Other">Other</option>
                                </select>
                             </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                             <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Email Address</label>
                                <input name="email" type="email" required defaultValue={initialData?.email} className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-emerald-500/50 outline-none transition-all text-sm" placeholder="email@example.com" />
                             </div>
                             <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Phone Number</label>
                                <input name="phoneNumber" type="tel" defaultValue={initialData?.phoneNumber} className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-emerald-500/50 outline-none transition-all text-sm" placeholder="e.g. 98XXXXXXXX" />
                             </div>
                          </div>
                          <div className="space-y-1.5">
                             <div className="flex items-center gap-4">
                                <div className="flex-1 space-y-1.5">
                                   <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Date of Birth</label>
                                   <input 
                                     name="dateOfBirth" 
                                     type="date" 
                                     required 
                                     defaultValue={initialData?.dateOfBirth ? new Date(initialData.dateOfBirth).toISOString().split('T')[0] : ""} 
                                     onChange={handleDobChange} 
                                     className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-emerald-500/50 outline-none transition-all text-sm" 
                                   />
                                </div>
                                <div className="pt-6">
                                   <label className="flex items-center gap-2 cursor-pointer group">
                                      <input 
                                        type="checkbox" 
                                        checked={isMinor} 
                                        onChange={(e) => setIsMinor(e.target.checked)}
                                        className="hidden" 
                                      />
                                      <div className={`w-5 h-5 rounded-md border transition-all flex items-center justify-center ${isMinor ? "bg-emerald-500 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]" : "bg-slate-950 border-white/10 group-hover:border-white/20"}`}>
                                         {isMinor && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                                      </div>
                                      <span className="text-[10px] font-black text-slate-500 group-hover:text-slate-300 uppercase tracking-widest transition-colors">Minor Member</span>
                                   </label>
                                </div>
                             </div>
                          </div>
                       </div>

                       {isMinor && (
                         <div className="p-5 bg-rose-500/[0.03] border border-rose-500/20 rounded-[24px] space-y-4 animate-in slide-in-from-top-2 duration-300 relative">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/[0.02] blur-[40px] -translate-y-1/2 translate-x-1/2 rounded-full pointer-events-none" />
                            <div className="flex items-center justify-between">
                               <span className="text-[9px] font-black text-rose-500 uppercase tracking-[0.2em] flex items-center gap-2">
                                  <Info className="w-3.5 h-3.5" /> Guardian Requirement
                               </span>
                            </div>

                            <div className="relative">
                               <input type="hidden" name="guardianId" value={guardianId} />
                               
                               {!guardianId ? (
                                 <div className="space-y-3">
                                   <div className="relative group">
                                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-emerald-500 transition-colors" />
                                      <input 
                                        type="text" 
                                        placeholder="Search for a guardian (name or account)..." 
                                        value={guardianSearchQuery}
                                        onChange={(e) => {
                                          setGuardianSearchQuery(e.target.value);
                                          setShowGuardianResults(true);
                                        }}
                                        onFocus={() => setShowGuardianResults(true)}
                                        className="w-full bg-slate-950 border border-white/10 rounded-2xl pl-11 pr-4 py-3 text-white text-xs outline-none focus:border-emerald-500/50 transition-all shadow-inner" 
                                      />
                                   </div>

                                   {showGuardianResults && (guardianSearchQuery || filteredGuardians.length > 0) && (
                                     <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-[110] max-h-60 overflow-y-auto custom-scrollbar animate-in fade-in slide-in-from-top-1 duration-200">
                                       {filteredGuardians.length > 0 ? (
                                         filteredGuardians.map(u => (
                                           <button
                                             key={u._id}
                                             type="button"
                                             onClick={() => {
                                               setGuardianId(u._id);
                                               setGuardianSearchQuery("");
                                               setShowGuardianResults(false);
                                             }}
                                             className="w-full flex items-center gap-3 p-3 hover:bg-white/5 transition-all text-left group border-b border-white/[0.02] last:border-0"
                                           >
                                              <div className="w-9 h-9 rounded-xl bg-slate-800 border border-white/10 flex items-center justify-center overflow-hidden relative shadow-lg">
                                                 {u.profileImage ? (
                                                   <Image src={u.profileImage} alt={u.name} fill sizes="36px" className="object-cover" />
                                                 ) : (
                                                   <span className="text-[10px] font-black text-slate-500">{u.name.charAt(0)}</span>
                                                 )}
                                              </div>
                                              <div className="flex-1 min-w-0">
                                                 <div className="text-xs font-bold text-slate-200 group-hover:text-white transition-colors truncate">{u.name}</div>
                                                 <div className="text-[9px] font-black text-slate-600 group-hover:text-emerald-500/60 transition-colors uppercase tracking-widest">{u.accountNumber}</div>
                                              </div>
                                              <Plus className="w-4 h-4 text-slate-700 group-hover:text-emerald-500 transition-all opacity-0 group-hover:opacity-100" />
                                           </button>
                                         ))
                                       ) : (
                                         <div className="p-8 text-center">
                                            <UsersIcon className="w-8 h-8 text-slate-800 mx-auto mb-2" />
                                            <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">No candidates found</p>
                                         </div>
                                       )}
                                     </div>
                                   )}
                                 </div>
                               ) : (
                                 <div className="flex items-center justify-between p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl group/selected">
                                    <div className="flex items-center gap-4">
                                       <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center overflow-hidden relative shadow-lg">
                                          {getSelectedUserDetails(guardianId)?.profileImage ? (
                                            <Image 
                                              src={getSelectedUserDetails(guardianId)!.profileImage} 
                                              alt="Guardian" 
                                              fill 
                                              sizes="44px"
                                              className="object-cover" 
                                            />
                                          ) : (
                                            <UserIcon className="w-5 h-5 text-emerald-500" />
                                          )}
                                       </div>
                                       <div>
                                          <div className="text-xs font-black text-white uppercase tracking-tight">{getSelectedUserDetails(guardianId)?.name}</div>
                                          <div className="text-[9px] font-bold text-emerald-500/60 uppercase tracking-widest mt-0.5">#{getSelectedUserDetails(guardianId)?.accountNumber} — Assigned Guardian</div>
                                       </div>
                                    </div>
                                    <button 
                                      type="button" 
                                      onClick={() => setGuardianId("")}
                                      className="p-2 text-slate-600 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all"
                                    >
                                       <X className="w-4 h-4" />
                                    </button>
                                 </div>
                               )}
                            </div>
                         </div>
                       )}
                    </div>
                    {/* System Access */}
                    <div className="space-y-5">
                       <div className="flex items-center gap-2 pb-2 border-b border-white/5">
                          <span className="text-[10px] font-black text-white uppercase tracking-widest">System Info</span>
                       </div>

                       <div className="space-y-4">
                          {!fixedOrgId && organizations.length > 0 && (
                            <div className="space-y-1.5">
                               <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Organization</label>
                               <select name="organizationId" required defaultValue={initialData?.organizationId?._id || initialData?.organizationId || ""} className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 text-white text-sm">
                                 <option value="">Select Organization</option>
                                 {organizations.map((org) => (
                                   <option key={org._id} value={org._id}>{org.name}</option>
                                 ))}
                               </select>
                            </div>
                          )}
                          <div className="space-y-1.5">
                             <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Account Number</label>
                             <div className="relative">
                               <input 
                                 name="accountNumber" 
                                 required 
                                 value={accountNumber}
                                 onChange={handleAccountNumberChange}
                                 className={`w-full bg-slate-950/50 border rounded-xl px-4 py-3 text-white font-mono text-sm outline-none transition-all ${accountNumberError ? "border-rose-500/50 focus:border-rose-500" : "border-white/10 focus:border-emerald-500/50"}`} 
                                 placeholder="e.g. HB-101" 
                               />
                               {accountNumberError && (
                                 <div className="absolute top-full left-1 mt-1 text-[9px] font-black text-rose-500 uppercase tracking-widest flex items-center gap-1">
                                    <AlertCircle className="w-2.5 h-2.5" />
                                    {accountNumberError}
                                 </div>
                               )}
                             </div>
                          </div>
                          <div className="space-y-1.5 pt-2">
                             <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">User Role</label>
                             <select name="role" defaultValue={initialData?.role || defaultRole} className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 text-white text-sm">
                               <option value="USER">Member</option>
                               <option value="ADMIN">Admin</option>
                             </select>
                          </div>
                          <div className="space-y-1.5">
                             <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Password</label>
                             <input name="password" type="password" defaultValue={initialData ? "" : "User@123"} className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 text-white text-sm font-mono" placeholder={initialData ? "Leave empty to keep current" : "Default: User@123"} />
                          </div>
                       </div>
                    </div>
                 </div>

                 {/* Location & Family */}
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-5">
                       <div className="flex items-center gap-2 pb-2 border-b border-white/5">
                          <span className="text-[10px] font-black text-white uppercase tracking-widest">Address</span>
                       </div>
                       <div className="space-y-3">
                          <input name="street" placeholder="Street / Ward No." defaultValue={initialData?.address?.street} className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 text-white text-sm" />
                          <div className="grid grid-cols-2 gap-3">
                             <input name="city" placeholder="City" defaultValue={initialData?.address?.city} className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 text-white text-sm" />
                             <input name="zip" placeholder="Zip Code" defaultValue={initialData?.address?.zip} className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 text-white text-sm" />
                          </div>
                       </div>
                    </div>

                    <div className="space-y-5">
                       <div className="flex items-center justify-between pb-2 border-b border-white/5">
                          <span className="text-[10px] font-black text-white uppercase tracking-widest">Family Network</span>
                          <button type="button" onClick={() => setShowFamilySelector(true)} className="flex items-center gap-1.5 px-3 py-1 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/20 rounded-lg text-[9px] font-black uppercase transition-all">
                             <Plus className="w-3 h-3" /> Link More
                          </button>
                       </div>
                       
                       <div className="space-y-2 min-h-[100px]">
                          {selectedFamilyMembers.length > 0 ? (
                            <div className="grid grid-cols-1 gap-2">
                               {selectedFamilyMembers.map((fam, idx) => {
                                 const u = getSelectedUserDetails(fam.memberId);
                                 return (
                                   <div key={fam.memberId || `fam-${idx}`} className="flex items-center justify-between p-3 bg-white/[0.02] border border-white/5 rounded-xl group hover:border-purple-500/20 transition-all">
                                      <div className="flex items-center gap-3">
                                         <div className="w-8 h-8 rounded-lg bg-slate-900 border border-white/5 flex items-center justify-center text-[10px] font-black text-slate-500 overflow-hidden relative">
                                            {u?.profileImage ? (
                                              <Image 
                                                src={u.profileImage} 
                                                alt={u.name} 
                                                fill 
                                                sizes="32px"
                                                className="object-cover" 
                                              />
                                            ) : (
                                              u?.name?.charAt(0) || "?"
                                            )}
                                         </div>
                                         <div>
                                            <div className="text-[11px] font-bold text-slate-200">{u?.name || "Member"}</div>
                                            <div className="text-[8px] font-black text-purple-400 uppercase tracking-widest">{fam.relationship || "Linked"}</div>
                                         </div>
                                      </div>
                                      <button 
                                        type="button" 
                                        onClick={() => toggleFamilyMember(fam.memberId)}
                                        className="p-1.5 text-slate-700 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all"
                                      >
                                         <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                   </div>
                                 );
                               })}
                            </div>
                          ) : (
                            <div className="h-full flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-2xl py-6 opacity-30">
                               <UsersIcon className="w-6 h-6 text-slate-600 mb-2" />
                               <span className="text-[9px] font-bold uppercase tracking-widest">No Connections</span>
                            </div>
                          )}
                       </div>
                    </div>
                 </div>

                 {/* Actions */}
                 <div className="pt-8 flex justify-between items-center gap-3">
                    <div className="flex items-center">
                       {initialData && (
                         <button
                           type="button"
                           onClick={() => setShowDeleteConfirm(true)}
                           className="flex items-center gap-2 px-6 py-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-rose-500/20"
                         >
                           <Trash2 className="w-3.5 h-3.5" />
                           Delete Profile
                         </button>
                       )}
                    </div>

                    <div className="flex items-center gap-3">
                      <button type="button" onClick={onClose} className="px-6 py-3 text-[10px] font-black text-slate-500 hover:text-white uppercase tracking-widest transition-all">
                        Cancel
                      </button>
                      <button type="submit" disabled={loading || !!accountNumberError} className="bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl transition-all flex items-center gap-2 disabled:opacity-50">
                        {loading ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (initialData ? "Save Changes" : "Create Member")}
                      </button>
                    </div>
                 </div>
              </div>
            </div>
          </div>
        </form>

        {/* Delete Confirmation Overlay */}
        {showDeleteConfirm && (
          <div className="absolute inset-0 z-[120] bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-8 animate-in fade-in duration-300">
            <div className="w-full max-w-md space-y-8 text-center">
               <div className="inline-flex p-6 bg-rose-500/10 rounded-[32px] border border-rose-500/20 mb-4 animate-bounce">
                  <Trash2 className="w-10 h-10 text-rose-500" />
               </div>
               
               <div className="space-y-2">
                  <h3 className="text-2xl font-black text-white uppercase tracking-tight">Security Verification</h3>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Permanent deletion requires administrator authorization</p>
               </div>

               <div className="space-y-4 pt-4">
                  <div className="relative group">
                     <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 group-focus-within:text-rose-500 transition-colors" />
                     <input
                       type="password"
                       placeholder="Confirm Admin Password"
                       value={adminPassword}
                       onChange={(e) => setAdminPassword(e.target.value)}
                       className="w-full bg-slate-900 border border-white/10 rounded-2xl pl-14 pr-5 py-4 text-white focus:border-rose-500/50 outline-none transition-all font-mono tracking-widest"
                     />
                  </div>

                  {deleteError && (
                    <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-500 text-[10px] font-black uppercase tracking-widest rounded-xl flex items-center justify-center gap-2">
                       <AlertCircle className="w-3.5 h-3.5" />
                       {deleteError}
                    </div>
                  )}

                  <div className="flex flex-col gap-3 pt-2">
                     <button
                       onClick={handleDelete}
                       disabled={isDeleting}
                       className="w-full py-4 bg-rose-600 hover:bg-rose-500 text-white rounded-2xl text-xs font-black uppercase tracking-[0.2em] shadow-2xl shadow-rose-600/20 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                     >
                        {isDeleting ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <Trash2 className="w-4 h-4" />
                            Confirm Irreversible Deletion
                          </>
                        )}
                     </button>
                     <button
                       onClick={() => {
                         setShowDeleteConfirm(false);
                         setAdminPassword("");
                         setDeleteError("");
                       }}
                       className="w-full py-4 text-[10px] font-black text-slate-500 hover:text-white uppercase tracking-[0.3em] transition-all"
                     >
                        Abort Operation
                     </button>
                  </div>
               </div>
            </div>
          </div>
        )}

        {/* Family Selector Modal */}
        {showFamilySelector && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-2xl">
            <div className="w-full max-w-2xl bg-slate-900 border border-white/10 rounded-[40px] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
               <div className="px-8 py-5 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                  <h3 className="text-sm font-black text-white uppercase tracking-widest">Manage Family Network</h3>
                  <button onClick={() => setShowFamilySelector(false)} className="p-2 hover:bg-white/5 rounded-xl transition-all">
                     <X className="w-4 h-4 text-slate-500" />
                  </button>
               </div>

               <div className="p-8 space-y-6 flex-1 flex flex-col overflow-hidden">
                  <div className="relative">
                     <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                     <input type="text" placeholder="Search members by name or account number..." value={familySearchQuery} onChange={(e) => setFamilySearchQuery(e.target.value)} className="w-full bg-slate-950 border border-white/5 rounded-2xl pl-12 pr-4 py-4 text-white text-sm outline-none focus:border-purple-500/50 transition-all" />
                  </div>

                  <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-2">
                     {filteredUsers.map((u, uIdx) => {
                       const linkedMember = selectedFamilyMembers.find(p => p.memberId === u._id);
                       const isSelected = !!linkedMember;
                       
                       return (
                         <div key={u._id || `user-row-${uIdx}`} className={`p-4 rounded-2xl border transition-all space-y-3 ${isSelected ? "bg-purple-500/10 border-purple-500/30 shadow-lg shadow-purple-500/5" : "bg-slate-900 border-white/5 hover:border-white/10"}`}>
                            <div className="flex items-center justify-between">
                               <button type="button" onClick={() => toggleFamilyMember(u._id)} className="flex items-center gap-4 text-left group">
                                  <div className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-all overflow-hidden relative ${isSelected ? "bg-purple-500 border-purple-400 text-white" : "bg-slate-900 border-white/10 text-slate-600 group-hover:border-white/20"}`}>
                                     {isSelected ? (
                                       <CheckCircle2 className="w-4 h-4" />
                                     ) : u.profileImage ? (
                                       <Image 
                                         src={u.profileImage} 
                                         alt={u.name} 
                                         fill 
                                         sizes="36px"
                                         className="object-cover" 
                                       />
                                     ) : (
                                       <span className="text-xs font-black">{u.name.charAt(0)}</span>
                                     )}
                                  </div>
                                  <div>
                                     <div className={`font-black text-[11px] uppercase tracking-tight ${isSelected ? "text-white" : "text-slate-400 group-hover:text-slate-200"}`}>{u.name}</div>
                                     <div className="text-[9px] text-slate-600 font-bold uppercase tracking-widest mt-0.5">{u.accountNumber}</div>
                                  </div>
                               </button>
                               {isSelected && (
                                 <div className="flex items-center gap-3">
                                    <div className="w-px h-8 bg-white/10 mx-2" />
                                    <span className="text-[10px] font-black text-purple-400 uppercase tracking-widest">Active Link</span>
                                 </div>
                               )}
                            </div>

                            {isSelected && (
                               <div className="pt-2 animate-in slide-in-from-top-2 duration-300">
                                  <div className="space-y-1.5">
                                     <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Relationship</label>
                                     <div className="relative group/select">
                                        <select 
                                          value={linkedMember.relationship}
                                          onChange={(e) => {
                                            updateRelationship(u._id, e.target.value);
                                          }}
                                          className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-purple-500/50 appearance-none cursor-pointer"
                                        >
                                           <option value="">Select Relationship...</option>
                                           {RELATIONSHIP_OPTIONS.map((opt, oIdx) => <option key={`${opt}-${oIdx}`} value={opt}>{opt}</option>)}
                                        </select>
                                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600 pointer-events-none group-focus-within/select:text-purple-500" />
                                     </div>
                                  </div>
                               </div>
                            )}
                         </div>
                       );
                     })}
                  </div>
               </div>

               <div className="p-8 border-t border-white/5 flex justify-end bg-white/[0.02]">
                  <button onClick={() => setShowFamilySelector(false)} className="px-10 py-3 bg-purple-600 hover:bg-purple-500 text-white text-[11px] font-black uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-purple-600/20 transition-all active:scale-95">
                    Confirm Network
                  </button>
               </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
