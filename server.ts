import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import axios from "axios";
import nodemailer from "nodemailer";
import admin from "firebase-admin";

// Initialize Firebase Admin
try {
  const projectId = "gen-lang-client-0237713481";
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: projectId,
  });
  console.log(`[Firebase Admin] Initialized successfully for project: ${projectId}`);
} catch (error) {
  console.warn("[Firebase Admin] Initialization failed. Admin features like password reset via OTP may not work without a service account.", error);
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware for parsing JSON bodies
  app.use(express.json());

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Admin Notification Route
  app.post("/api/admin/notify-registration", async (req, res) => {
    const { userEmail, userName, userUid, accessCode } = req.body;
    const adminEmail = "rshankartrader@gmail.com";

    console.log(`[Notification] New user registration: ${userEmail}`);

    // Check if SMTP credentials are provided
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    if (!smtpUser || !smtpPass) {
      console.warn("[Notification] SMTP credentials missing. Skipping email notification.");
      return res.status(200).json({ status: "skipped", message: "SMTP credentials not configured" });
    }

    try {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });

      const mailOptions = {
        from: `"DecodeXMarket System" <${smtpUser}>`,
        to: adminEmail,
        subject: "🚨 New User Registered - DecodeXMarket",
        html: `
          <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px; max-width: 600px;">
            <h2 style="color: #F27D26; border-bottom: 2px solid #F27D26; padding-bottom: 10px;">New Registration Alert</h2>
            <p>A new user has just registered on the platform.</p>
            <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">Name:</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee;">${userName || "N/A"}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">Email:</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee;">${userEmail}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">UID:</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee; font-family: monospace; font-size: 12px;">${userUid}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">Access Code:</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee; font-family: monospace; font-weight: bold; color: #F27D26;">${accessCode || "N/A"}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">Time:</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee;">${new Date().toLocaleString()}</td>
              </tr>
            </table>
            <p style="margin-top: 30px; font-size: 12px; color: #777;">
              This is an automated notification from your DecodeXMarket terminal.
            </p>
          </div>
        `,
      };

      await transporter.sendMail(mailOptions);
      console.log(`[Notification] Email sent to ${adminEmail}`);
      res.json({ status: "success" });
    } catch (error) {
      console.error("[Notification] Error sending email:", error);
      res.status(500).json({ error: "Failed to send email notification" });
    }
  });

  // OTP Storage (In-memory for simplicity)
  const otpStore = new Map<string, { otp: string; expires: number }>();
  const resetTokenStore = new Map<string, { token: string; expires: number }>();

  // API Proxy for Google Apps Script to bypass CORS
  app.get("/api/backtest/current", async (req, res) => {
    const webAppUrl = "https://script.google.com/macros/s/AKfycbzRd-z3NoEA0BCqhvhJZf3m1TaLA0BjcrfqnRhI1m0ANrQRZndkvAU_MZEk4OMeob3P/exec";
    
    try {
      const response = await axios.get(webAppUrl, {
        maxRedirects: 5,
        validateStatus: (status) => status < 500,
      });
      
      if (response.status >= 400) {
        return res.status(response.status).json({ error: `GAS Error: ${response.statusText}` });
      }
      
      res.json(response.data);
    } catch (error) {
      console.error("[Proxy] Current Data Error:", error);
      res.status(500).json({ error: "Failed to fetch current sheet data" });
    }
  });

  // API Proxy for Google Apps Script to bypass CORS
  app.get("/api/backtest", async (req, res) => {
    const { start, end } = req.query;
    const webAppUrl = "https://script.google.com/macros/s/AKfycbzRd-z3NoEA0BCqhvhJZf3m1TaLA0BjcrfqnRhI1m0ANrQRZndkvAU_MZEk4OMeob3P/exec";
    const queryUrl = `${webAppUrl}?start=${start}&end=${end}`;

    console.log(`[Proxy] Fetching backtest data: ${queryUrl}`);

    try {
      const response = await axios.get(queryUrl, {
        maxRedirects: 5,
        timeout: 600000, // 10 minutes timeout for long backtests
        validateStatus: (status) => status < 500, // Handle 302, 404, etc.
      });
      
      console.log(`[Proxy] GAS Response Status: ${response.status}`);
      
      if (response.status >= 400) {
        console.error(`[Proxy] GAS Error Body:`, response.data);
        return res.status(response.status).json({ error: `Google Apps Script Error: ${response.statusText}` });
      }
      
      // If GAS returns HTML instead of JSON (happens if not deployed as web app correctly)
      if (typeof response.data === 'string' && response.data.includes('<!DOCTYPE html>')) {
        console.error(`[Proxy] Received HTML instead of JSON. Check GAS deployment.`);
        return res.status(500).json({ error: "Received HTML from Google Script. Ensure it's deployed as a Web App with 'Anyone' access and returns JSON." });
      }

      console.log(`[Proxy] Data received successfully:`, JSON.stringify(response.data));
      res.json(response.data);
    } catch (error) {
      console.error("[Proxy] Critical Error:", error);
      res.status(500).json({ error: `Internal Server Error during proxy: ${error instanceof Error ? error.message : 'Unknown error'}` });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
