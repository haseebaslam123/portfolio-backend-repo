require("dotenv").config();
const express = require("express");
const nodemailer = require("nodemailer");
const cors = require("cors");

const app = express();

// CORS configuration - allow your frontend domain
app.use(cors({
  origin: "*", // Change this to your frontend URL in production
  methods: ["POST", "GET"],
  credentials: true
}));

app.use(express.json());

// Gmail transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Test route
app.get("/", (req, res) => {
  res.json({ message: "Backend is running!" });
});

// Contact form API
app.post("/send-email", async (req, res) => {
  const { email, message, token } = req.body;

  console.log("Received request:", { email, message, token: token ? "present" : "missing" });

  // Validate input
  if (!email || !message) {
    return res.status(400).json({ 
      success: false, 
      error: "Email and message are required" 
    });
  }

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ 
      success: false, 
      error: "Invalid email format" 
    });
  }

  try {
    // Verify reCAPTCHA (only if secret key is provided)
    if (process.env.RECAPTCHA_SECRET_KEY && token) {
      console.log("Verifying reCAPTCHA...");
      const verifyURL = `https://www.google.com/recaptcha/api/siteverify?secret=${process.env.RECAPTCHA_SECRET_KEY}&response=${token}`;
      
      const captchaResponse = await fetch(verifyURL, { method: "POST" });
      const captchaData = await captchaResponse.json();

      console.log("reCAPTCHA verification result:", captchaData);

      if (!captchaData.success) {
        return res.status(400).json({ 
          success: false, 
          error: "Captcha verification failed" 
        });
      }
    }

    // Send email
    console.log("Sending email...");
    await transporter.sendMail({
      from: process.env.EMAIL_USER, // Must be your authenticated email
      to: process.env.EMAIL_USER, // Your inbox
      replyTo: email, // User's email for easy reply
      subject: `New Contact Form Message from ${email}`,
      text: `You received a new message from your portfolio contact form:\n\nFrom: ${email}\n\nMessage:\n${message}`,
      html: `
        <h2>New Contact Form Submission</h2>
        <p><strong>From:</strong> ${email}</p>
        <p><strong>Message:</strong></p>
        <p>${message.replace(/\n/g, '<br>')}</p>
      `
    });

    console.log("Email sent successfully!");
    res.status(200).json({ success: true, message: "Email sent successfully" });
    
  } catch (error) {
    console.error("Error sending email:", error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to send email. Please try again later." 
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Server error:", err);
  res.status(500).json({ success: false, error: "Internal server error" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`Environment check:`);
  console.log(`- EMAIL_USER: ${process.env.EMAIL_USER ? "✓" : "✗"}`);
  console.log(`- EMAIL_PASS: ${process.env.EMAIL_PASS ? "✓" : "✗"}`);
  console.log(`- RECAPTCHA_SECRET_KEY: ${process.env.RECAPTCHA_SECRET_KEY ? "✓" : "✗"}`);
});