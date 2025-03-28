import { SignUp } from '@clerk/clerk-react'
import React from 'react'
import './Register.css'

function Register() {
  return (
    <div className="register">
      <SignUp signInUrl='/login'/>
    </div>
  )
}

export default Register