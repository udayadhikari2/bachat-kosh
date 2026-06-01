"use client";

import { useState, useEffect } from "react";
import { 
  User as UserIcon, 
  Phone, 
  Mail, 
  Lock, 
  Shield, 
  Bell, 
  HelpCircle, 
  Users, 
  ArrowRightLeft, 
  LogOut,
  Loader2,
  CheckCircle2,
  XCircle,
  X,
  Eye,
  EyeOff
} from "lucide-react";
import { getLinkedAccounts, updateUser, changeUserPassword } from "@/lib/actions/user";
import { sendNotification } from "@/lib/actions/notification";
import { useSession, signOut } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";

interface MemberSettingsTabProps {
  memberData: any;
  activeUserId: string;
  onChangeActiveUser: (userId: string) => void;
  onRefresh: () => void;
}

export default function MemberSettingsTab({
  memberData,
  activeUserId,
  onChangeActiveUser,
  onRefresh
}: MemberSettingsTabProps) {
  const { data: session } = useSession();
  const sessionUser = session?.user as any;
  const userProfile = memberData?.user || {};

  // Profile Edit Toggle Mode State
  const [isEditing, setIsEditing] = useState(false);

  // Form profile edits
  const [name, setName] = useState(userProfile.name || "");
  const [nickname, setNickname] = useState(userProfile.nickname || "");
  const [phoneNumber, setPhoneNumber] = useState(userProfile.phoneNumber || "");
  const [email, setEmail] = useState(userProfile.email || "");
  const [gender, setGender] = useState(userProfile.gender || "");
  const [dateOfBirth, setDateOfBirth] = useState(
    userProfile.dateOfBirth
      ? new Date(userProfile.dateOfBirth).toISOString().split("T")[0]
      : ""
  );
  const [street, setStreet] = useState(userProfile.address?.street || "");
  const [city, setCity] = useState(userProfile.address?.city || "");
  const [state, setState] = useState(userProfile.address?.state || "");
  const [zip, setZip] = useState(userProfile.address?.zip || "");
  const [profileImage, setProfileImage] = useState(userProfile.profileImage || "");
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  
  const [allowFamilySwitch, setAllowFamilySwitch] = useState(userProfile.allowFamilySwitch || false);
  const [updating, setUpdating] = useState(false);

  // Password Modal states
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  // Linked accounts
  const [linkedMembers, setLinkedMembers] = useState<any[]>([]);
  const [loadingLinked, setLoadingLinked] = useState(false);

  // Support Dispute Form
  const [disputeType, setDisputeType] = useState("Deposit Dispute");
  const [disputeMessage, setDisputeMessage] = useState("");
  const [sendingDispute, setSendingDispute] = useState(false);

  // Notification Preferences
  const [prefPush, setPrefPush] = useState(true);
  const [prefSms, setPrefSms] = useState(false);
  const [prefEmail, setPrefEmail] = useState(true);

  useEffect(() => {
    setName(userProfile.name || "");
    setNickname(userProfile.nickname || "");
    setPhoneNumber(userProfile.phoneNumber || "");
    setEmail(userProfile.email || "");
    setGender(userProfile.gender || "");
    setDateOfBirth(
      userProfile.dateOfBirth
        ? new Date(userProfile.dateOfBirth).toISOString().split("T")[0]
        : ""
    );
    setStreet(userProfile.address?.street || "");
    setCity(userProfile.address?.city || "");
    setState(userProfile.address?.state || "");
    setZip(userProfile.address?.zip || "");
    setProfileImage(userProfile.profileImage || "");
    setProfileImageFile(null);
    setAllowFamilySwitch(userProfile.allowFamilySwitch || false);
  }, [userProfile]);

  useEffect(() => {
    // If the logged-in session user is a parent (has family members / not a minor), fetch linked account profiles
    if (sessionUser && !sessionUser.isMinor) {
      const fetchLinked = async () => {
        setLoadingLinked(true);
        const res = await getLinkedAccounts(sessionUser.id);
        if (res.success && res.familyMembers) {
          setLinkedMembers(res.familyMembers);
        }
        setLoadingLinked(false);
      };
      fetchLinked();
    }
  }, [sessionUser]);

  const handleCancelEditing = () => {
    setName(userProfile.name || "");
    setNickname(userProfile.nickname || "");
    setPhoneNumber(userProfile.phoneNumber || "");
    setEmail(userProfile.email || "");
    setGender(userProfile.gender || "");
    setDateOfBirth(
      userProfile.dateOfBirth
        ? new Date(userProfile.dateOfBirth).toISOString().split("T")[0]
        : ""
    );
    setStreet(userProfile.address?.street || "");
    setCity(userProfile.address?.city || "");
    setState(userProfile.address?.state || "");
    setZip(userProfile.address?.zip || "");
    setProfileImage(userProfile.profileImage || "");
    setProfileImageFile(null);
    setAllowFamilySwitch(userProfile.allowFamilySwitch || false);
    setIsEditing(false);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProfileImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdating(true);

    const formData = new FormData();
    formData.append("name", name);
    formData.append("nickname", nickname || "");
    formData.append("email", email);
    formData.append("phoneNumber", phoneNumber || "");
    formData.append("gender", gender || "");
    formData.append("dateOfBirth", dateOfBirth || "");
    formData.append("street", street || "");
    formData.append("city", city || "");
    formData.append("state", state || "");
    formData.append("zip", zip || "");
    formData.append("allowFamilySwitch", String(allowFamilySwitch));
    
    if (profileImageFile) {
      formData.append("profileImage", profileImageFile);
    }

    try {
      const res = await updateUser(userProfile._id, formData);
      if (res.success) {
        toast.success("Profile updated successfully!");
        setIsEditing(false);
        onRefresh();
      } else {
        toast.error(res.error || "Update failed");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to update profile");
    } finally {
      setUpdating(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("All password fields are required");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("New password must be at least 6 characters long");
      return;
    }

    setChangingPassword(true);
    try {
      const res = await changeUserPassword(userProfile._id, currentPassword, newPassword);
      if (res.success) {
        toast.success("Password changed successfully!");
        setShowPasswordModal(false);
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setShowCurrentPassword(false);
        setShowNewPassword(false);
        setShowConfirmPassword(false);
      } else {
        toast.error(res.error || "Failed to change password");
      }
    } catch (err: any) {
      toast.error(err.message || "An error occurred");
    } finally {
      setChangingPassword(false);
    }
  };

  const handleToggleFamilySwitch = async () => {
    const newValue = !allowFamilySwitch;
    setAllowFamilySwitch(newValue);
    
    try {
      const formData = new FormData();
      formData.append("allowFamilySwitch", String(newValue));
      const res = await updateUser(userProfile._id, formData);
      if (res.success) {
        toast.success(`Family switching access ${newValue ? "enabled" : "disabled"}`);
        onRefresh();
      } else {
        setAllowFamilySwitch(!newValue);
        toast.error(res.error || "Failed to update access control");
      }
    } catch {
      setAllowFamilySwitch(!newValue);
      toast.error("Failed to update access control");
    }
  };

  const handleRaiseDispute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!disputeMessage.trim()) {
      toast.error("Please enter a dispute description");
      return;
    }

    setSendingDispute(true);
    try {
      const res = await sendNotification({
        senderId: userProfile._id,
        targetRole: "ADMIN",
        title: `Dispute Raised: ${disputeType}`,
        message: `Member ${userProfile.name} (Acc: #${userProfile.accountNumber}) raised a dispute: ${disputeMessage.trim()}`,
        type: "WARNING"
      });
      if (res.success) {
        toast.success("Dispute raised. Admin has been notified!");
        setDisputeMessage("");
      } else {
        toast.error("Failed to raise dispute");
      }
    } catch {
      toast.error("Failed to raise dispute");
    } finally {
      setSendingDispute(false);
    }
  };

  const isSessionUserGuardian = sessionUser && !sessionUser.isMinor;
  const isCurrentlyMinor = userProfile.isMinor;

  const handleSwitchAccount = (child: any) => {
    if (activeUserId === child._id) return;
    
    // Guardian bypass: If the account is a minor, the parent has automatic access
    if (child.isMinor) {
      onChangeActiveUser(child._id);
      return;
    }

    // Access control check: Check if child has allowed switching
    if (child.allowFamilySwitch) {
      onChangeActiveUser(child._id);
    } else {
      toast.error(
        `Access not granted. Please login to ${child.name}'s account and enable family access in their settings first.`,
        { duration: 5000 }
      );
    }
  };

  return (
    <div className="space-y-6">
      {/* Account Profile Switcher for Guardians */}
      {isSessionUserGuardian && (
        <div className="bg-slate-900/90 md:bg-slate-900/40 border border-slate-800/80 rounded-[32px] p-6 md:backdrop-blur-md space-y-4">
          <div className="flex items-center gap-2.5">
            <Users className="w-5 h-5 text-indigo-400" />
            <div>
              <h3 className="text-xs font-black uppercase text-white tracking-widest leading-none">Linked Profiles</h3>
              <p className="text-[8px] text-slate-500 font-bold uppercase tracking-wider mt-1">Switch Managed Accounts</p>
            </div>
          </div>

          <div className="space-y-2.5">
            {/* Guardian option (Self) */}
            <button
              onClick={() => onChangeActiveUser(sessionUser.id)}
              className={`w-full flex items-center justify-between p-3.5 rounded-2xl border text-left transition-all ${
                activeUserId === sessionUser.id
                  ? "bg-indigo-500/10 border-indigo-500/20 text-indigo-400"
                  : "bg-black/20 border-white/5 text-slate-400 hover:text-white"
              }`}
            >
              <div>
                <span className="text-xs font-bold block">Parent Account (You)</span>
                <span className="text-[8px] uppercase tracking-wider font-black text-slate-500 mt-0.5">Acc: #{sessionUser.accountNumber}</span>
              </div>
              {activeUserId === sessionUser.id && <CheckCircle2 className="w-4 h-4 text-indigo-400" />}
            </button>

            {/* Minor accounts list */}
            {loadingLinked ? (
              <div className="py-4 text-center text-xs text-slate-500 flex justify-center items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-indigo-500" /> Fetching linked accounts...
              </div>
            ) : linkedMembers.length > 0 ? (
              linkedMembers.map((m: any) => {
                const child = m.memberId;
                if (!child) return null;
                const isSelected = activeUserId === child._id;
                const isRestricted = !child.isMinor && !child.allowFamilySwitch;
                return (
                  <button
                    key={child._id}
                    onClick={() => handleSwitchAccount(child)}
                    className={`w-full flex items-center justify-between p-3.5 rounded-2xl border text-left transition-all ${
                      isSelected
                        ? "bg-indigo-500/10 border-indigo-500/20 text-indigo-400"
                        : isRestricted
                          ? "bg-black/10 border-white/5 text-slate-500 hover:text-slate-400"
                          : "bg-black/20 border-white/5 text-slate-400 hover:text-white"
                    }`}
                  >
                    <div>
                      <span className="text-xs font-bold block flex items-center gap-1.5">
                        {child.name} 
                        <span className="text-[9px] font-black uppercase text-slate-500">({m.relationship || (child.isMinor ? "Minor" : "Family")})</span>
                      </span>
                      <span className="text-[8px] uppercase tracking-wider font-black text-slate-600 mt-0.5">Acc: #{child.accountNumber}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {isRestricted && (
                        <div title="Access Restricted" className="p-1.5 bg-rose-500/10 rounded-lg text-rose-400 border border-rose-500/10">
                          <Lock className="w-3.5 h-3.5 shrink-0" />
                        </div>
                      )}
                      {isSelected && <CheckCircle2 className="w-4 h-4 text-indigo-400" />}
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="text-center py-2 text-[9px] text-slate-600 font-black uppercase tracking-widest">
                No linked family members found
              </div>
            )}
          </div>
        </div>
      )}

      {/* Minor Account lock badge */}
      {isCurrentlyMinor && (
        <div className="p-4 bg-amber-500/5 border border-amber-500/15 rounded-2xl flex items-center gap-3 text-amber-500 text-xs font-bold uppercase tracking-tight">
          <Shield className="w-4 h-4 shrink-0" />
          <span>Restricted Access: Child Account Settings</span>
        </div>
      )}

      {/* Profile info edit form */}
      <div className="bg-slate-900/90 md:bg-slate-900/40 border border-slate-800/80 rounded-[32px] p-6 md:backdrop-blur-md">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
          <h3 className="text-xs font-black uppercase text-white tracking-widest">Profile Settings</h3>
          {!isEditing && (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setShowPasswordModal(true)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-white rounded-xl text-[10px] font-black uppercase tracking-wider border border-white/5 transition-all flex items-center gap-1.5"
              >
                <Lock className="w-3.5 h-3.5 text-indigo-400" /> Change Password
              </button>
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
              >
                Edit Profile
              </button>
            </div>
          )}
        </div>
        
        {!isEditing ? (
          <div className="space-y-6">
            {/* Header / Avatar info */}
            <div className="flex flex-col sm:flex-row items-center gap-6 pb-6 border-b border-white/5">
              <div className="relative w-24 h-24 rounded-full overflow-hidden border-4 border-slate-800/80 bg-slate-950 flex items-center justify-center shrink-0">
                {profileImage ? (
                  <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <UserIcon className="w-12 h-12 text-slate-500" />
                )}
              </div>
              <div className="text-center sm:text-left space-y-1">
                <h4 className="text-lg font-bold text-white flex flex-col sm:flex-row sm:items-center gap-2">
                  {name}
                  {nickname && (
                    <span className="text-xs text-indigo-400 font-medium">({nickname})</span>
                  )}
                </h4>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-1">
                  <span className="px-2.5 py-0.5 bg-indigo-500/10 text-indigo-400 rounded-full text-[9px] font-bold tracking-wider uppercase border border-indigo-500/10">
                    Acc: #{userProfile.accountNumber || "N/A"}
                  </span>
                  <span className="px-2.5 py-0.5 bg-emerald-500/10 text-emerald-400 rounded-full text-[9px] font-bold tracking-wider uppercase border border-emerald-500/10">
                    {userProfile.role || "MEMBER"}
                  </span>
                  {userProfile.isMinor && (
                    <span className="px-2.5 py-0.5 bg-amber-500/10 text-amber-400 rounded-full text-[9px] font-bold tracking-wider uppercase border border-amber-500/10">
                      MINOR
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Information Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
              <div className="space-y-1 bg-white/[0.01] border border-white/5 p-4 rounded-2xl">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">Email Address</span>
                <span className="text-slate-200 font-bold block truncate">{email || "Not specified"}</span>
              </div>
              
              <div className="space-y-1 bg-white/[0.01] border border-white/5 p-4 rounded-2xl">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">Phone Number</span>
                <span className="text-slate-200 font-bold block">{phoneNumber || "Not specified"}</span>
              </div>

              <div className="space-y-1 bg-white/[0.01] border border-white/5 p-4 rounded-2xl">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">Gender</span>
                <span className="text-slate-200 font-bold block">{gender || "Not specified"}</span>
              </div>

              <div className="space-y-1 bg-white/[0.01] border border-white/5 p-4 rounded-2xl">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">Date of Birth</span>
                <span className="text-slate-200 font-bold block">
                  {dateOfBirth ? new Date(dateOfBirth).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : "Not specified"}
                </span>
              </div>

              <div className="space-y-1 bg-white/[0.01] border border-white/5 p-4 rounded-2xl md:col-span-2">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">Residential Address</span>
                <span className="text-slate-200 font-bold block leading-relaxed">
                  {street || city || state || zip ? (
                    <>
                      {street && <span className="block">{street}</span>}
                      {(city || state || zip) && (
                        <span className="block mt-0.5 text-slate-400">
                          {[city, state, zip].filter(Boolean).join(", ")}
                        </span>
                      )}
                    </>
                  ) : (
                    "Not specified"
                  )}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleUpdateProfile} className="space-y-6">
            {/* Avatar edit header */}
            <div className="flex flex-col sm:flex-row items-center gap-6 pb-6 border-b border-white/5">
              <div className="relative w-24 h-24 group rounded-full overflow-hidden border-4 border-slate-800/80 shadow-inner flex items-center justify-center bg-slate-950">
                {profileImage ? (
                  <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <UserIcon className="w-12 h-12 text-slate-500" />
                )}
                <label className="absolute inset-0 bg-black/75 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center cursor-pointer transition-opacity duration-200">
                  <span className="text-[10px] text-white font-bold uppercase tracking-wider text-center px-2">Change Photo</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                </label>
              </div>
              <div className="text-center sm:text-left">
                <h4 className="text-sm font-bold text-white">Upload New Photo</h4>
                <p className="text-[10px] text-slate-500 mt-1">Accepts JPG, PNG or GIF. Click avatar to upload.</p>
              </div>
            </div>

            {/* Editable Fields Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Full Name</label>
                <input 
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full bg-slate-900 border border-white/5 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-emerald-500/50"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Nickname</label>
                <input 
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  className="w-full bg-slate-900 border border-white/5 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-emerald-500/50"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Email Address</label>
                <input 
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full bg-slate-900 border border-white/5 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-emerald-500/50"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Phone number</label>
                <input 
                  type="text"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-full bg-slate-900 border border-white/5 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-emerald-500/50"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Gender</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full bg-slate-900 border border-white/5 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-emerald-500/50"
                >
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Date of Birth</label>
                <input 
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  className="w-full bg-slate-900 border border-white/5 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-emerald-500/50 [color-scheme:dark]"
                />
              </div>

              {/* Address Fields */}
              <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-4 gap-4 mt-2">
                <div className="space-y-2 md:col-span-2">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Street Address</label>
                  <input 
                    type="text"
                    value={street}
                    onChange={(e) => setStreet(e.target.value)}
                    placeholder="123 Main St"
                    className="w-full bg-slate-900 border border-white/5 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-emerald-500/50"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">City</label>
                  <input 
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="City"
                    className="w-full bg-slate-900 border border-white/5 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-emerald-500/50"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">State / Province</label>
                  <input 
                    type="text"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    placeholder="State"
                    className="w-full bg-slate-900 border border-white/5 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-emerald-500/50"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">ZIP / Postal Code</label>
                  <input 
                    type="text"
                    value={zip}
                    onChange={(e) => setZip(e.target.value)}
                    placeholder="ZIP"
                    className="w-full bg-slate-900 border border-white/5 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-emerald-500/50"
                  />
                </div>
              </div>
            </div>


            <div className="flex gap-4">
              <button
                type="button"
                onClick={handleCancelEditing}
                className="w-1/2 py-4 bg-slate-850 hover:bg-slate-800 text-slate-350 hover:text-white rounded-2xl text-[10px] font-black uppercase tracking-widest border border-white/5 transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={updating}
                className="w-1/2 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2"
              >
                {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Changes"}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Family Access Control */}
      {!userProfile.isMinor && (
        <div className="bg-slate-900/90 md:bg-slate-900/40 border border-slate-800/80 rounded-[32px] p-6 md:backdrop-blur-md space-y-4">
          <div className="flex items-center gap-2.5">
            <Shield className="w-5 h-5 text-indigo-400" />
            <h3 className="text-xs font-black uppercase text-white tracking-widest">Family Access Control</h3>
          </div>

          <div className="flex justify-between items-center bg-white/[0.02] border border-white/5 p-4 rounded-2xl text-xs">
            <div className="flex flex-col">
              <span className="text-slate-350 font-bold">Allow Family Switching Access</span>
              <span className="text-[9px] text-slate-500 font-medium uppercase mt-1">Let linked family members switch into your profile</span>
            </div>
            <button
              type="button"
              onClick={handleToggleFamilySwitch}
              className={`w-10 h-6 rounded-full relative transition-all duration-500 ring-4 ring-offset-4 ring-offset-slate-950 ${allowFamilySwitch ? "bg-emerald-500 ring-emerald-500/10" : "bg-slate-800 ring-transparent"}`}
            >
              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all duration-500 ${allowFamilySwitch ? "left-5" : "left-1"}`} />
            </button>
          </div>
        </div>
      )}

      {/* Notification Preferences */}
      <div className="bg-slate-900/90 md:bg-slate-900/40 border border-slate-800/80 rounded-[32px] p-6 md:backdrop-blur-md space-y-4">
        <div className="flex items-center gap-2.5">
          <Bell className="w-5 h-5 text-emerald-400" />
          <h3 className="text-xs font-black uppercase text-white tracking-widest">Notification Preferences</h3>
        </div>

        <div className="space-y-3.5">
          {[
            { label: "Push Notification Reminders", val: prefPush, setVal: setPrefPush },
            { label: "SMS Payment Alerts", val: prefSms, setVal: setPrefSms },
            { label: "Email Monthly Statements", val: prefEmail, setVal: setPrefEmail },
          ].map((pref, i) => (
            <div key={i} className="flex justify-between items-center text-xs">
              <span className="text-slate-400">{pref.label}</span>
              <button
                type="button"
                onClick={() => pref.setVal(!pref.val)}
                className={`w-10 h-5 rounded-full transition-all relative ${pref.val ? "bg-emerald-500" : "bg-slate-800"}`}
              >
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${pref.val ? "left-5.5" : "left-0.5"}`} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Help, Disputes & Support */}
      <div className="bg-slate-900/90 md:bg-slate-900/40 border border-slate-800/80 rounded-[32px] p-6 md:backdrop-blur-md space-y-5">
        <div className="flex items-center gap-2.5">
          <HelpCircle className="w-5 h-5 text-indigo-400" />
          <h3 className="text-xs font-black uppercase text-white tracking-widest">Disputes & Support</h3>
        </div>

        <form onSubmit={handleRaiseDispute} className="space-y-4">
          <div className="space-y-2">
            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Dispute / Issue Category</label>
            <select
              value={disputeType}
              onChange={(e) => setDisputeType(e.target.value)}
              className="w-full bg-slate-900 border border-white/5 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-indigo-500/50"
            >
              <option value="Deposit Dispute">Deposit Submission Dispute</option>
              <option value="Loan Interest Dispute">Loan & Interest Dispute</option>
              <option value="Account Switching Error">Linked Profile Issue</option>
              <option value="Application Bug">App Performance Issue</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Describe Issue Details</label>
            <textarea
              value={disputeMessage}
              onChange={(e) => setDisputeMessage(e.target.value)}
              placeholder="Describe the issue or error transaction id in detail..."
              required
              className="w-full bg-slate-900 border border-white/5 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-indigo-500/50 min-h-[80px]"
            />
          </div>

          <button
            type="submit"
            disabled={sendingDispute}
            className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center gap-2"
          >
            {sendingDispute ? <Loader2 className="w-4 h-4 animate-spin" /> : "File Support dispute"}
          </button>
        </form>
      </div>

      {/* Security Actions */}
      <div className="bg-slate-900/90 md:bg-slate-900/40 border border-slate-800/80 rounded-[32px] p-6 md:backdrop-blur-md flex flex-col gap-3">
        <button
          onClick={() => signOut()}
          className="w-full py-4 bg-rose-500/10 hover:bg-rose-600 text-rose-500 hover:text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 border border-rose-500/20 hover:border-transparent active:scale-95"
        >
          <LogOut className="w-4 h-4" /> Sign Out
        </button>
      </div>

      {/* Change Password Modal */}
      <AnimatePresence>
        {showPasswordModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-xl p-4 overflow-hidden">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-md bg-slate-950 border border-white/10 rounded-[36px] shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden relative flex flex-col max-h-[90vh] ring-1 ring-white/5"
            >
              {/* Header */}
              <div className="px-8 pt-8 pb-4 flex justify-between items-center border-b border-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-500/10 rounded-xl border border-indigo-500/20 flex items-center justify-center">
                    <Lock className="w-5 h-5 text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-wider">Change Password</h3>
                    <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Secure Credentials Portal</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="p-2.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl transition-all active:scale-95"
                >
                  <X className="w-4 h-4 text-slate-400 hover:text-white" />
                </button>
              </div>

              {/* Form Body */}
              <form onSubmit={handleChangePassword} className="px-8 py-6 space-y-4 overflow-y-auto">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Current Password</label>
                  <div className="relative">
                    <input
                      type={showCurrentPassword ? "text" : "password"}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      required
                      placeholder="••••••••"
                      className="w-full bg-slate-900 border border-white/5 rounded-xl pl-4 pr-10 py-3 text-xs text-white outline-none focus:border-indigo-500/50"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                    >
                      {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">New Password</label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      placeholder="••••••••"
                      className="w-full bg-slate-900 border border-white/5 rounded-xl pl-4 pr-10 py-3 text-xs text-white outline-none focus:border-indigo-500/50"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Confirm New Password</label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      placeholder="••••••••"
                      className="w-full bg-slate-900 border border-white/5 rounded-xl pl-4 pr-10 py-3 text-xs text-white outline-none focus:border-indigo-500/50"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="pt-4 flex flex-col gap-3">
                  <button
                    type="submit"
                    disabled={changingPassword}
                    className="w-full py-4 bg-indigo-650 hover:bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-indigo-650/20 transition-all flex items-center justify-center gap-2.5 active:scale-[0.98] disabled:opacity-50"
                  >
                    {changingPassword ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      "Update Password"
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowPasswordModal(false)}
                    disabled={changingPassword}
                    className="w-full py-3 text-[9px] font-black text-slate-500 hover:text-white uppercase tracking-[0.4em] transition-all disabled:opacity-20"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
