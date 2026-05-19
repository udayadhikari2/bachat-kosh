"use client";

import { 
  X, 
  Mail, 
  Shield, 
  Calendar, 
  Phone, 
  MapPin, 
  Building, 
  Hash, 
  FileText, 
  Globe, 
  User as UserIcon,
  Edit3,
  Trash2,
  AlertCircle,
  ShieldCheck,
  Briefcase,
  UserMinus,
  Lock,
  Loader2,
  Users2
} from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { adToBs, NEPALI_MONTHS } from "@/lib/utils/nepali-date";
import { removeFamilyMemberLink, verifyAdminPassword, deleteUser } from "@/lib/actions/user";
import { toast } from "react-hot-toast";
import { useSession } from "next-auth/react";

interface MemberProfileViewProps {
  member: any;
  onClose: () => void;
  onEdit: (member: any) => void;
}

export default function MemberProfileView({ member, onClose, onEdit }: MemberProfileViewProps) {
  const { data: session } = useSession();
  
  // Deletion security states
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  
  // Link removal states
  const [linkToRemove, setLinkToRemove] = useState<{ id: string, name: string } | null>(null);
  const [isRemovingLink, setIsRemovingLink] = useState(false);

  // Automatic Nepali Date Conversion
  const bDate = member.dateOfBirth ? adToBs(member.dateOfBirth) : null;

  const handleConfirmRemoveLink = async () => {
    if (!linkToRemove) return;
    
    setIsRemovingLink(true);
    const result = await removeFamilyMemberLink(member._id, linkToRemove.id);
    if (result.success) {
      toast.success("Family connection severed");
      setLinkToRemove(null);
    } else {
      toast.error(result.error || "Failed to disconnect");
    }
    setIsRemovingLink(false);
  };

  const handleDeleteProfile = async () => {
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

      const result = await deleteUser(member._id.toString());
      if (result.success) {
        toast.success("Profile deleted successfully");
        onClose();
      } else {
        setDeleteError(result.error || "Failed to delete profile");
      }
    } catch (err: any) {
      setDeleteError(err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-3xl animate-in fade-in duration-500 overflow-hidden font-sans">
      <div className="w-full max-w-5xl bg-[#020617] border border-white/10 rounded-[40px] shadow-[0_0_150px_rgba(0,0,0,1)] overflow-hidden animate-in zoom-in-95 duration-500 relative flex flex-col max-h-[95vh] ring-1 ring-white/5">
        
        {/* Artistic Background Layers */}
        <div className="absolute top-0 left-0 w-full h-48 bg-gradient-to-b from-emerald-500/10 to-transparent opacity-60" />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-500/[0.03] rounded-full blur-[150px] -translate-y-1/2 translate-x-1/3" />
        
        {/* Header */}
        <div className="px-8 py-6 border-b border-white/5 flex justify-between items-center relative z-10 bg-white/[0.01]">
           <div className="flex gap-6 items-center">
              <div className="relative">
                  <div className="absolute -inset-2 bg-emerald-500/20 rounded-[32px] blur-xl opacity-30" />
                  <div className="w-24 h-24 rounded-[28px] bg-slate-900 border border-white/10 p-1 shadow-2xl relative z-10 overflow-hidden">
                     {member.profileImage ? (
                        <Image 
                          src={member.profileImage} 
                          alt={member.name} 
                          fill 
                          sizes="96px"
                          className="object-cover" 
                        />
                     ) : (
                       <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900">
                          <UserIcon className="w-8 h-8 text-slate-700/50" />
                       </div>
                     )}
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 rounded-lg border-2 border-[#020617] flex items-center justify-center shadow-lg z-20">
                     <ShieldCheck className="w-3.5 h-3.5 text-white" />
                  </div>
              </div>

              <div className="space-y-1.5">
                 <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[8px] font-black uppercase tracking-widest rounded-md">
                       {member.role || "Member"}
                    </span>
                    <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">
                       HB-{member._id.toString().slice(-4).toUpperCase()}
                    </span>
                 </div>
                 <h1 className="text-3xl font-black text-white tracking-tight uppercase">
                    {member.name}
                 </h1>
                 <div className="flex items-center gap-3">
                    <span className="text-xs font-mono font-black text-emerald-500">{member.accountNumber}</span>
                    <span className="w-1 h-1 bg-slate-700 rounded-full" />
                    <span className="text-[10px] font-bold text-slate-500 italic">"{member.nickname || "N/A"}"</span>
                 </div>
              </div>
           </div>

           <div className="flex items-center gap-3">
              <button 
                onClick={() => onEdit(member)}
                className="w-10 h-10 flex items-center justify-center bg-white/5 hover:bg-emerald-500 hover:text-white border border-white/10 rounded-2xl transition-all text-slate-400"
                title="Edit Member"
              >
                <Edit3 className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setShowDeleteConfirm(true)}
                className="w-10 h-10 flex items-center justify-center bg-white/5 hover:bg-rose-500 hover:text-white border border-white/10 rounded-2xl transition-all text-slate-400"
                title="Delete Profile"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <div className="w-px h-8 bg-white/10 mx-1" />
              <button 
                onClick={onClose} 
                className="w-10 h-10 flex items-center justify-center bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl transition-all text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
           </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-8 py-8 relative z-10">
           <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* Left Column (5/12) */}
              <div className="lg:col-span-5 space-y-6">
                 <div className="p-6 bg-white/[0.01] rounded-[32px] border border-white/5 space-y-6">
                    <div className="flex items-center gap-2 pb-3 border-b border-white/5">
                       <Hash className="w-3.5 h-3.5 text-emerald-500" />
                       <span className="text-[10px] font-black text-white uppercase tracking-widest">Personal Matrix</span>
                    </div>
                    
                    <div className="space-y-5">
                       {[
                         { label: "English DOB", val: member.dateOfBirth ? new Date(member.dateOfBirth).toLocaleDateString() : "N/A", icon: Calendar },
                         { label: "Nepali Date (BS)", val: bDate ? `${bDate.day} ${bDate.monthName} ${bDate.year}` : "N/A", icon: Globe, highlight: true },
                         { label: "Gender Identity", val: member.gender || "Not specified", icon: UserIcon },
                         { label: "Email Network", val: member.email, icon: Mail },
                         { label: "Verified Phone", val: member.phoneNumber || "Not provided", icon: Phone },
                       ].map((item, i) => (
                         <div key={i} className="flex items-center justify-between group">
                            <div className="flex items-center gap-3">
                               <div className="p-2 bg-slate-900/50 rounded-lg border border-white/5">
                                  <item.icon className={`w-3 h-3 ${item.highlight ? "text-emerald-500" : "text-slate-600"}`} />
                               </div>
                               <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{item.label}</span>
                            </div>
                            <span className={`text-[11px] font-black ${item.highlight ? "text-emerald-400" : "text-slate-300"}`}>{item.val}</span>
                         </div>
                       ))}
                    </div>
                 </div>

                 <div className="p-6 bg-white/[0.01] rounded-[32px] border border-white/5 space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-white/5">
                       <Building className="w-3.5 h-3.5 text-blue-500" />
                       <span className="text-[10px] font-black text-white uppercase tracking-widest">Affiliation</span>
                    </div>
                    <div className="space-y-1">
                        <div className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1">Organization</div>
                        <div className="text-xs font-black text-slate-200">{member.organizationId?.name || "Independent"}</div>
                    </div>
                    <div className="flex flex-wrap gap-2 pt-1">
                       {member.isLoanApprover && (
                         <span className="px-2 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[8px] font-black uppercase tracking-widest rounded-md">Loan Approver</span>
                       )}
                       {member.isSecondaryAdmin && (
                         <span className="px-2 py-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 text-[8px] font-black uppercase tracking-widest rounded-md">Secondary Admin</span>
                       )}
                    </div>
                 </div>
              </div>

              {/* Right Column (7/12) */}
              <div className="lg:col-span-7 space-y-6">
                 <div className="p-6 bg-white/[0.01] rounded-[32px] border border-white/5 grid grid-cols-3 gap-6 relative overflow-hidden">
                    <MapPin className="absolute -bottom-4 -right-4 w-24 h-24 text-white/5 -rotate-12" />
                    <div className="space-y-1">
                       <span className="text-[9px] font-black text-rose-500 uppercase tracking-widest">Street/Ward</span>
                       <div className="text-xs font-bold text-slate-200">{member.address?.street || "—"}</div>
                    </div>
                    <div className="space-y-1">
                       <span className="text-[9px] font-black text-rose-500 uppercase tracking-widest">City</span>
                       <div className="text-xs font-bold text-slate-200">{member.address?.city || "—"}</div>
                    </div>
                    <div className="space-y-1">
                       <span className="text-[9px] font-black text-rose-500 uppercase tracking-widest">Zip</span>
                       <div className="text-xs font-mono font-black text-slate-200">{member.address?.zip || "—"}</div>
                    </div>
                 </div>

                 <div className="p-6 bg-white/[0.01] rounded-[32px] border border-white/5 space-y-6">
                    <div className="flex items-center justify-between pb-3 border-b border-white/5">
                       <div className="flex items-center gap-2">
                          <Users2 className="w-4 h-4 text-purple-500" />
                          <span className="text-[10px] font-black text-white uppercase tracking-widest">Family Connections</span>
                       </div>
                       <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">{member.familyMembers?.length || 0} Linked</span>
                    </div>

                    <div className="overflow-hidden">
                       <table className="w-full text-left">
                          <thead>
                             <tr className="border-b border-white/5">
                                <th className="pb-3 text-[9px] font-black text-slate-600 uppercase tracking-widest">Member Name</th>
                                <th className="pb-3 text-[9px] font-black text-slate-600 uppercase tracking-widest">Relationship</th>
                                <th className="pb-3 text-[9px] font-black text-slate-600 uppercase tracking-widest">Account</th>
                                <th className="pb-3 text-[9px] font-black text-slate-600 uppercase tracking-widest text-right">Action</th>
                             </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5">
                             {member.familyMembers?.length > 0 ? (
                               member.familyMembers.map((fam: any) => (
                                 <tr key={fam.memberId?._id || fam._id} className="group">
                                    <td className="py-3">
                                       <div className="flex items-center gap-3">
                                          <div className="w-8 h-8 rounded-xl bg-slate-900 border border-white/10 flex items-center justify-center text-[10px] font-black text-slate-500 overflow-hidden relative shadow-lg">
                                             {fam.memberId?.profileImage ? (
                                               <Image 
                                                 src={fam.memberId.profileImage} 
                                                 alt={fam.memberId.name} 
                                                 fill 
                                                 sizes="32px"
                                                 className="object-cover" 
                                               />
                                             ) : (
                                               fam.memberId?.name?.charAt(0) || "?"
                                             )}
                                          </div>
                                          <span className="text-xs font-bold text-slate-300 group-hover:text-white transition-colors">
                                            {fam.memberId?.name || "Unknown Member"}
                                          </span>
                                       </div>
                                    </td>
                                    <td className="py-3">
                                       <span className="px-2 py-0.5 bg-white/5 border border-white/10 rounded-md text-[9px] font-black text-slate-500 uppercase tracking-widest">
                                          {fam.relationship || "Linked"}
                                       </span>
                                    </td>
                                    <td className="py-3">
                                       <span className="text-xs font-mono font-black text-slate-500">
                                          {fam.memberId?.accountNumber || "—"}
                                       </span>
                                    </td>
                                    <td className="py-3 text-right">
                                       <button 
                                         onClick={() => setLinkToRemove({ id: fam.memberId?._id || fam._id, name: fam.memberId?.name })}
                                         className="p-2 text-slate-700 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all"
                                         title="Remove Link"
                                       >
                                          <UserMinus className="w-3.5 h-3.5" />
                                       </button>
                                    </td>
                                 </tr>
                               ))
                             ) : (
                               <tr>
                                  <td colSpan={4} className="py-10 text-center text-[10px] font-black text-slate-700 uppercase tracking-widest italic opacity-50">
                                    No established connections found.
                                  </td>
                               </tr>
                             )}
                          </tbody>
                       </table>
                    </div>
                 </div>
              </div>
           </div>
        </div>

        {/* --- MODALS --- */}

        {/* Small Center Confirmation Modal for Link Removal */}
        {linkToRemove && (
          <div className="absolute inset-0 z-[130] bg-[#020617]/80 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-300">
            <div className="w-full max-w-sm bg-slate-950 border border-white/10 rounded-[32px] p-8 shadow-[0_0_50px_rgba(0,0,0,0.5)] space-y-6 text-center ring-1 ring-white/10">
               <div className="mx-auto w-16 h-16 bg-rose-500/10 rounded-2xl flex items-center justify-center border border-rose-500/20 mb-2">
                  <UserMinus className="w-8 h-8 text-rose-500" />
               </div>
               <div className="space-y-2">
                  <h4 className="text-lg font-black text-white uppercase tracking-tight">Sever Connection?</h4>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-relaxed">
                    Are you sure you want to remove the family link with <b>{linkToRemove.name}</b>?
                  </p>
               </div>
               <div className="flex gap-3">
                  <button 
                    onClick={() => setLinkToRemove(null)}
                    disabled={isRemovingLink}
                    className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-slate-400 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all"
                  >
                    Keep Link
                  </button>
                  <button 
                    onClick={handleConfirmRemoveLink}
                    disabled={isRemovingLink}
                    className="flex-1 py-3 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all shadow-xl shadow-rose-600/20 flex items-center justify-center gap-2"
                  >
                    {isRemovingLink ? <Loader2 className="w-3 h-3 animate-spin" /> : "Remove Link"}
                  </button>
               </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Overlay (Security Shield) */}
        {showDeleteConfirm && (
          <div className="absolute inset-0 z-[120] bg-[#020617]/95 backdrop-blur-xl flex items-center justify-center p-8 animate-in fade-in duration-300">
            <div className="w-full max-w-md space-y-8 text-center">
               <div className="inline-flex p-6 bg-rose-500/10 rounded-[32px] border border-rose-500/20 mb-4 animate-bounce">
                  <Trash2 className="w-10 h-10 text-rose-500" />
               </div>
               
               <div className="space-y-2">
                  <h3 className="text-2xl font-black text-white uppercase tracking-tight">System Authority Check</h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-relaxed">
                    You are attempting to permanently remove <b>{member.name}</b>.<br />
                    This action is final and requires administrator authentication.
                  </p>
               </div>

               <div className="space-y-4 pt-4 text-left">
                  <div className="relative group">
                     <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 group-focus-within:text-rose-500 transition-colors" />
                     <input
                       type="password"
                       placeholder="Enter Administrator Password"
                       value={adminPassword}
                       onChange={(e) => setAdminPassword(e.target.value)}
                       className="w-full bg-slate-900 border border-white/10 rounded-2xl pl-14 pr-5 py-4 text-white focus:border-rose-500/50 outline-none transition-all font-mono tracking-[0.3em]"
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
                       onClick={handleDeleteProfile}
                       disabled={isDeleting}
                       className="w-full py-4 bg-rose-600 hover:bg-rose-500 text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] shadow-2xl shadow-rose-600/30 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                     >
                        {isDeleting ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <Trash2 className="w-4 h-4" />
                            Confirm Terminal Deletion
                          </>
                        )}
                     </button>
                     <button
                       onClick={() => {
                         setShowDeleteConfirm(false);
                         setAdminPassword("");
                         setDeleteError("");
                       }}
                       className="w-full py-4 text-[10px] font-black text-slate-500 hover:text-white uppercase tracking-[0.4em] transition-all"
                     >
                        Cancel Operation
                     </button>
                  </div>
               </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
