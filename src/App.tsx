import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "@/pages/Home";
import Configure from "@/pages/Configure";
import Results from "@/pages/Results";
import AreaDetail from "@/pages/AreaDetail";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/configure" element={<Configure />} />
        <Route path="/results" element={<Results />} />
        <Route path="/results/:areaId" element={<AreaDetail />} />
      </Routes>
    </Router>
  );
}
