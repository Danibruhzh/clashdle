import clashBackground from '../images/clash background2.jpg'
import './Background.css'

function Background() {
  return (
    <>
      <div className="background" style={{ backgroundImage: `url(${clashBackground})` }} />
      <p className="background-credit">Background: David Fortin</p>
    </>
  )
}

export default Background
