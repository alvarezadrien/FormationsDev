import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import "./App.css";

// import pages
import Home from "./pages/Home/Home";
import { FormFormations } from "./pages/FormFormations/FormFormations";
import { DetailsFormations } from "./pages/DetailsFormations/DetailsFormations";
import LoginRegister from "./pages/Login/Login";
import AdminFormationsDashboard from "./pages/Dashboard/Dashboard";
import { Contact } from "./pages/Contact/Contact";

// import components
import { Navbar } from "./components/Navbar/Navbar";
import { Footer } from "./components/Footer/Footer";

function ProtectedAdminRoute({ children }) {
  const isAdmin = localStorage.getItem("role") === "admin";
  const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";

  if (!isLoggedIn || !isAdmin) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function App() {
  return (
    <Router>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/inscription-formations" element={<FormFormations />} />
        <Route path="/details-formations/:id" element={<DetailsFormations />} />
        <Route path="/login" element={<LoginRegister />} />
        <Route path="/contact" element={<Contact />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedAdminRoute>
              <AdminFormationsDashboard />
            </ProtectedAdminRoute>
          }
        />
      </Routes>
      <Footer/>
    </Router>
  );
}

export default App;