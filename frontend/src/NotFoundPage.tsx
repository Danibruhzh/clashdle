import { Link } from 'react-router-dom'
import Background from './components/Background'
import './NotFoundPage.css'

function NotFoundPage() {
    return (
        <div>
            <Background />
            <div className="not-found-content">
                <h1 className="error-header">Page does not exist</h1>
                <Link className="unlimited-gate-link" to="/">
                    Back to Daily
                </Link>
            </div>
        </div>
    )
}

export default NotFoundPage