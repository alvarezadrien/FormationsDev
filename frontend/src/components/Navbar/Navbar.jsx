import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "./Navbar.css";

import userImg from "/images/utilisateur.png";

import { FaUserShield } from "react-icons/fa";
import { MdDashboard } from "react-icons/md";
import { HiOutlineLogout, HiOutlineUserCircle } from "react-icons/hi";
import { IoChevronDown, IoSearch, IoClose } from "react-icons/io5";

export function Navbar() {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const dropdownRef = useRef(null);
  const searchRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

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
    const params = new URLSearchParams(location.search);
    const currentSearch = params.get("search") || "";
    setSearchTerm(currentSearch);

    if (currentSearch.trim()) {
      setSearchOpen(true);
    }
  }, [location.search]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }

      if (
        searchRef.current &&
        !searchRef.current.contains(event.target) &&
        !event.target.closest(".navbar_search_toggle")
      ) {
        if (!searchTerm.trim()) {
          setSearchOpen(false);
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [searchTerm]);

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

  const handleSearchSubmit = (e) => {
    e.preventDefault();

    const keyword = searchTerm.trim();

    if (!keyword) {
      navigate("/", { replace: false });
      return;
    }

    navigate(`/?search=${encodeURIComponent(keyword)}#formations`, {
      replace: false,
    });
  };

  const handleClearSearch = () => {
    setSearchTerm("");
    navigate("/", { replace: false });
    setSearchOpen(false);
  };

  const toggleSearch = () => {
    setSearchOpen((prev) => !prev);
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

          <Link to="/statistique" className="navbar_item">
            Statistiques
          </Link>
        </div>

        <div className="navbar_actions">
          <button
            type="button"
            className={`navbar_search_toggle ${searchOpen ? "active" : ""}`}
            onClick={toggleSearch}
            title="Rechercher une formation"
            aria-label="Rechercher une formation"
          >
            <IoSearch size={20} />
          </button>

          {isConnected && !isAdmin && (
            <Link
              to="/profil-compte"
              className="navbar_profile_link"
              title="Profil compte"
            >
              <HiOutlineUserCircle size={20} />
              <span>Profil compte</span>
            </Link>
          )}

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
              <img
                src={userImg}
                alt="Utilisateur"
                className="navbar_login_avatar"
              />
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
                            : `${
                                currentUser?.prenom || ""
                              } ${currentUser?.nom || ""}`.trim() ||
                              "Compte connecté"}
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

      {searchOpen && (
        <div className="navbar_search_panel" ref={searchRef}>
          <form className="navbar_search_form" onSubmit={handleSearchSubmit}>
            <div className="navbar_search_box">
              <IoSearch className="navbar_search_icon" size={18} />

              <input
                type="text"
                className="navbar_search_input"
                placeholder="Rechercher une formation, un langage, un lieu, une date..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />

              {searchTerm.trim() && (
                <button
                  type="button"
                  className="navbar_clear_button"
                  onClick={handleClearSearch}
                  title="Effacer la recherche"
                  aria-label="Effacer la recherche"
                >
                  <IoClose size={18} />
                </button>
              )}

              <button type="submit" className="navbar_search_button">
                Rechercher
              </button>
            </div>
          </form>
        </div>
      )}
    </header>
  );
}