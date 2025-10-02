require("dotenv").config();
const express = require("express");
const nodemailer = require("nodemailer");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// Gmail transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Contact form API
app.post("/send-email", async (req, res) => {
  const { email, message, token } = req.body;

  try {
    // ✅ Verify reCAPTCHA
    const verifyURL = `https://www.google.com/recaptcha/api/siteverify?secret=${process.env.RECAPTCHA_SECRET_KEY}&response=${token}`;
    const captchaResponse = await fetch(verifyURL, { method: "POST" });
    const captchaData = await captchaResponse.json();

    if (!captchaData.success) {
      return res.status(400).json({ success: false, error: "Captcha verification failed" });
    }

    // ✅ Send email
    await transporter.sendMail({
      from: email,
      to: process.env.EMAIL_USER,
      subject: `New message from ${email}`,
      text: message,
    });

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error sending email:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Server listen
app.listen(process.env.PORT || 5000, () =>
  console.log(`🚀 Server running on http://localhost:${process.env.PORT || 5000}`)
);
