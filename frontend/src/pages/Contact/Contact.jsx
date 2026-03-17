import './Contact.css'

export function Contact() {
  return (
    <section className="contact_section" id="contact">
      <div className="contact_container">
        <div className="contact_left">
          <span className="contact_badge">Contact</span>
          <h2>Parlons de votre projet de formation</h2>
          <p>
            Une question sur nos formations, nos certifications ou nos tarifs ?
            Notre équipe est là pour vous répondre rapidement.
          </p>

          <div className="contact_infos">
            <div className="contact_info_card">
              <h3>Email</h3>
              <p>contact@formations.com</p>
            </div>

            <div className="contact_info_card">
              <h3>Téléphone</h3>
              <p>0492953233</p>
            </div>

            <div className="contact_info_card">
              <h3>Adresse</h3>
              <p>12 Rue de la Formation, Bruxelles</p>
            </div>
          </div>
        </div>

        <div className="contact_right">
          <form className="contact_form">
            <div className="form_group">
              <label htmlFor="name">Nom complet</label>
              <input
                type="text"
                id="name"
                name="name"
                placeholder="Votre nom"
              />
            </div>

            <div className="form_group">
              <label htmlFor="email">Adresse email</label>
              <input
                type="email"
                id="email"
                name="email"
                placeholder="exemple@email.com"
              />
            </div>

            <div className="form_group">
              <label htmlFor="subject">Sujet</label>
              <input
                type="text"
                id="subject"
                name="subject"
                placeholder="Sujet de votre message"
              />
            </div>

            <div className="form_group">
              <label htmlFor="message">Message</label>
              <textarea
                id="message"
                name="message"
                rows="6"
                placeholder="Écrivez votre message ici..."
              ></textarea>
            </div>

            <button type="submit" className="contact_btn">
              Envoyer le message
            </button>
          </form>
        </div>
      </div>
    </section>
  )
}