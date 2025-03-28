import React from 'react'
import { SignIn } from "@clerk/clerk-react";
import './Login.css'

function Login() {
  return (
    <div className='login'>
      <SignIn signUpUrl='/register'/>
    </div>
  )
}

export default Login
