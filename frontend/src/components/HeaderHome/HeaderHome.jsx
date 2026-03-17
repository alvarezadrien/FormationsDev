import './HeaderHome.css'

export function HeaderHome() {
  return (
    <header className="header_home">
      <div className="overlay"></div>

      <div className="header_content">
        <h1>
          Boostez vos compétences
          <span>avec nos formations en ligne</span>
        </h1>

        <p>
          Apprenez à votre rythme avec des formations modernes,
          accessibles et certifiantes.
        </p>

        <div className="header_buttons">
          <a href="#formations" className="btn_primary">
            Explorer les formations
          </a>

          <a href="/contact" className="btn_secondary">
            Nous contacter
          </a>
        </div>
      </div>
    </header>
  )
}