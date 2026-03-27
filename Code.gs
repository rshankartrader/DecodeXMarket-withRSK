/**
 * Code.gs - Google Apps Script Backend (v2 - Robust)
 * Project: DecodeXMarket Backtest Research Page
 */

/**
 * Helper to find the correct sheet even if renamed or spaced
 */
function getTargetSheet() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet() || SpreadsheetApp.getActive();
    if (!ss) {
      console.error("No active spreadsheet found. Ensure the script is bound to a Google Sheet.");
      return null;
    }
    
    const sheets = ss.getSheets();
    if (!sheets || sheets.length === 0) {
      console.error("The spreadsheet has no sheets.");
      return null;
    }
    
    // 1. Try exact match
    let sheet = ss.getSheetByName('Sheet1');
    if (sheet) return sheet;
    
    // 2. Try case-insensitive/trimmed match
    for (let s of sheets) {
      const name = s.getName().toLowerCase().trim();
      if (name === 'sheet1') return s;
    }
    
    // 3. Fallback to the very first sheet
    console.warn("Sheet 'Sheet1' not found. Falling back to the first sheet: " + sheets[0].getName());
    return sheets[0];
  } catch (e) {
    console.error("Error in getTargetSheet: " + e.message);
    return null;
  }
}

function doGet(e) {
  // Handle API requests
  if (e && e.parameter && e.parameter.start && e.parameter.end) {
    try {
      const results = processBacktest(e.parameter.start, e.parameter.end);
      return ContentService.createTextOutput(JSON.stringify(results))
          .setMimeType(ContentService.MimeType.JSON);
    } catch (error) {
      return ContentService.createTextOutput(JSON.stringify({ 
        error: "Backtest Error: " + error.message
      })).setMimeType(ContentService.MimeType.JSON);
    }
  }
  
  // Return current values if no parameters
  try {
    const sheet = getTargetSheet();
    if (!sheet) {
      return ContentService.createTextOutput(JSON.stringify({ error: "Could not find any sheet in the spreadsheet." }))
          .setMimeType(ContentService.MimeType.JSON);
    }
    
    const summaryData = sheet.getRange('H7:H11').getDisplayValues().map(row => row[0]);
    const detailRange = sheet.getRange('A3:E100').getDisplayValues();
    const details = detailRange
      .filter(row => row[0] !== "")
      .map(row => ({
        date: row[0],
        verdict: row[1],
        points: row[3],
        move: row[4]
      }));

    return ContentService.createTextOutput(JSON.stringify({
      summary: summaryData,
      details: details
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    console.error("doGet Error: " + err.message);
    return ContentService.createTextOutput(JSON.stringify({ error: "System Error: " + err.message }))
        .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Process the backtest calculation using the user's specific logic
 */
function processBacktest(startDate, endDate) {
  var ss = SpreadsheetApp.getActiveSpreadsheet() || SpreadsheetApp.getActive();
  var dashboardSheet = ss.getSheetByName("DASHBOARD");
  var historySheet = ss.getSheetByName("Sheet1");
  var holidaySheet = ss.getSheetByName("Holiday");
  
  if (!dashboardSheet || !historySheet || !holidaySheet) {
    throw new Error("Required sheets (DASHBOARD, Sheet1, Holiday) not found. Please check your tab names.");
  }

  try {
    // 1. Set Inputs in Sheet1 G2 and H2
    historySheet.getRange('G2').setValue(startDate);
    historySheet.getRange('H2').setValue(endDate);
    SpreadsheetApp.flush();

    // 2. Get Dates for Loop
    var startVal = historySheet.getRange("G2").getValue();
    var endVal = historySheet.getRange("H2").getValue();
    if (!startVal || !endVal) throw new Error("Dates not set correctly in G2/H2");

    var startD = new Date(startVal);
    var endD = new Date(endVal);
    var current = new Date(startD);

    // 3. Get Holidays
    var holidayRange = holidaySheet.getRange("B2:B20").getValues();
    var holidays = holidayRange.map(function(row) {
      return row[0] instanceof Date ? row[0].toDateString() : null;
    });

    // 4. AUTO-CLEAN: Clears old data in Backtest Column A and B (from Row 3 down)
    var lastRowHistory = historySheet.getLastRow();
    if (lastRowHistory >= 3) {
      historySheet.getRange(3, 1, lastRowHistory, 2).clearContent();
    }

    // 5. Set Starting Row for new data
    var writeRow = 3;

    // 6. Loop through dates (User's Core Logic)
    while (current <= endD) {
      var dayOfWeek = current.getDay();
      var dateString = current.toDateString();

      var isWeekend = (dayOfWeek === 0 || dayOfWeek === 6);
      var isHoliday = holidays.indexOf(dateString) !== -1;

      if (!isWeekend && !isHoliday) {
        // Update Date in DASHBOARD
        dashboardSheet.getRange("A3").setValue(new Date(current));

        // Force refresh and WAIT
        SpreadsheetApp.flush();
        Utilities.sleep(4000); // 4 seconds as per user request

        // Capture Verdict from Dashboard Cell D1
        var verdict = dashboardSheet.getRange("D1").getValue();

        // Write to Backtest sheet (Sheet1)
        historySheet.getRange(writeRow, 1).setValue(new Date(current)); // Col A
        historySheet.getRange(writeRow, 2).setValue(verdict);           // Col B

        writeRow++; 
      }

      current.setDate(current.getDate() + 1);
      SpreadsheetApp.flush();
    }

    // 7. Final Results
    Utilities.sleep(1000);
    SpreadsheetApp.flush();
    
    // Summary from H7:H11
    const summaryData = historySheet.getRange('H7:H11').getDisplayValues().map(row => row[0]);
    
    // Detailed logs from A3:E100
    // A: Date, B: Verdict, C: (Empty/Other), D: Points, E: Move
    const detailRange = historySheet.getRange('A3:E100').getDisplayValues();
    const details = detailRange
      .filter(row => row[0] !== "") // Only rows with a date
      .map(row => ({
        date: row[0],
        verdict: row[1],
        points: row[3],
        move: row[4]
      }));

    return {
      summary: summaryData,
      details: details
    };

  } catch (e) {
    throw new Error("Backtest Logic Error: " + e.message);
  }
}

/**
 * This function can be assigned to the button in the sheet
 */
function runBacktest() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var historySheet = ss.getSheetByName("Sheet1");
  if (!historySheet) return;
  
  var startVal = historySheet.getRange("G2").getDisplayValue();
  var endVal = historySheet.getRange("H2").getDisplayValue();
  
  if (!startVal || !endVal) {
    SpreadsheetApp.getUi().alert("Please enter dates in G2 and H2");
    return;
  }
  
  try {
    processBacktest(startVal, endVal);
    SpreadsheetApp.getUi().alert("Backtest Complete!");
  } catch (e) {
    SpreadsheetApp.getUi().alert("Error: " + e.message);
  }
}

/**
 * Test function to run manually in GAS editor
 */
function testBacktest() {
  const results = processBacktest("2024-01-01", "2024-03-01");
  Logger.log(results);
}
