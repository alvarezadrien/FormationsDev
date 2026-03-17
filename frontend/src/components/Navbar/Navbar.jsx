import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./Navbar.css";

import userImg from "/images/utilisateur.png";

import { FaUserShield } from "react-icons/fa";
import { MdDashboard } from "react-icons/md";
import { HiOutlineLogout } from "react-icons/hi";
import { IoChevronDown } from "react-icons/io5";

export function Navbar() {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  const API_URL = "http://localhost:8080";

  const syncAuthState = () => {
    const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
    const role = localStorage.getItem("role");
    const user = localStorage.getItem("user");

    setIsConnected(isLoggedIn);
    setIsAdmin(isLoggedIn && role === "admin");
    setCurrentUser(user ? JSON.parse(user) : null);
  };

  useEffect(() => {
    syncAuthState();

    const handleAuthChanged = () => {
      syncAuthState();
    };

    window.addEventListener("storage", handleAuthChanged);
    window.addEventListener("auth-changed", handleAuthChanged);

    return () => {
      window.removeEventListener("storage", handleAuthChanged);
      window.removeEventListener("auth-changed", handleAuthChanged);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleLogout = async () => {
    try {
      await fetch(`${API_URL}/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch (err) {
      console.error("Erreur logout :", err);
    } finally {
      localStorage.removeItem("role");
      localStorage.removeItem("user");
      localStorage.removeItem("isLoggedIn");

      setIsConnected(false);
      setIsAdmin(false);
      setCurrentUser(null);
      setDropdownOpen(false);

      window.dispatchEvent(new Event("auth-changed"));
      navigate("/login", { replace: true });
    }
  };

  return (
    <header className="navbar_shell">
      <nav className="navbar_wrap">
        <div className="navbar_brand_zone">
          <Link to="/" className="navbar_brand">
            <span className="navbar_brand_mark">CF</span>
            <span className="navbar_brand_text">CodingFormations</span>
          </Link>
        </div>

        <div className="navbar_links">
          <Link to="/" className="navbar_item">
            Accueil
          </Link>

          <Link to="/inscription-formations" className="navbar_item">
            Formulaire inscription
          </Link>
        </div>

        <div className="navbar_actions">
          {isAdmin && (
            <Link
              to="/dashboard"
              className="navbar_admin_link"
              title="Dashboard Admin"
            >
              <MdDashboard size={20} />
              <span>Dashboard</span>
            </Link>
          )}

          {!isConnected ? (
            <Link to="/login" className="navbar_login_link" title="Connexion">
              <img src={userImg} alt="Utilisateur" className="navbar_login_avatar" />
              <span>Connexion</span>
            </Link>
          ) : (
            <div className="navbar_profile_menu" ref={dropdownRef}>
              <button
                className="navbar_profile_button"
                type="button"
                onClick={() => setDropdownOpen((prev) => !prev)}
              >
                <div className="navbar_profile_visual">
                  {isAdmin ? (
                    <FaUserShield size={18} />
                  ) : (
                    <img
                      src={userImg}
                      alt="Profil"
                      className="navbar_profile_avatar"
                    />
                  )}

                  <span className="navbar_status_dot"></span>
                </div>

                <span className="navbar_profile_label">
                  {isAdmin
                    ? "Admin"
                    : currentUser?.prenom || currentUser?.nom || "Mon compte"}
                </span>

                <IoChevronDown
                  size={15}
                  className={`navbar_profile_arrow ${
                    dropdownOpen ? "open" : ""
                  }`}
                />
              </button>

              {dropdownOpen && (
                <div className="navbar_dropdown_panel">
                  <div className="navbar_dropdown_top">
                    <div className="navbar_dropdown_identity">
                      <div className="navbar_dropdown_avatar">
                        {isAdmin ? (
                          <FaUserShield size={18} />
                        ) : (
                          <img
                            src={userImg}
                            alt="Profil"
                            className="navbar_dropdown_avatar_img"
                          />
                        )}
                        <span className="navbar_status_dot large"></span>
                      </div>

                      <div className="navbar_dropdown_texts">
                        <strong>
                          {isAdmin
                            ? "Compte administrateur"
                            : `${currentUser?.prenom || ""} ${currentUser?.nom || ""}`.trim() || "Compte connecté"}
                        </strong>
                        <span>
                          {isAdmin
                            ? "Accès au tableau de bord"
                            : currentUser?.email || "Vous êtes bien connecté"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="navbar_dropdown_actions">
                    <button
                      className="navbar_dropdown_item navbar_logout_item"
                      type="button"
                      onClick={handleLogout}
                    >
                      <HiOutlineLogout size={18} />
                      <span>Déconnexion</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </nav>
    </header>
  );
}