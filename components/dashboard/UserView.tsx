"use client";

import { useState, useEffect, useTransition } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, PiggyBank } from "lucide-react";
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
    }
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

  if (loading && !memberData) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-emerald-500" />
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
          Synchronizing Member Activity...
        </p>
      </div>
    );
  }

  // Animation variants for tab transitions
  const tabVariants = {
    initial: { opacity: 0, x: 15 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -15 },
  };

  return (
    <div className="space-y-6">
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial="initial"
          animate="animate"
          exit="exit"
          variants={tabVariants}
          transition={{ duration: 0.2 }}
        >
          {activeTab === "home" && (
            <MemberHomeTab
              memberData={memberData}
              orgConfig={orgConfig}
              currentNepaliMonth={currentNepaliMonth}
              onTabChange={handleTabChange}
              onOpenDeposit={() => setShowDepositModal(true)}
              onOpenTransfer={() => handleTabChange("deposit")} // routes to deposit tab
              onOpenLoanRequest={() => handleTabChange("loans")} // routes to loans tab
              onOpenLoanRepay={() => handleTabChange("loans")} // routes to loans tab
            />
          )}

          {activeTab === "deposit" && (
            <MemberDepositTab
              memberData={memberData}
              orgConfig={orgConfig}
              currentNepaliMonth={currentNepaliMonth}
              onOpenDepositForm={() => setShowDepositModal(true)}
              onRefresh={handleRefresh}
            />
          )}

          {activeTab === "loans" && (
            <MemberLoansTab
              memberData={memberData}
              orgConfig={orgConfig}
              onRefresh={handleRefresh}
            />
          )}

          {activeTab === "settings" && (
            <MemberSettingsTab
              memberData={memberData}
              activeUserId={activeUserId}
              onChangeActiveUser={setActiveUserId}
              onRefresh={handleRefresh}
            />
          )}
        </motion.div>
      </AnimatePresence>

      {/* Submit Monthly Deposit modal */}
      {showDepositModal && (
        <SubmitDepositForm
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
