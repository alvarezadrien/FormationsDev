import './Home.css'
import { CartesFormations } from '../../components/CartesFormations/CartesFormations'
import { HeaderHome } from '../../components/HeaderHome/HeaderHome'
import { CartesAvis } from '../../components/CartesAvis/CartesAvis'

function Home() {
  return (
    <>

      <HeaderHome/>

      <section id='formations' className="formations_section">
        <h2>Nos différentes formations</h2>
        <hr />

        <CartesFormations />

      </section>

      <CartesAvis/>
    </>
  )
}

export default Home