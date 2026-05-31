"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { PiggyBank } from "lucide-react";
import toast from "react-hot-toast";

// Sub-components
import MemberHomeTab from "./member/MemberHomeTab";
import MemberDepositTab from "./member/MemberDepositTab";
import MemberLoansTab from "./member/MemberLoansTab";
import MemberSettingsTab from "./member/MemberSettingsTab";

// Form Overlays
import SubmitDepositForm from "./SubmitDepositForm";

// Server Actions
import { getMemberActivity } from "@/lib/actions/member";
import { getOrganization } from "@/lib/actions/organization";
import { getCurrentNepaliDate } from "@/lib/utils/nepali-date";

export default function UserView() {
  const { data: session } = useSession();
  const sessionUser = session?.user as any;

  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get("tab") || "home";

  // Active Profile State (Defaults to logged-in parent user)
  const [activeUserId, setActiveUserId] = useState("");
  const [switchingUser, setSwitchingUser] = useState(false);
  const [memberData, setMemberData] = useState<any>(null);
  const [orgConfig, setOrgConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Centralized Modal States (for Home Tab Quick Actions)
  const [showDepositModal, setShowDepositModal] = useState(false);

  // Current Nepali Month string (e.g., "Chaitra 2080")
  const [currentNepaliMonth, setCurrentNepaliMonth] = useState("");

  useEffect(() => {
    if (sessionUser?.id) {
      setActiveUserId(sessionUser.id);
    }
    const bsDate = getCurrentNepaliDate();
    setCurrentNepaliMonth(`${bsDate.monthName} ${bsDate.year}`);
  }, [sessionUser]);

  const loadData = async (targetId: string) => {
    if (!targetId) return;
    setLoading(true);
    try {
      const res = await getMemberActivity(targetId);
      if (res.success && res.data) {
        setMemberData(res.data);
        
        // Fetch Organization Config once we have organizationId
        const orgId = res.data.user?.organizationId;
        if (orgId) {
          const orgRes = await getOrganization(orgId);
          if (orgRes.success) {
            setOrgConfig(orgRes.data.config);
          }
        }
      } else {
        toast.error(res.error || "Failed to load account activity");
      }
    } catch {
      toast.error("Failed to load account activity");
    } finally {
      setLoading(false);
      setSwitchingUser(false);
    }
  };

  const handleActiveUserChange = (newUserId: string) => {
    if (newUserId === activeUserId) return;
    setSwitchingUser(true);
    setActiveUserId(newUserId);
    router.push(`/dashboard?tab=home`);
  };

  useEffect(() => {
    if (activeUserId) {
      loadData(activeUserId);
    }
  }, [activeUserId, refreshTrigger]);

  const handleRefresh = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleTabChange = (tab: string) => {
    router.push(`/dashboard?tab=${tab}`);
  };

  const showLoader = switchingUser || (loading && !memberData);

  return (
    <div className="space-y-6">
      {showLoader ? (
        <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 transition-all duration-300">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-4 border-emerald-500/10 border-t-emerald-500 animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <PiggyBank className="w-6 h-6 text-emerald-400 animate-pulse" />
            </div>
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2 animate-bounce">
            Switching Member Account...
          </p>
        </div>
      ) : (
        <div>
          {activeTab === "home" && memberData && (
            <MemberHomeTab
              memberData={memberData}
              orgConfig={orgConfig}
              currentNepaliMonth={currentNepaliMonth}
              onTabChange={handleTabChange}
              onOpenDeposit={() => setShowDepositModal(true)}
              onOpenTransfer={() => handleTabChange("deposit")} // routes to deposit tab
              onOpenLoanRequest={() => handleTabChange("loans")} // routes to loans tab
              onOpenLoanRepay={(loanId) => router.push(`/dashboard?tab=loans${loanId ? `&loanId=${loanId}` : ""}`)}
            />
          )}

          {activeTab === "deposit" && memberData && (
            <MemberDepositTab
              memberData={memberData}
              orgConfig={orgConfig}
              currentNepaliMonth={currentNepaliMonth}
              onOpenDepositForm={() => setShowDepositModal(true)}
              onRefresh={handleRefresh}
            />
          )}

          {activeTab === "loans" && memberData && (
            <MemberLoansTab
              memberData={memberData}
              orgConfig={orgConfig}
              onRefresh={handleRefresh}
            />
          )}

          {activeTab === "settings" && memberData && (
            <MemberSettingsTab
              memberData={memberData}
              activeUserId={activeUserId}
              onChangeActiveUser={handleActiveUserChange}
              onRefresh={handleRefresh}
            />
          )}
        </div>
      )}

      {/* Submit Monthly Deposit modal */}
      {showDepositModal && (
        <SubmitDepositForm
          memberData={memberData}
          onClose={() => {
            setShowDepositModal(false);
            handleRefresh();
          }}
          currentMonth={currentNepaliMonth}
          defaultAmount={orgConfig?.monthlyDepositAmount || 1000}
        />
      )}
    </div>
  );
}
