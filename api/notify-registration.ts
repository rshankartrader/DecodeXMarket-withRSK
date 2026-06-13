import nodemailer from "nodemailer";

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

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
    res.status(200).json({ status: "success" });
  } catch (error) {
    console.error("[Notification] Error sending email:", error);
    res.status(500).json({ error: "Failed to send email notification" });
  }
}
