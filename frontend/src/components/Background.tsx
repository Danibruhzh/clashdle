import clashBackground from '../images/clash background.png'
import './Background.css'

function Background() {
  return (
    <div className="background" style={{ backgroundImage: `url(${clashBackground})` }} />
  )
}

export default Background
