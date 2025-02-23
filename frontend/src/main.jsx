import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import {Auth0Provider} from '@auth0/auth0-react'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Auth0Provider
    domain='dev-ccmy6um2itf0jid5.us.auth0.com'
    clientId='lHlNWSq1xLOkWXpViqAnLCjmT0hppfqq'
    authorizationParams={
    {
      redirect_uri:"http://localhost:5173"
    }
    }
    audience="http://localhost:5000"
    scope="openid profile email"
    >
      <App />
    </Auth0Provider>
    
  </StrictMode>,
)
