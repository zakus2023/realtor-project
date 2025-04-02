import React, { useEffect } from 'react'
import { useLocation } from 'react-router-dom';

function StripePaymentSuccess() {
    const location = useLocation();

  useEffect(() => {
    // You can check payment status here if needed
    console.log('Payment succeeded!', location.search);
  }, []);

  return (
    <div>
      <h2>Payment Successful!</h2>
      <p>Thank you for your payment.</p>
    </div>
  );
}

export default StripePaymentSuccess
