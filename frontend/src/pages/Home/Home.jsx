import './Home.css'
import { CartesFormations } from '../../components/CartesFormations/CartesFormations'
import { HeaderHome } from '../../components/HeaderHome/HeaderHome'

function Home() {
  return (
    <>

      <HeaderHome/>

      <section id='formations' className="formations_section">
        <h2>Nos différentes formations</h2>
        <hr />

        <CartesFormations />

      </section>
    </>
  )
}

export default Home