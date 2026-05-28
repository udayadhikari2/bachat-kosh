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
  CheckCircle2
} from "lucide-react";
import { getLinkedAccounts, updateUser } from "@/lib/actions/user";
import { sendNotification } from "@/lib/actions/notification";
import { useSession, signOut } from "next-auth/react";
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

  // Form profile edits
  const [name, setName] = useState(userProfile.name || "");
  const [nickname, setNickname] = useState(userProfile.nickname || "");
  const [phoneNumber, setPhoneNumber] = useState(userProfile.phoneNumber || "");
  const [password, setPassword] = useState("");
  const [updating, setUpdating] = useState(false);

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

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdating(true);

    const formData = new FormData();
    formData.append("name", name);
    formData.append("nickname", nickname);
    formData.append("phoneNumber", phoneNumber);
    if (password) {
      formData.append("password", password);
    }

    try {
      const res = await updateUser(userProfile._id, formData);
      if (res.success) {
        toast.success("Profile updated successfully!");
        setPassword("");
        onRefresh();
      } else {
        toast.error(res.error || "Update failed");
      }
    } catch {
      toast.error("Failed to update profile");
    } finally {
      setUpdating(false);
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

  return (
    <div className="space-y-6">
      {/* Account Profile Switcher for Guardians */}
      {isSessionUserGuardian && (
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-[32px] p-6 backdrop-blur-md space-y-4">
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
                return (
                  <button
                    key={child._id}
                    onClick={() => onChangeActiveUser(child._id)}
                    className={`w-full flex items-center justify-between p-3.5 rounded-2xl border text-left transition-all ${
                      isSelected
                        ? "bg-indigo-500/10 border-indigo-500/20 text-indigo-400"
                        : "bg-black/20 border-white/5 text-slate-400 hover:text-white"
                    }`}
                  >
                    <div>
                      <span className="text-xs font-bold block">{child.name} ({m.relationship || "Minor"})</span>
                      <span className="text-[8px] uppercase tracking-wider font-black text-slate-500 mt-0.5">Acc: #{child.accountNumber}</span>
                    </div>
                    {isSelected && <CheckCircle2 className="w-4 h-4 text-indigo-400" />}
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
      <div className="bg-slate-900/40 border border-slate-800/80 rounded-[32px] p-6 backdrop-blur-md">
        <h3 className="text-xs font-black uppercase text-white tracking-widest mb-6">Profile Settings</h3>
        
        <form onSubmit={handleUpdateProfile} className="space-y-4">
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
            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Phone number</label>
            <input 
              type="text"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="w-full bg-slate-900 border border-white/5 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-emerald-500/50"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">New Password (leave empty to keep current)</label>
            <input 
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-slate-900 border border-white/5 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-emerald-500/50"
            />
          </div>

          <button
            type="submit"
            disabled={updating}
            className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2"
          >
            {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Profile Updates"}
          </button>
        </form>
      </div>

      {/* Notification Preferences */}
      <div className="bg-slate-900/40 border border-slate-800/80 rounded-[32px] p-6 backdrop-blur-md space-y-4">
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
      <div className="bg-slate-900/40 border border-slate-800/80 rounded-[32px] p-6 backdrop-blur-md space-y-5">
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
      <div className="bg-slate-900/40 border border-slate-800/80 rounded-[32px] p-6 backdrop-blur-md flex flex-col gap-3">
        <button
          onClick={() => signOut()}
          className="w-full py-4 bg-rose-500/10 hover:bg-rose-600 text-rose-500 hover:text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 border border-rose-500/20 hover:border-transparent active:scale-95"
        >
          <LogOut className="w-4 h-4" /> Sign Out
        </button>
      </div>
    </div>
  );
}
