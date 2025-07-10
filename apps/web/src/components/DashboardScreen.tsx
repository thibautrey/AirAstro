import CameraRail from "./dashboard/CameraRail";
import GuidingOverlay from "./dashboard/GuidingOverlay";
import HistogramBar from "./dashboard/HistogramBar";
import LiveCanvas from "./dashboard/LiveCanvas";
import ModeRail from "./dashboard/ModeRail";
import TopBarDashboard from "./dashboard/TopBarDashboard";
import { useParams } from "react-router-dom";

export default function DashboardScreen() {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="viewport-height bg-bg-surface overflow-hidden relative">
      {/* Global toolbar at top */}
      <TopBarDashboard deviceId={id} />

      {/* Main content area with overlays */}
      <div className="relative dashboard-content-height flex">
        {/* Left vertical mode rail */}
        <ModeRail />

        {/* Central stage area */}
        <div className="flex-1 relative">
          <LiveCanvas />
          <GuidingOverlay />
        </div>

        {/* Right camera control rail */}
        <CameraRail />
      </div>

      {/* Bottom histogram/stats bar */}
      <HistogramBar />
    </div>
  );
}
