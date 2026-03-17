import { Link } from "react-router-dom";
import "./Footer.css";

export function Footer() {
  return (
    <footer className="site_footer">
      <div className="site_footer_wrapper">
        <div className="site_footer_top">
          <div className="site_footer_brand_block">
            <div className="site_footer_logo">
              <span className="site_footer_logo_mark">CF</span>
              <span className="site_footer_logo_text">CentreFormations</span>
            </div>

            <p className="site_footer_description">
              Des formations modernes, accessibles et pensées pour développer
              vos compétences et accompagner votre évolution professionnelle.
            </p>
          </div>

          <div className="site_footer_links_block">
            <h3 className="site_footer_title">Navigation</h3>

            <div className="site_footer_links">
              <Link to="/" className="site_footer_link">
                Accueil
              </Link>

              <Link to="/inscription-formations" className="site_footer_link">
                Inscription
              </Link>

              <Link to="/login" className="site_footer_link">
                Connexion
              </Link>
            </div>
          </div>

          <div className="site_footer_contact_block">
            <h3 className="site_footer_title">Contact</h3>

            <div className="site_footer_contact_list">
              <p className="site_footer_contact_item">Email : contact@centreformations.com</p>
              <p className="site_footer_contact_item">Téléphone : +32 400 00 00 00</p>
              <p className="site_footer_contact_item">Adresse : Bruxelles, Belgique</p>
            </div>
          </div>
        </div>

        <div className="site_footer_bottom">
          <p className="site_footer_copy">
            © 2026 CentreFormations. Tous droits réservés.
          </p>
        </div>
      </div>
    </footer>
  );
}