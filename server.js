require("dotenv").config();
const express = require("express");
const { Resend } = require("resend");
const cors = require("cors");

const app = express();

// CORS configuration - allow your frontend domain
app.use(cors({
  origin: "*", // Change this to your frontend URL in production
  methods: ["POST", "GET"],
  credentials: true
}));

app.use(express.json());

// Resend configuration
const resend = new Resend(process.env.RESEND_API_KEY);

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
      
      const verifyResponse = await fetch("https://www.google.com/recaptcha/api/siteverify", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `secret=${process.env.RECAPTCHA_SECRET_KEY}&response=${token}`
      });
      
      const captchaData = await verifyResponse.json();

      console.log("reCAPTCHA verification result:", captchaData);

      if (!captchaData.success) {
        return res.status(400).json({ 
          success: false, 
          error: "Captcha verification failed" 
        });
      }
    }

    // Send email using Resend
    console.log("Sending email...");
    await resend.emails.send({
      from: "onboarding@resend.dev", // Free tier sender (or use your verified domain)
      to: process.env.EMAIL_USER || "haseebquotex1021@gmail.com", // Your inbox
      reply_to: email, // User's email for easy reply
      subject: `New Contact Form Message from ${email}`,
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
  console.log(`- RESEND_API_KEY: ${process.env.RESEND_API_KEY ? "✓" : "✗"}`);
  console.log(`- RECAPTCHA_SECRET_KEY: ${process.env.RECAPTCHA_SECRET_KEY ? "✓" : "✗"}`);
});