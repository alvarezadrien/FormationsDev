import { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { flushSync } from "react-dom";
import "./App.css";

// import pages
import Home from "./pages/Home/Home";
import { FormFormations } from "./pages/FormFormations/FormFormations";
import { DetailsFormations } from "./pages/DetailsFormations/DetailsFormations";
import LoginRegister from "./pages/Login/Login";
import AdminFormationsDashboard from "./pages/Dashboard/Dashboard";
import ProfilCompte from "./pages/ProfilCompte/ProfilCompte";
import ProfilFormateurPage from "./pages/ProfilFormateurPage/ProfilFormateurPage";
import { Contact } from "./pages/Contact/Contact";
import { StatsPage } from "./pages/StatsPage/StatsPage";
import { BioFormateur } from "./pages/BioFormateur/BioFormateur";

// import components
import { Navbar } from "./components/Navbar/Navbar";
import { Footer } from "./components/Footer/Footer";
import { TopButton } from "./components/TopButton/TopButton";

function ProtectedAdminRoute({ children }) {
  const role = localStorage.getItem("role");
  const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";

  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }

  if (role !== "admin") {
    if (role === "formateur") {
      return <Navigate to="/profil-formateur" replace />;
    }

    return <Navigate to="/" replace />;
  }

  return children;
}

function ProtectedUserRoute({ children }) {
  const role = localStorage.getItem("role");
  const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";

  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }

  if (role !== "user") {
    if (role === "admin") {
      return <Navigate to="/dashboard" replace />;
    }

    if (role === "formateur") {
      return <Navigate to="/profil-formateur" replace />;
    }

    return <Navigate to="/" replace />;
  }

  return children;
}

function ProtectedFormateurRoute({ children }) {
  const role = localStorage.getItem("role");
  const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";

  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }

  if (role !== "formateur") {
    if (role === "admin") {
      return <Navigate to="/dashboard" replace />;
    }

    if (role === "user") {
      return <Navigate to="/profil-compte" replace />;
    }

    return <Navigate to="/" replace />;
  }

  return children;
}

function GuestRoute({ children }) {
  const role = localStorage.getItem("role");
  const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";

  if (isLoggedIn && role === "admin") {
    return <Navigate to="/dashboard" replace />;
  }

  if (isLoggedIn && role === "user") {
    return <Navigate to="/profil-compte" replace />;
  }

  if (isLoggedIn && role === "formateur") {
    return <Navigate to="/profil-formateur" replace />;
  }

  return children;
}

function App() {
  const [theme, setTheme] = useState(() => {
    const storedTheme = localStorage.getItem("theme");

    if (storedTheme === "dark" || storedTheme === "light") {
      return storedTheme;
    }

    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    document.body.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    const startViewTransition = document.startViewTransition?.bind(document);

    if (!startViewTransition) {
      setTheme(nextTheme);
      return;
    }

    document.documentElement.classList.add("theme-transitioning");

    const transition = startViewTransition(() => {
      flushSync(() => {
        setTheme(nextTheme);
      });
    });

    transition.finished.finally(() => {
      document.documentElement.classList.remove("theme-transitioning");
    });
  };

  return (
    <Router>
      <Navbar theme={theme} onToggleTheme={toggleTheme} />

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/inscription-formations" element={<FormFormations />} />
        <Route path="/details-formations/:id" element={<DetailsFormations />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/statistique" element={<StatsPage />} />
        <Route path="/bio-formateur/:id" element={<BioFormateur />} />

        <Route
          path="/profil-compte"
          element={
            <ProtectedUserRoute>
              <ProfilCompte />
            </ProtectedUserRoute>
          }
        />

        <Route
          path="/profil-formateur"
          element={
            <ProtectedFormateurRoute>
              <ProfilFormateurPage />
            </ProtectedFormateurRoute>
          }
        />

        <Route
          path="/login"
          element={
            <GuestRoute>
              <LoginRegister />
            </GuestRoute>
          }
        />

        <Route
          path="/dashboard"
          element={
            <ProtectedAdminRoute>
              <AdminFormationsDashboard />
            </ProtectedAdminRoute>
          }
        />
      </Routes>

      <TopButton />
      <Footer />
    </Router>
  );
}

export default App;
