import { Route, BrowserRouter as Router, Routes } from "react-router-dom";

import DashboardScreen from "./components/DashboardScreen";
import DeviceWelcome from "./components/DeviceWelcome";
import EquipmentSetup from "./components/EquipmentSetup";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<DeviceWelcome />} />
        <Route path="/setup" element={<EquipmentSetup />} />
        <Route path="/device/:id/control" element={<DashboardScreen />} />
      </Routes>
    </Router>
  );
}
