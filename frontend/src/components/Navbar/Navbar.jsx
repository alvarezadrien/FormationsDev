import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./Navbar.css";

// images
import userImg from "/images/utilisateur.png";

// icons
import { FaUserShield } from "react-icons/fa";
import { MdDashboard } from "react-icons/md";
import { HiOutlineLogout } from "react-icons/hi";
import { IoChevronDown } from "react-icons/io5";

export function Navbar() {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem("token");
      const role = localStorage.getItem("role");

      setIsConnected(!!token);
      setIsAdmin(role === "admin");
    };

    checkAuth();
    window.addEventListener("storage", checkAuth);

    return () => {
      window.removeEventListener("storage", checkAuth);
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

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("user");
    localStorage.removeItem("isLoggedIn");

    setIsConnected(false);
    setIsAdmin(false);
    setDropdownOpen(false);

    navigate("/login");
  };

  return (
    <header className="navbar_shell">
      <nav className="navbar_wrap">
        <div className="navbar_brand_zone">
          <Link to="/" className="navbar_brand">
            <span className="navbar_brand_mark">CF</span>
            <span className="navbar_brand_text">CentreFormations</span>
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
                  {isAdmin ? "Admin" : "Mon compte"}
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
                        <strong>{isAdmin ? "Compte administrateur" : "Compte connecté"}</strong>
                        <span>
                          {isAdmin
                            ? "Accès au tableau de bord"
                            : "Vous êtes bien connecté"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="navbar_dropdown_actions">
                    {isAdmin && (
                      <button
                        className="navbar_dropdown_item"
                        type="button"
                        onClick={() => {
                          navigate("/dashboard");
                          setDropdownOpen(false);
                        }}
                      >
                        <MdDashboard size={18} />
                        <span>Dashboard admin</span>
                      </button>
                    )}

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