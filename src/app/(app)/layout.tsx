import { Gate } from "@/components/Gate";
import { TabBar } from "@/components/TabBar";
import { ActivePlanBanner } from "@/components/ActivePlanBanner";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Gate>
      <ActivePlanBanner />
      <div className="flex flex-1 flex-col">{children}</div>
      <TabBar />
    </Gate>
  );
}
