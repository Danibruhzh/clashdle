import profileIcon from '../images/profile icon.png'
import './ProfileButton.css'

interface ProfileButtonProps {
  onOpen: () => void
  loggedIn: boolean
}

function ProfileButton({ onOpen, loggedIn }: ProfileButtonProps) {
  return (
    <button className="profile-button" onClick={onOpen} aria-label="Profile">
      <img className="profile-button-icon" src={profileIcon} alt="" />
      {/* A plain dot, not text — enough to notice at a glance without
          needing its own tooltip on top of the button's existing one. */}
      {loggedIn && <span className="profile-button-badge" aria-hidden="true" />}
      <span className="profile-button-tooltip">{loggedIn ? 'Profile' : 'Log In / Sign Up'}</span>
    </button>
  )
}

export default ProfileButton
