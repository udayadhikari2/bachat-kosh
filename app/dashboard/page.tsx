import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import DeveloperView from "@/components/dashboard/DeveloperView";
import AdminView from "@/components/dashboard/AdminView";
import UserView from "@/components/dashboard/UserView";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;

  if (user?.role === "DEVELOPER") {
    return <DeveloperView />;
  }

  if (user?.role === "ADMIN") {
    return <AdminView />;
  }

  return <UserView />;
}
