function doGet() {
  return HtmlService.createHtmlOutputFromFile('login')
    .setTitle('DecodeXMarket - Login')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQj0cZFi-EdDoDFsyh4Wu1uTmIxYmBalbS7yQUWapjfagJRChXj0l78gZm9LTaYp32x0nKyOwxQ5tyk/pub?output=csv";

/**
 * Checks login credentials against Admin and CSV data
 */
function checkLogin(email, password) {
  // 1. Hardcoded Admin Check
  if (email === "TheRsk" && password === "TheRsk@01") {
    return { success: true, role: "admin", message: "Admin Access Granted" };
  }

  try {
    // 2. Fetch CSV Data
    const response = UrlFetchApp.fetch(CSV_URL);
    const csvData = response.getContentText();
    const rows = Utilities.parseCsv(csvData);

    // 3. Iterate through rows (Skip header row 0)
    for (let i = 1; i < rows.length; i++) {
      const rowEmail = rows[i][1];    // Column B (Index 1)
      const rowPassword = rows[i][11]; // Column L (Index 11)

      if (rowEmail === email && rowPassword === password) {
        return { success: true, role: "user", message: "Login Successful" };
      }
    }

    return { success: false, message: "Invalid Email or Password" };
  } catch (error) {
    return { success: false, message: "System Error: " + error.toString() };
  }
}

/**
 * Triggered by Google Form Submission
 * Setup: In Apps Script editor, go to Triggers -> Add Trigger -> sendWelcomeEmail -> From Form -> On Form Submit
 */
function sendWelcomeEmail(e) {
  try {
    // Assuming Form Structure: Timestamp, Email, Name, ..., Password
    // Adjust indices based on your specific form response sheet
    const userEmail = e.namedValues['Email Address'] ? e.namedValues['Email Address'][0] : e.values[1];
    const userPassword = e.namedValues['Password'] ? e.namedValues['Password'][0] : e.values[11]; // Adjust index if needed
    const userName = e.namedValues['Name'] ? e.namedValues['Name'][0] : "Trader";

    const htmlBody = `
      <div style="background-color: #0a0a0a; color: #ffffff; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; border-radius: 10px; max-width: 600px; margin: auto; border: 1px solid #222;">
        <h1 style="color: #f27d26; text-transform: uppercase; letter-spacing: 2px; border-bottom: 2px solid #f27d26; padding-bottom: 10px;">DecodeXMarket</h1>
        <p style="font-size: 16px; line-height: 1.6;">Hello <strong>${userName}</strong>,</p>
        <p style="font-size: 16px; line-height: 1.6;">Welcome to the elite circle of institutional data decoding. Your account has been successfully registered.</p>
        
        <div style="background-color: #141416; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #f27d26;">
          <p style="margin: 0; font-size: 14px; color: #888; text-transform: uppercase;">Your Credentials</p>
          <p style="margin: 10px 0 5px 0;"><strong>Email ID:</strong> ${userEmail}</p>
          <p style="margin: 0;"><strong>Password:</strong> ${userPassword}</p>
        </div>

        <p style="color: #ff4444; font-weight: bold; font-size: 14px; background: rgba(255,68,68,0.1); padding: 10px; border-radius: 5px; text-align: center;">
          ⚠️ IMPORTANT: Remember and save this email for later use.
        </p>

        <p style="font-size: 14px; color: #666; margin-top: 30px; text-align: center;">
          Happy Trading,<br>
          <strong>Team DecodeXMarket</strong>
        </p>
      </div>
    `;

    MailApp.sendEmail({
      to: userEmail,
      subject: "Welcome to DecodeXMarket - Your Login Credentials",
      htmlBody: htmlBody,
      name: "DecodeXMarket"
    });

  } catch (error) {
    Logger.log("Error sending email: " + error.toString());
  }
}
