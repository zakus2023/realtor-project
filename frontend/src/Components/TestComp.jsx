export const bookVisit = asyncHandler(async (req, res) => {
  const {
    email,
    date,
    time,
    visitStatus,
    paymentMethod,
    paymentStatus,
    paymentMethodId,
    paypalOrderId,
    paymentReference,
  } = req.body;
  const id = req.params.id;

  try {
    // Validate date and time
    const bookingDate = dayjs(date, "YYYY-MM-DD", true);
    const bookingTime = dayjs(time, "HH:mm", true);

    if (!bookingDate.isValid()) {
      return res.status(400).json({
        message: "Invalid date format. Expected format: YYYY-MM-DD",
        receivedDate: date,
      });
    }

    if (!bookingTime.isValid()) {
      return res.status(400).json({
        message: "Invalid time format. Expected format: HH:mm",
        receivedTime: time,
      });
    }

    // Check if the booking date is in the future
    if (bookingDate.isBefore(dayjs(), "day")) {
      return res
        .status(400)
        .json({ message: "Booking date must be in the future" });
    }

    // Fetch user
    const user = await prisma.user.findUnique({
      where: { email },
      select: { bookedVisit: true, name: true, telephone: true, address: true },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Initialize bookedVisit as an empty array if it doesn't exist
    user.bookedVisit = user.bookedVisit || [];

    // Check if the user has already booked this property
    if (
      user.bookedVisit.some(
        (visit) => visit.propertyId === id && visit.bookingStatus === "active"
      )
    ) {
      return res
        .status(400)
        .json({ message: "You have already booked to visit this property" });
    }

    // Handle Stripe payment confirmation
    if (paymentMethod === "stripe" && paymentMethodId) {
      try {
        const paymentIntent = await stripe.paymentIntents.create({
          amount: 1000, // Amount in cents (e.g., $10.00)
          currency: "usd",
          payment_method: paymentMethodId,
          confirmation_method: "manual",
          confirm: true,
        });

        if (paymentIntent.status !== "succeeded") {
          return res
            .status(400)
            .json({ message: "Stripe payment failed. Please try again." });
        }
      } catch (stripeError) {
        console.error("Stripe payment error:", stripeError);
        return res
          .status(400)
          .json({ message: "Stripe payment failed. Please try again." });
      }
    }

    // Handle PayPal payment confirmation
    if (paymentMethod === "paypal" && paypalOrderId) {
      try {
        const request = new paypal.orders.OrdersCaptureRequest(paypalOrderId);
        request.requestBody({});

        const response = await paypalClient.execute(request);

        if (response.result.status !== "COMPLETED") {
          return res
            .status(400)
            .json({ message: "PayPal payment failed. Please try again." });
        }
      } catch (paypalError) {
        console.error("PayPal payment error:", paypalError);
        return res
          .status(400)
          .json({ message: "PayPal payment failed. Please try again." });
      }
    }

    // Handle Paystack payment confirmation
    if (paymentMethod === "paystack" && paymentReference) {
      try {
        const verificationResponse = await axios.get(
          `${PAYSTACK_BASE_URL}/transaction/verify/${paymentReference}`,
          {
            headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` },
          }
        );

        const verificationData = verificationResponse.data;
        console.log("Verification data from book visit: ", verificationData);

        if (
          verificationData.status !== true ||
          verificationData.data.status !== "success"
        ) {
          return res
            .status(400)
            .json({ message: "Paystack payment failed. Please try again." });
        }
      } catch (paystackError) {
        console.error(
          "Paystack payment error:",
          paystackError.response?.data || paystackError.message
        );
        return res
          .status(400)
          .json({ message: "Paystack payment verification failed." });
      }
    }

    // Generate booking number and update user (existing code)
    const bookingNumber = await generateUniqueBookingNumber();
    await prisma.user.update({
      where: { email },
      data: {
        bookedVisit: {
          push: {
            id: bookingNumber,
            propertyId: id,
            date,
            time,
            visitStatus: visitStatus || "pending",
            bookingStatus: "active",
            paymentMethod,
            paymentStatus:
              paymentMethod === "pay_on_arrival" ? "pending" : "paid",
            paymentReference,
          },
        },
      },
    });

    // Fetch related data (existing code)
    const property = await prisma.residency.findUnique({ where: { id } });
    const owner = await prisma.user.findUnique({
      where: { email: property.userEmail },
    });
    const admins = await prisma.user.findMany({ where: { role: "admin" } });

    // ========== FIXED EMAIL SECTION START ========== //
    const formatDate = (dateString) => dayjs(dateString).format("MMMM D, YYYY");
    const formatTime = (timeString) =>
      dayjs(timeString, "HH:mm").format("h:mm A");

    // Generate HTML table rows for booking details
    const bookingDetailsRows = `
      <tr>
        <td style="padding: 8px; border: 1px solid #dee2e6; font-weight: bold;">Property</td>
        <td style="padding: 8px; border: 1px solid #dee2e6;">${
          property.title
        }</td>
      </tr>
      <tr>
        <td style="padding: 8px; border: 1px solid #dee2e6; font-weight: bold;">Date</td>
        <td style="padding: 8px; border: 1px solid #dee2e6;">${formatDate(
          date
        )}</td>
      </tr>
      <tr>
        <td style="padding: 8px; border: 1px solid #dee2e6; font-weight: bold;">Time</td>
        <td style="padding: 8px; border: 1px solid #dee2e6;">${formatTime(
          time
        )}</td>
      </tr>
      <tr>
        <td style="padding: 8px; border: 1px solid #dee2e6; font-weight: bold;">Booking Number</td>
        <td style="padding: 8px; border: 1px solid #dee2e6;">${bookingNumber}</td>
      </tr>
      <tr>
        <td style="padding: 8px; border: 1px solid #dee2e6; font-weight: bold;">Payment Method</td>
        <td style="padding: 8px; border: 1px solid #dee2e6;">${paymentMethod.toUpperCase()}</td>
      </tr>
    `;

    // Prepare email data
    const emailData = {
      userName: user.name,
      propertyTitle: property.title,
      date: formatDate(date),
      time: formatTime(time),
      bookingNumber,
      paymentMethod,
      userPhone: user.telephone,
      userAddress: user.address,
      bookingDetailsRows,
      year: new Date().getFullYear(),
    };

    // Email sending logic
    const sendEmail = async (to, subject, template) => {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: { user: "idbsch2012@gmail.com", pass: "bmdu vqxi dgqj dqoi" },
      });

      await transporter.sendMail({
        from: "idbsch2012@gmail.com",
        to,
        subject,
        html: template,
      });
    };

    try {
      // User confirmation
      const userTemplate = await getConfirmationEmail(emailData);
      await sendEmail(email, "Visit Booked Successfully", userTemplate);

      // Owner notification
      const ownerTemplate = await getOwnerNotificationEmail(emailData);
      await sendEmail(owner.email, "New Property Visit Booking", ownerTemplate);

      // Admin notifications
      const adminEmails = admins.map((admin) => admin.email);
      const adminTemplates = await Promise.all(
        adminEmails.map(() => getOwnerNotificationEmail(emailData))
      );

      await Promise.all(
        adminEmails.map((email, i) =>
          sendEmail(
            email,
            "New Visit Booking - Admin Notification",
            adminTemplates[i]
          )
        )
      );
    } catch (emailError) {
      console.error("Email sending error:", emailError);
    }
    // ========== FIXED EMAIL SECTION END ========== //

    // Existing response remains unchanged
    res.json({
      message: "You have booked to visit the property successfully",
      bookingNumber,
    });
  } catch (error) {
    // Existing error handling remains unchanged
    console.error("Booking error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// Email content for user and admin
const userAdminEmailSubject = "Booking Cancelled";
const userAdminEmailText = `
  Booking Cancelled:
  - Property: ${property.title}
  - Date: ${booking.date}
  - Time: ${booking.time}
  - User: ${user.name}
  - Address: ${user.address}
  - Telephone: ${user.telephone}
`;

// Email content for owner
const ownerEmailSubject = "Visit Cancelled for Your Property";
const ownerEmailText = `
  Booking Cancelled:
  - Property: ${property.title}
  - Date: ${booking.date}
  - Time: ${booking.time}
`;

// Send email to the user
await sendEmail(email, userAdminEmailSubject, userAdminEmailText);

// Send email to all admins
const adminEmails = admins.map((admin) => admin.email);
const adminEmailPromises = adminEmails.map((adminEmail) =>
  sendEmail(adminEmail, userAdminEmailSubject, userAdminEmailText)
);

// Send email to the owner
await sendEmail(owner.email, ownerEmailSubject, ownerEmailText);

await Promise.all(adminEmailPromises);
