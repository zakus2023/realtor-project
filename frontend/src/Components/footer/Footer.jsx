import React from 'react'
import './Footer.css'
import logo from "/logowhite.png";


function Footer() {
  return (
    <section className='f-wrapper'>
        <div className="paddings innerWidth flexCenter f-container">
            {/* left footer */}
            <div className="flexColCenter f-left">
                <img src={logo} alt="logo" width={80} height={60} />
                <span className="secondaryText">
                    Our Vision is to make quality and affordable <br />housing accessible to all
                </span>
            </div>
            {/* right footer */}
            <div className="flexColStart r-footer">
                <span className='primaryText'>Our Location</span>
                <span className='secondaryText'>Plot 5A Block L, Oforikrom Kumasi, Ghana</span>
                <div className="flexCenter f-menu">
                    <span className='secondaryText'>Properties</span>
                    <span className='secondaryText'> Services</span>
                    <span className='secondaryText'>Products</span>
                    <span className='secondaryText'>About Us</span>
                </div>
            </div>
        </div>
    </section>
  )
}

export default Footer
