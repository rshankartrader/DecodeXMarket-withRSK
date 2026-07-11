import React, { useState } from 'react';
import { Trade } from './types';
import { 
  TrendingUp, 
  TrendingDown, 
  Percent, 
  Activity, 
  ShieldAlert, 
  DollarSign, 
  Zap, 
  AlertTriangle,
  Award,
  Flame,
  Calendar,
  Layers,
  Edit2,
  RotateCcw,
  Check,
  X,
  User,
  Coins,
  Share2,
  Database,
  Copy,
  ExternalLink,
  Lock,
  CloudLightning
} from 'lucide-react';

interface JournalDashboardProps {
  trades: Trade[];
  accountBalance: number;
  initialBalance: number;
  onUpdateBalance: (balance: number) => Promise<void>;
  onUpdateInitialBalance?: (balance: number) => Promise<void>;
  onResetJournal: (startingBalance: number) => Promise<void>;
  spreadsheetUrl?: string;
  autoSync?: boolean;
  onUpdateSpreadsheetConfig?: (url: string, enabled: boolean) => Promise<void>;
  onSyncAllToSpreadsheet?: () => Promise<boolean>;
  isAdmin?: boolean;
}

const APPS_SCRIPT_CODE = `/**
 * Google Apps Script for Multi-User Decodex Trading Journal
 * 
 * Instructions:
 * 1. Open Google Sheets (https://sheets.google.com) and create a new Spreadsheet.
 * 2. Click Extensions > Apps Script.
 * 3. Delete any default code and paste this entire script.
 * 4. Click Save (Disk icon).
 * 5. Click Deploy > New deployment.
 * 6. Under "Select type", click the Gear icon and select "Web app".
 * 7. Set "Execute as" to "Me" and "Who has access" to "Anyone".
 * 8. Click Deploy, authorize permissions if prompted.
 * 9. Copy the Web App URL and paste it in the Decodex "Google Sheets Integration" settings.
 */

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Trading Journal") || createJournalSheet();
    var action = data.action;
    var userEmail = data.userEmail || "Anonymous";
    var userId = data.userId || "Unknown";
    
    if (action === "sync_all") {
      syncAllTrades(sheet, data.trades, userEmail, userId);
      updateUserSummarySheet();
      return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "Synced " + data.trades.length + " trades successfully!" }))
        .setMimeType(ContentService.MimeType.JSON);
    } else if (action === "save_trade") {
      saveSingleTrade(sheet, data.trade, userEmail, userId);
      updateUserSummarySheet();
      return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "Trade saved successfully!" }))
        .setMimeType(ContentService.MimeType.JSON);
    } else if (action === "delete_trade") {
      deleteSingleTrade(sheet, data.tradeId);
      updateUserSummarySheet();
      return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "Trade deleted successfully!" }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Invalid action" }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService.createTextOutput("Spreadsheet Sync API is Active. Configure your Web App URL in Decodex.");
}

function createJournalSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Trading Journal") || ss.insertSheet("Trading Journal");
  var headers = [
    "User Email", "User ID", "Trade ID", "Trade Date", "Trade Time", "Instrument", "Direction", 
    "Entry Price", "Exit Price", "Quantity", "P&L", "Status", 
    "Risk-to-Reward (RRR)", "Rating", "Setup", "Emotions", "Mistakes", "Notes"
  ];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#1e293b").setFontColor("#ffffff");
  sheet.setFrozenRows(1);
  return sheet;
}

function syncAllTrades(sheet, trades, userEmail, userId) {
  var lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    var dataRange = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn());
    var values = dataRange.getValues();
    var rowsToKeep = [];
    for (var i = 0; i < values.length; i++) {
      if (values[i][1] !== userId) {
        rowsToKeep.push(values[i]);
      }
    }
    dataRange.clear();
    if (rowsToKeep.length > 0) {
      sheet.getRange(2, 1, rowsToKeep.length, rowsToKeep[0].length).setValues(rowsToKeep);
    }
  }
  
  if (!trades || trades.length === 0) {
    updateUserSummarySheet();
    return;
  }
  
  var rows = [];
  for (var i = 0; i < trades.length; i++) {
    var t = trades[i];
    rows.push([
      userEmail,
      userId,
      t.id,
      t.tradeDate,
      t.tradeTime,
      t.instrument,
      t.direction,
      t.entryPrice || 0,
      t.exitPrice || 0,
      t.quantity || 0,
      t.pnl || 0,
      t.status,
      t.rrr || 0,
      t.rating || 0,
      t.setup || "",
      (t.emotions || []).join(", "),
      (t.mistakes || []).join(", "),
      t.notes || ""
    ]);
  }
  var newLastRow = sheet.getLastRow();
  sheet.getRange(newLastRow + 1, 1, rows.length, rows[0].length).setValues(rows);
  
  var finalLastRow = sheet.getLastRow();
  if (finalLastRow > 1) {
    sheet.getRange(2, 4, finalLastRow - 1, 1).setNumberFormat("yyyy-mm-dd");
    sheet.getRange(2, 8, finalLastRow - 1, 4).setNumberFormat("#,##0.00");
  }
}

function saveSingleTrade(sheet, t, userEmail, userId) {
  var lastRow = sheet.getLastRow();
  var idCol = 3;
  var rowToUpdate = -1;
  
  if (lastRow > 1) {
    var ids = sheet.getRange(2, idCol, lastRow - 1, 1).getValues();
    for (var i = 0; i < ids.length; i++) {
      if (ids[i][0] === t.id) {
        rowToUpdate = i + 2;
        break;
      }
    }
  }
  
  var rowValues = [
    userEmail,
    userId,
    t.id,
    t.tradeDate,
    t.tradeTime,
    t.instrument,
    t.direction,
    t.entryPrice || 0,
    t.exitPrice || 0,
    t.quantity || 0,
    t.pnl || 0,
    t.status,
    t.rrr || 0,
    t.rating || 0,
    t.setup || "",
    (t.emotions || []).join(", "),
    (t.mistakes || []).join(", "),
    t.notes || ""
  ];
  
  if (rowToUpdate > -1) {
    sheet.getRange(rowToUpdate, 1, 1, rowValues.length).setValues([rowValues]);
  } else {
    sheet.appendRow(rowValues);
    var newLastRow = sheet.getLastRow();
    sheet.getRange(newLastRow, 4).setNumberFormat("yyyy-mm-dd");
    sheet.getRange(newLastRow, 8, 1, 4).setNumberFormat("#,##0.00");
  }
}

function deleteSingleTrade(sheet, tradeId) {
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return;
  var ids = sheet.getRange(2, 3, lastRow - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) {
    if (ids[i][0] === tradeId) {
      sheet.deleteRow(i + 2);
      break;
    }
  }
}

function updateUserSummarySheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var journalSheet = ss.getSheetByName("Trading Journal");
  if (!journalSheet) return;
  
  var summarySheet = ss.getSheetByName("User Summary") || ss.insertSheet("User Summary");
  summarySheet.clear();
  
  var headers = ["User Email", "Total Trades", "Winning Trades", "Losing Trades", "Win Rate %", "Total P&L (₹)", "Performance Status"];
  summarySheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  summarySheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#0f766e").setFontColor("#ffffff");
  
  var lastRow = journalSheet.getLastRow();
  if (lastRow <= 1) return;
  
  var data = journalSheet.getRange(2, 1, lastRow - 1, 12).getValues();
  var userStats = {};
  
  for (var i = 0; i < data.length; i++) {
    var email = data[i][0];
    var pnl = Number(data[i][10]) || 0;
    var status = data[i][11];
    
    if (!email) continue;
    if (!userStats[email]) {
      userStats[email] = { trades: 0, wins: 0, losses: 0, pnl: 0 };
    }
    
    userStats[email].trades += 1;
    userStats[email].pnl += pnl;
    if (status === "WIN" || pnl > 0) {
      userStats[email].wins += 1;
    } else if (status === "LOSS" || pnl < 0) {
      userStats[email].losses += 1;
    }
  }
  
  var rows = [];
  for (var email in userStats) {
    var stats = userStats[email];
    var winRate = stats.trades > 0 ? (stats.wins / stats.trades) * 100 : 0;
    var perfStatus = stats.pnl >= 0 ? "PROFITABLE (WINNER)" : "UNPROFITABLE (LOSER)";
    rows.push([
      email,
      stats.trades,
      stats.wins,
      stats.losses,
      winRate / 100,
      stats.pnl,
      perfStatus
    ]);
  }
  
  if (rows.length > 0) {
    summarySheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
    summarySheet.getRange(2, 5, rows.length, 1).setNumberFormat("0.0%");
    summarySheet.getRange(2, 6, rows.length, 1).setNumberFormat("₹#,##0.00");
    
    var range = summarySheet.getRange(2, 7, rows.length, 1);
    var ruleProfit = SpreadsheetApp.newConditionalFormattingRule()
      .whenTextContains("PROFITABLE")
      .setBackground("#d1fae5")
      .setFontColor("#065f46")
      .setRanges([range])
      .build();
    var ruleLoss = SpreadsheetApp.newConditionalFormattingRule()
      .whenTextContains("UNPROFITABLE")
      .setBackground("#fee2e2")
      .setFontColor("#991b1b")
      .setRanges([range])
      .build();
    
    summarySheet.setConditionalFormattingRules([ruleProfit, ruleLoss]);
    
    var charts = summarySheet.getCharts();
    for (var j = 0; j < charts.length; j++) {
      summarySheet.removeChart(charts[j]);
    }
    
    var pnlChart = summarySheet.newChart()
      .setChartType(Charts.ChartType.BAR)
      .addRange(summarySheet.getRange(1, 1, rows.length + 1, 1))
      .addRange(summarySheet.getRange(1, 6, rows.length + 1, 1))
      .setPosition(rows.length + 4, 1, 0, 0)
      .setOption("title", "User Profit & Loss Comparison (₹)")
      .setOption("colors", ["#0f766e"])
      .setOption("width", 600)
      .setOption("height", 350)
      .build();
      
    summarySheet.insertChart(pnlChart);
  }
}`;

export const JournalDashboard: React.FC<JournalDashboardProps> = ({ 
  trades,
  accountBalance,
  initialBalance,
  onUpdateBalance,
  onUpdateInitialBalance,
  onResetJournal,
  spreadsheetUrl = '',
  autoSync = false,
  onUpdateSpreadsheetConfig,
  onSyncAllToSpreadsheet,
  isAdmin = false
}) => {
  const [isEditingBalance, setIsEditingBalance] = useState(false);
  const [tempBalance, setTempBalance] = useState('');
  const [isConfirmingReset, setIsConfirmingReset] = useState(false);
  const [resetBalanceInput, setResetBalanceInput] = useState('500000');
  const [savingBalance, setSavingBalance] = useState(false);
  const [resettingJournal, setResettingJournal] = useState(false);

  // Starting Capital editing states
  const [isEditingInitial, setIsEditingInitial] = useState(false);
  const [tempInitial, setTempInitial] = useState('');
  const [savingInitial, setSavingInitial] = useState(false);

  // Spreadsheet settings states
  const [spreadsheetInput, setSpreadsheetInput] = useState(spreadsheetUrl);
  const [autoSyncInput, setAutoSyncInput] = useState(autoSync);
  const [isSavingSpreadsheet, setIsSavingSpreadsheet] = useState(false);
  const [spreadsheetSaveMessage, setSpreadsheetSaveMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [copyStatus, setCopyStatus] = useState(false);

  // Period P&L tab state
  const [pnlPeriod, setPnlPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [selectedPeriod, setSelectedPeriod] = useState<{ label: string; periodType: 'daily' | 'weekly' | 'monthly' } | null>(null);

  React.useEffect(() => {
    setSelectedPeriod(null);
  }, [pnlPeriod]);

  React.useEffect(() => {
    setSpreadsheetInput(spreadsheetUrl);
    setAutoSyncInput(autoSync);
  }, [spreadsheetUrl, autoSync]);

  // Sort trades chronologically for calculations and charts
  const sortedTrades = [...trades].sort((a, b) => {
    return new Date(a.tradeDate).getTime() - new Date(b.tradeDate).getTime();
  });

  // Calculate Metrics
  const totalTrades = trades.length;
  const winningTrades = trades.filter(t => t.pnl > 0);
  const losingTrades = trades.filter(t => t.pnl < 0);
  const breakevenTrades = trades.filter(t => t.pnl === 0);

  const winRate = totalTrades > 0 ? (winningTrades.length / totalTrades) * 100 : 0;

  const totalPnl = trades.reduce((sum, t) => sum + t.pnl, 0);
  const calculatedAccountBalance = initialBalance + totalPnl;

  const grossProfit = winningTrades.reduce((sum, t) => sum + t.pnl, 0);
  const grossLoss = Math.abs(losingTrades.reduce((sum, t) => sum + t.pnl, 0));
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 99.9 : 0;

  const avgWin = winningTrades.length > 0 ? grossProfit / winningTrades.length : 0;
  const avgLoss = losingTrades.length > 0 ? grossLoss / losingTrades.length : 0;
  const riskRewardRatio = avgLoss > 0 ? avgWin / avgLoss : 0;

  // Calculate Current Streak
  let currentStreak = 0;
  let streakType: 'win' | 'loss' | 'none' = 'none';

  if (sortedTrades.length > 0) {
    const lastTrade = sortedTrades[sortedTrades.length - 1];
    streakType = lastTrade.pnl > 0 ? 'win' : lastTrade.pnl < 0 ? 'loss' : 'none';
    
    if (streakType !== 'none') {
      for (let i = sortedTrades.length - 1; i >= 0; i--) {
        const t = sortedTrades[i];
        if (streakType === 'win' && t.pnl > 0) {
          currentStreak++;
        } else if (streakType === 'loss' && t.pnl < 0) {
          currentStreak++;
        } else if (t.pnl !== 0) {
          break;
        }
      }
    }
  }

  // Calculate setup performance
  const setupPerformance: { [key: string]: { trades: number, pnl: number, wins: number } } = {};
  trades.forEach(t => {
    const setup = t.setup || 'Unknown';
    if (!setupPerformance[setup]) {
      setupPerformance[setup] = { trades: 0, pnl: 0, wins: 0 };
    }
    setupPerformance[setup].trades++;
    setupPerformance[setup].pnl += t.pnl;
    if (t.pnl > 0) setupPerformance[setup].wins++;
  });

  const sortedSetups = Object.entries(setupPerformance)
    .map(([name, stats]) => ({
      name,
      ...stats,
      winRate: stats.trades > 0 ? (stats.wins / stats.trades) * 100 : 0
    }))
    .sort((a, b) => b.pnl - a.pnl);

  // Calculate mistake impact
  const mistakeImpact: { [key: string]: { count: number, totalLoss: number } } = {};
  trades.forEach(t => {
    if (t.mistakes && Array.isArray(t.mistakes)) {
      t.mistakes.forEach(mistake => {
        if (!mistakeImpact[mistake]) {
          mistakeImpact[mistake] = { count: 0, totalLoss: 0 };
        }
        mistakeImpact[mistake].count++;
        if (t.pnl < 0) {
          mistakeImpact[mistake].totalLoss += Math.abs(t.pnl);
        }
      });
    }
  });

  const sortedMistakes = Object.entries(mistakeImpact)
    .map(([name, stats]) => ({
      name,
      ...stats
    }))
    .sort((a, b) => b.totalLoss - a.totalLoss);

  // Calculate Instrument Performance
  const instrumentPerformance: { [key: string]: { trades: number, pnl: number, wins: number } } = {};
  trades.forEach(t => {
    const inst = t.instrument || 'Unknown';
    if (!instrumentPerformance[inst]) {
      instrumentPerformance[inst] = { trades: 0, pnl: 0, wins: 0 };
    }
    instrumentPerformance[inst].trades++;
    instrumentPerformance[inst].pnl += t.pnl;
    if (t.pnl > 0) instrumentPerformance[inst].wins++;
  });

  const sortedInstruments = Object.entries(instrumentPerformance)
    .map(([name, stats]) => ({
      name,
      ...stats,
      winRate: stats.trades > 0 ? (stats.wins / stats.trades) * 100 : 0
    }))
    .sort((a, b) => b.pnl - a.pnl);

  // Build Cumulative P&L Curve points for custom SVG line chart
  let cumulativePnl = 0;
  const pnlCurvePoints = sortedTrades.map((t, idx) => {
    cumulativePnl += t.pnl;
    return {
      index: idx,
      date: t.tradeDate,
      pnl: t.pnl,
      cumulative: cumulativePnl
    };
  });

  // SVG Chart Dimensions & Calculations
  const chartWidth = 800;
  const chartHeight = 250;
  const paddingX = 40;
  const paddingY = 25;

  let svgPath = '';
  let svgAreaPath = '';
  let gridLines: number[] = [];

  if (pnlCurvePoints.length > 1) {
    const cumulatives = pnlCurvePoints.map(p => p.cumulative);
    const minP = Math.min(0, ...cumulatives);
    const maxP = Math.max(0, ...cumulatives);
    const range = maxP - minP || 100;

    const getX = (idx: number) => {
      return paddingX + (idx / (pnlCurvePoints.length - 1)) * (chartWidth - 2 * paddingX);
    };

    const getY = (val: number) => {
      // Scale properly inside container
      const ratio = (val - minP) / range;
      return chartHeight - paddingY - ratio * (chartHeight - 2 * paddingY);
    };

    // Construct path
    svgPath = `M ${getX(0)} ${getY(pnlCurvePoints[0].cumulative)}`;
    for (let i = 1; i < pnlCurvePoints.length; i++) {
      svgPath += ` L ${getX(i)} ${getY(pnlCurvePoints[i].cumulative)}`;
    }

    // Area path
    const zeroY = getY(0);
    svgAreaPath = `${svgPath} L ${getX(pnlCurvePoints.length - 1)} ${zeroY} L ${getX(0)} ${zeroY} Z`;

    // Grid lines for reference
    const steps = 4;
    for (let i = 0; i <= steps; i++) {
      gridLines.push(minP + (i / steps) * range);
    }
  }

  const formatCurrency = (val: number) => {
    const sign = val < 0 ? '-' : '+';
    return `${sign}₹${Math.abs(val).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
  };

  const formatChartDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const monthIdx = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        if (monthIdx >= 0 && monthIdx < 12) {
          return `${day} ${months[monthIdx]}`;
        }
      }
    } catch (e) {}
    return dateStr;
  };

  // Thunder Score Calculations
  const scoreWinRate = Math.round(winRate);
  const scorePF = Math.round(Math.min(100, profitFactor * 50));
  const scoreAvgWL = avgLoss > 0 ? Math.round(Math.min(100, (avgWin / avgLoss) * 40)) : (avgWin > 0 ? 100 : 0);
  
  // Consistency: percentage of profitable days
  const uniqueDays = Array.from(new Set(trades.map(t => t.tradeDate)));
  const greenDays = uniqueDays.filter(day => {
    const dayTrades = trades.filter(t => t.tradeDate === day);
    const dayPnl = dayTrades.reduce((sum, t) => sum + t.pnl, 0);
    return dayPnl > 0;
  });
  const scoreConsist = uniqueDays.length > 0 ? Math.round((greenDays.length / uniqueDays.length) * 100) : 0;

  // Recovery: base on max consecutive loss streak
  let maxLossStreak = 0;
  let tempLossStreak = 0;
  sortedTrades.forEach(t => {
    if (t.pnl < 0) {
      tempLossStreak++;
      if (tempLossStreak > maxLossStreak) maxLossStreak = tempLossStreak;
    } else if (t.pnl > 0) {
      tempLossStreak = 0;
    }
  });
  const scoreRecovery = Math.max(20, Math.min(100, 100 - (maxLossStreak * 12)));

  const thunderScore = totalTrades > 0 
    ? Math.round((scoreWinRate + scorePF + scoreAvgWL + scoreConsist + scoreRecovery) / 5)
    : 0;

  // Period P&L Grouping
  const periodData = React.useMemo(() => {
    const groups: { [key: string]: number } = {};
    
    sortedTrades.forEach(t => {
      if (!t.tradeDate) return;
      let key = t.tradeDate;
      
      if (pnlPeriod === 'weekly') {
        const date = new Date(t.tradeDate);
        const day = date.getDay();
        const diff = date.getDate() - day + (day === 0 ? -6 : 1);
        const startOfWeek = new Date(date.setDate(diff));
        key = `W/C ${startOfWeek.toISOString().split('T')[0]}`;
      } else if (pnlPeriod === 'monthly') {
        const date = new Date(t.tradeDate);
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        key = `${months[date.getMonth()]} ${date.getFullYear()}`;
      }
      groups[key] = (groups[key] || 0) + Number(t.pnl || 0);
    });

    const entries = Object.entries(groups).map(([label, pnl]) => ({
      label,
      pnl: Number(pnl) || 0
    }));
    
    if (pnlPeriod === 'daily') {
      entries.sort((a, b) => new Date(a.label).getTime() - new Date(b.label).getTime());
    } else if (pnlPeriod === 'weekly') {
      entries.sort((a, b) => {
        const dateA = a.label.replace('W/C ', '');
        const dateB = b.label.replace('W/C ', '');
        return new Date(dateA).getTime() - new Date(dateB).getTime();
      });
    } else {
      entries.sort((a, b) => {
        const dateA = new Date(a.label);
        const dateB = new Date(b.label);
        return dateA.getTime() - dateB.getTime();
      });
    }
    
    return entries.slice(-10); // Show up to last 10 periods
  }, [sortedTrades, pnlPeriod]);

  const selectedPeriodTrades = React.useMemo(() => {
    if (!selectedPeriod) return [];
    return sortedTrades.filter(t => {
      if (!t.tradeDate) return false;
      if (selectedPeriod.periodType === 'daily') {
        return t.tradeDate === selectedPeriod.label;
      } else if (selectedPeriod.periodType === 'weekly') {
        const date = new Date(t.tradeDate);
        const day = date.getDay();
        const diff = date.getDate() - day + (day === 0 ? -6 : 1);
        const startOfWeek = new Date(date.setDate(diff));
        const weekKey = `W/C ${startOfWeek.toISOString().split('T')[0]}`;
        return weekKey === selectedPeriod.label;
      } else {
        const date = new Date(t.tradeDate);
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const monthKey = `${months[date.getMonth()]} ${date.getFullYear()}`;
        return monthKey === selectedPeriod.label;
      }
    });
  }, [selectedPeriod, sortedTrades]);

  const totalCapitalGainLoss = calculatedAccountBalance - initialBalance;
  const totalCapitalGainLossPercent = initialBalance > 0 ? (totalCapitalGainLoss / initialBalance) * 100 : 0;

  return (
    <div id="journal-dashboard" className="space-y-8 p-4 md:p-6 max-w-7xl mx-auto w-full">
      {/* Metrics Banner */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Net P&L */}
        <div className="terminal-card p-4 flex flex-col justify-between border border-terminal-border relative overflow-hidden bg-black/20">
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-[10px] font-mono uppercase tracking-widest">NET PROFIT/LOSS</span>
            <DollarSign className="w-4 h-4 text-terminal-accent" />
          </div>
          <div>
            <div className={`text-2xl font-black ${totalPnl >= 0 ? 'text-terminal-green' : 'text-terminal-red'}`}>
              {formatCurrency(totalPnl)}
            </div>
            <div className="text-[9px] font-mono text-gray-400 mt-1 uppercase">
              Cumulative returns of {totalTrades} trades
            </div>
          </div>
        </div>

        {/* Win Rate */}
        <div className="terminal-card p-4 flex flex-col justify-between border border-terminal-border relative overflow-hidden bg-black/20">
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-[10px] font-mono uppercase tracking-widest">WIN RATE</span>
            <Percent className="w-4 h-4 text-terminal-accent" />
          </div>
          <div>
            <div className="text-2xl font-black text-white">
              {winRate.toFixed(1)}%
            </div>
            <div className="flex items-center gap-2 text-[9px] font-mono text-gray-400 mt-1 uppercase">
              <span className="text-terminal-green">{winningTrades.length} W</span>
              <span>•</span>
              <span className="text-terminal-red">{losingTrades.length} L</span>
              {breakevenTrades.length > 0 && (
                <>
                  <span>•</span>
                  <span>{breakevenTrades.length} BE</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Profit Factor */}
        <div className="terminal-card p-4 flex flex-col justify-between border border-terminal-border relative overflow-hidden bg-black/20">
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-[10px] font-mono uppercase tracking-widest">PROFIT FACTOR</span>
            <Award className="w-4 h-4 text-terminal-accent" />
          </div>
          <div>
            <div className={`text-2xl font-black ${profitFactor >= 1.5 ? 'text-terminal-green' : profitFactor >= 1.0 ? 'text-white' : 'text-terminal-red'}`}>
              {profitFactor.toFixed(2)}
            </div>
            <div className="text-[9px] font-mono text-gray-400 mt-1 uppercase">
              Ratio of Gross Win/Loss
            </div>
          </div>
        </div>

        {/* Current Streak */}
        <div className="terminal-card p-4 flex flex-col justify-between border border-terminal-border relative overflow-hidden bg-black/20">
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-[10px] font-mono uppercase tracking-widest">ACTIVE STREAK</span>
            <Flame className="w-4 h-4 text-terminal-accent" />
          </div>
          <div>
            <div className="text-2xl font-black text-white flex items-center gap-2">
              {currentStreak} Trades
              {streakType === 'win' && <span className="text-xs text-terminal-green uppercase font-mono tracking-wider">(Winning)</span>}
              {streakType === 'loss' && <span className="text-xs text-terminal-red uppercase font-mono tracking-wider">(Losing)</span>}
            </div>
            <div className="text-[9px] font-mono text-gray-400 mt-1 uppercase">
              Consecutive trades streak
            </div>
          </div>
        </div>
      </div>

      {/* Account Control & Google Sheets Integration */}
      <div className={`grid grid-cols-1 ${isAdmin ? 'lg:grid-cols-2' : ''} gap-6`}>
        {/* Account Control Center */}
        <div className="terminal-card p-6 border border-terminal-border bg-terminal-accent/5 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="space-y-1">
              <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center">
                <Coins className="w-4 h-4 text-terminal-accent mr-2" />
                Journal Account Control Center
              </h3>
              <p className="text-[10px] font-mono text-gray-400 uppercase">
                Configure starting capital, view dynamic live balance, or reset journal database to restart fresh.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              {/* Live Balance Card */}
              <div className="bg-black/40 border border-terminal-border/60 rounded px-4 py-2.5 min-w-[180px] flex items-center justify-between relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-1">
                  <Lock className="w-3 h-3 text-gray-600 group-hover:text-terminal-accent transition-colors" />
                </div>
                <div className="space-y-0.5 w-full">
                  <span className="text-[8px] font-mono text-gray-500 uppercase block tracking-wider">Account Balance</span>
                  <div className="flex items-center justify-between w-full mt-1">
                    <span className="text-base font-black text-white font-mono">
                      ₹{calculatedAccountBalance.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </span>
                    <span className="text-[8px] font-mono text-terminal-accent uppercase border border-terminal-accent/30 px-1 py-0.5 rounded bg-terminal-accent/5">
                      Auto
                    </span>
                  </div>
                </div>
              </div>

              {/* Initial Balance */}
              <div className="bg-black/40 border border-terminal-border/60 rounded px-4 py-2.5 min-w-[180px] flex items-center justify-between">
                <div className="space-y-0.5 w-full">
                  <span className="text-[8px] font-mono text-gray-500 uppercase block tracking-wider">Starting Capital</span>
                  {isEditingInitial ? (
                    <div className="flex items-center space-x-2 mt-1">
                      <span className="text-xs font-mono text-gray-400">₹</span>
                      <input
                        type="number"
                        value={tempInitial}
                        onChange={(e) => setTempInitial(e.target.value)}
                        className="bg-black/80 border border-terminal-accent/60 rounded px-1.5 py-0.5 text-xs font-mono text-white focus:outline-none w-24"
                        placeholder={initialBalance.toString()}
                        autoFocus
                      />
                      <button
                        onClick={async () => {
                          const val = parseFloat(tempInitial);
                          if (!isNaN(val) && val >= 0) {
                            setSavingInitial(true);
                            if (onUpdateInitialBalance) {
                              await onUpdateInitialBalance(val);
                            }
                            setSavingInitial(false);
                            setIsEditingInitial(false);
                          }
                        }}
                        disabled={savingInitial}
                        className="p-1 bg-terminal-green/20 text-terminal-green rounded hover:bg-terminal-green/30 transition-colors cursor-pointer"
                        title="Save"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setIsEditingInitial(false)}
                        className="p-1 bg-white/5 text-gray-400 rounded hover:bg-white/10 transition-colors cursor-pointer"
                        title="Cancel"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between w-full">
                      <span className="text-base font-bold text-gray-300 font-mono">
                        ₹{initialBalance.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </span>
                      <button
                        onClick={() => {
                          setTempInitial(initialBalance.toString());
                          setIsEditingInitial(true);
                        }}
                        className="p-1 hover:bg-white/5 rounded text-gray-500 hover:text-terminal-accent transition-colors cursor-pointer"
                        title="Edit Starting Capital"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Total Gain/Loss Card */}
              <div className="bg-black/20 border border-terminal-border/30 rounded px-4 py-2.5 min-w-[180px] flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-[8px] font-mono text-gray-500 uppercase block tracking-wider">Total Capital Gain/Loss</span>
                  <div className="flex items-baseline space-x-1.5 mt-1">
                    <span className={`text-base font-black font-mono ${
                      totalCapitalGainLoss >= 0 ? 'text-terminal-green' : 'text-terminal-red'
                    }`}>
                      {totalCapitalGainLoss >= 0 ? '+' : ''}₹{totalCapitalGainLoss.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </span>
                    <span className={`text-[10px] font-bold font-mono ${
                      totalCapitalGainLoss >= 0 ? 'text-terminal-green' : 'text-terminal-red'
                    }`}>
                      ({totalCapitalGainLoss >= 0 ? '+' : ''}{totalCapitalGainLossPercent.toFixed(2)}%)
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="relative mt-4 pt-4 border-t border-terminal-border/20">
            {isConfirmingReset ? (
              <div className="flex flex-col sm:flex-row items-center gap-2 bg-black border border-terminal-red/50 rounded p-3 absolute left-0 bottom-full mb-2 z-50 min-w-[280px] shadow-2xl font-mono text-[9px]">
                <div className="space-y-1 text-left w-full sm:w-auto">
                  <span className="text-[9px] font-bold text-terminal-red uppercase block">Confirm Complete Reset?</span>
                  <p className="text-[8px] text-gray-400 leading-tight uppercase">
                    This will delete ALL journal trades and rules.
                  </p>
                  <div className="flex items-center space-x-2 mt-1.5">
                    <span className="text-[9px] text-gray-500 uppercase">Starting ₹</span>
                    <input
                      type="number"
                      value={resetBalanceInput}
                      onChange={(e) => setResetBalanceInput(e.target.value)}
                      className="bg-black/90 border border-terminal-border rounded px-1.5 py-0.5 text-[10px] text-white focus:border-terminal-accent outline-none w-20"
                    />
                  </div>
                </div>
                <div className="flex gap-1.5 mt-2 sm:mt-0 w-full sm:w-auto justify-end">
                  <button
                    onClick={async () => {
                      const val = parseFloat(resetBalanceInput);
                      if (!isNaN(val) && val >= 0) {
                        setResettingJournal(true);
                        await onResetJournal(val);
                        setResettingJournal(false);
                        setIsConfirmingReset(false);
                      }
                    }}
                    disabled={resettingJournal}
                    className="px-2 py-1 bg-terminal-red text-white text-[9px] font-bold rounded uppercase hover:bg-terminal-red/80 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {resettingJournal ? 'RESETTING...' : 'YES, RESET'}
                  </button>
                  <button
                    onClick={() => setIsConfirmingReset(false)}
                    className="px-2 py-1 bg-white/5 text-gray-400 text-[9px] rounded uppercase hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    CANCEL
                  </button>
                </div>
              </div>
            ) : null}

            <button
              onClick={() => {
                setResetBalanceInput(calculatedAccountBalance.toString());
                setIsConfirmingReset(true);
              }}
              className="flex items-center space-x-1.5 bg-terminal-red/10 hover:bg-terminal-red/20 border border-terminal-red/30 text-terminal-red px-3 py-2 rounded text-[10px] font-mono font-bold transition-all uppercase cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Trading Journal</span>
            </button>
          </div>
        </div>

        {/* Google Sheets Integration Center */}
        {isAdmin && (
          <div className="terminal-card p-6 border border-terminal-border bg-black/15 flex flex-col justify-between font-mono text-[10px]">
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center font-sans">
                    <Share2 className="w-4 h-4 text-terminal-accent mr-2" />
                    Google Sheets Integration
                  </h3>
                  <p className="text-[10px] text-gray-400 uppercase">
                    Real-time synchronization on a per-user basis with user-wise performance leaderboard.
                  </p>
                </div>
                <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase ${
                  spreadsheetUrl ? 'bg-terminal-green/10 text-terminal-green' : 'bg-terminal-red/10 text-terminal-red'
                }`}>
                  {spreadsheetUrl ? 'Connected' : 'Disconnected'}
                </span>
              </div>

              <div className="space-y-3">
                {/* URL Input */}
                <div className="space-y-1">
                  <label className="text-[8px] text-gray-500 uppercase tracking-wider block">Web App URL</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={spreadsheetInput}
                      onChange={(e) => setSpreadsheetInput(e.target.value)}
                      placeholder="https://script.google.com/macros/s/.../exec"
                      className="bg-black/40 border border-terminal-border focus:border-terminal-accent rounded px-3 py-1.5 text-[10px] text-white focus:outline-none flex-1"
                    />
                    <button
                      onClick={async () => {
                        setIsSavingSpreadsheet(true);
                        if (onUpdateSpreadsheetConfig) {
                          await onUpdateSpreadsheetConfig(spreadsheetInput, autoSyncInput);
                          setSpreadsheetSaveMessage({ text: 'Configuration saved!', type: 'success' });
                          setTimeout(() => setSpreadsheetSaveMessage(null), 3000);
                        }
                        setIsSavingSpreadsheet(false);
                      }}
                      disabled={isSavingSpreadsheet}
                      className="bg-terminal-accent hover:bg-terminal-accent/80 text-white px-3 py-1.5 rounded font-bold text-[10px] uppercase transition-all cursor-pointer"
                    >
                      {isSavingSpreadsheet ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </div>

                {/* Checkbox settings */}
                <div className="flex items-center gap-6">
                  <label className="flex items-center space-x-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={autoSyncInput}
                      onChange={(e) => {
                        const enabled = e.target.checked;
                        setAutoSyncInput(enabled);
                        if (onUpdateSpreadsheetConfig) {
                          onUpdateSpreadsheetConfig(spreadsheetInput, enabled);
                        }
                      }}
                      className="rounded border-terminal-border bg-black text-terminal-accent focus:ring-0 focus:ring-offset-0 w-3.5 h-3.5 cursor-pointer"
                    />
                    <span className="text-[10px] text-gray-300 uppercase">Enable Auto Sync</span>
                  </label>

                  {onSyncAllToSpreadsheet && (
                    <button
                      onClick={async () => {
                        setIsSyncingAll(true);
                        const ok = await onSyncAllToSpreadsheet();
                        if (ok) {
                          setSpreadsheetSaveMessage({ text: 'Synced all trades!', type: 'success' });
                        } else {
                          setSpreadsheetSaveMessage({ text: 'Sync failed. Check URL.', type: 'error' });
                        }
                        setTimeout(() => setSpreadsheetSaveMessage(null), 4000);
                        setIsSyncingAll(false);
                      }}
                      disabled={isSyncingAll || !spreadsheetUrl}
                      className="flex items-center space-x-1.5 border border-terminal-accent/40 bg-terminal-accent/5 hover:bg-terminal-accent/10 text-terminal-accent px-3 py-1.5 rounded text-[10px] font-bold transition-all uppercase disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <Database className="w-3.5 h-3.5" />
                      <span>{isSyncingAll ? 'SYNCING...' : 'FORCE SYNC ALL'}</span>
                    </button>
                  )}
                </div>

                {spreadsheetSaveMessage && (
                  <p className={`text-[9px] uppercase font-bold ${
                    spreadsheetSaveMessage.type === 'success' ? 'text-terminal-green' : 'text-terminal-red'
                  }`}>
                    {spreadsheetSaveMessage.text}
                  </p>
                )}
              </div>
            </div>

            {/* Copy Apps Script block */}
            <div className="mt-4 pt-4 border-t border-terminal-border/20 flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-[9px] font-black text-white uppercase block font-sans">Need Apps Script Code?</span>
                <p className="text-[8px] text-gray-500 uppercase leading-relaxed">
                  Copy multi-user enabled, auto-leaderboard and chart generator script.
                </p>
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(APPS_SCRIPT_CODE);
                  setCopyStatus(true);
                  setTimeout(() => setCopyStatus(false), 2000);
                }}
                className="flex items-center space-x-1 bg-white/5 hover:bg-white/10 text-white border border-white/10 px-2.5 py-1.5 rounded text-[9px] transition-all uppercase cursor-pointer"
              >
                {copyStatus ? <Check className="w-3.5 h-3.5 text-terminal-green" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copyStatus ? 'COPIED!' : 'COPY CODE'}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Cumulative P&L Curve SVG Chart */}
      <div className="terminal-card p-6 border border-terminal-border bg-black/15">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center">
              <Activity className="w-4 h-4 text-terminal-accent mr-2" />
              Cumulative Performance Curve
            </h3>
            <p className="text-[10px] font-mono text-gray-500 uppercase mt-0.5">Equity growth tracking over historical trades</p>
          </div>
          {totalTrades > 0 && (
            <div className="flex gap-4 text-xs font-mono">
              <div className="flex flex-col">
                <span className="text-[9px] text-gray-500">AVG WIN</span>
                <span className="text-terminal-green font-bold">₹{avgWin.toFixed(0)}</span>
              </div>
              <div className="flex flex-col border-l border-white/10 pl-4">
                <span className="text-[9px] text-gray-500">AVG LOSS</span>
                <span className="text-terminal-red font-bold">₹{avgLoss.toFixed(0)}</span>
              </div>
              <div className="flex flex-col border-l border-white/10 pl-4">
                <span className="text-[9px] text-gray-500">EST. R:R</span>
                <span className="text-terminal-accent font-bold">1:{riskRewardRatio.toFixed(1)}</span>
              </div>
            </div>
          )}
        </div>

        {totalTrades < 2 ? (
          <div className="h-[250px] flex flex-col items-center justify-center border border-dashed border-terminal-border bg-black/40 rounded p-6">
            <span className="text-[11px] font-mono text-gray-500 uppercase tracking-widest text-center">
              Log at least 2 trades to display cumulative performance curves.
            </span>
          </div>
        ) : (
          <div className="w-full overflow-x-auto scrollbar-none">
            <div className="min-w-[800px] h-[250px] relative">
              <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-full overflow-visible">
                <defs>
                  <linearGradient id="pnlGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f27d26" stopOpacity="0.2"/>
                    <stop offset="100%" stopColor="#f27d26" stopOpacity="0"/>
                  </linearGradient>
                </defs>

                {/* Horizontal Grid lines and markers */}
                {gridLines.map((gl, i) => {
                  const minP = Math.min(0, ...pnlCurvePoints.map(p => p.cumulative));
                  const maxP = Math.max(0, ...pnlCurvePoints.map(p => p.cumulative));
                  const range = maxP - minP || 100;
                  const ratio = (gl - minP) / range;
                  const y = chartHeight - paddingY - ratio * (chartHeight - 2 * paddingY);

                  return (
                    <g key={i}>
                      <line 
                        x1={paddingX} 
                        y1={y} 
                        x2={chartWidth - paddingX} 
                        y2={y} 
                        stroke={gl === 0 ? "rgba(255, 255, 255, 0.25)" : "rgba(255, 255, 255, 0.05)"} 
                        strokeDasharray={gl === 0 ? "0" : "4 4"}
                      />
                      <text 
                        x={paddingX - 8} 
                        y={y + 3} 
                        fill="#6b7280" 
                        fontSize="9" 
                        fontFamily="monospace" 
                        textAnchor="end"
                      >
                        {gl >= 0 ? '+' : ''}{gl.toFixed(0)}
                      </text>
                    </g>
                  );
                })}

                {/* Vertical trade indices */}
                {pnlCurvePoints.map((pt, i) => {
                  if (i === 0 || i === pnlCurvePoints.length - 1 || (pnlCurvePoints.length > 5 && i % Math.floor(pnlCurvePoints.length / 5) === 0)) {
                    const x = paddingX + (i / (pnlCurvePoints.length - 1)) * (chartWidth - 2 * paddingX);
                    return (
                      <g key={i}>
                        <text 
                          x={x} 
                          y={chartHeight - 5} 
                          fill="#6b7280" 
                          fontSize="9" 
                          fontFamily="monospace" 
                          textAnchor="middle"
                        >
                          {formatChartDate(pt.date)}
                        </text>
                        <line 
                          x1={x} 
                          y1={chartHeight - paddingY} 
                          x2={x} 
                          y2={chartHeight - paddingY - 4} 
                          stroke="rgba(255, 255, 255, 0.15)"
                        />
                      </g>
                    );
                  }
                  return null;
                })}

                {/* Filled Area below curve */}
                <path d={svgAreaPath} fill="url(#pnlGrad)" />

                {/* The main curve line */}
                <path 
                  d={svgPath} 
                  fill="none" 
                  stroke="#f27d26" 
                  strokeWidth="2.5" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                />

                {/* Data Points on hover effect */}
                {pnlCurvePoints.map((pt, i) => {
                  const minP = Math.min(0, ...pnlCurvePoints.map(p => p.cumulative));
                  const maxP = Math.max(0, ...pnlCurvePoints.map(p => p.cumulative));
                  const range = maxP - minP || 100;
                  const ratio = (pt.cumulative - minP) / range;
                  const x = paddingX + (i / (pnlCurvePoints.length - 1)) * (chartWidth - 2 * paddingX);
                  const y = chartHeight - paddingY - ratio * (chartHeight - 2 * paddingY);

                  return (
                    <circle 
                      key={i}
                      cx={x} 
                      cy={y} 
                      r="3.5" 
                      className="fill-terminal-bg stroke-terminal-accent stroke-2 hover:r-5 hover:stroke-white transition-all cursor-pointer"
                    />
                  );
                })}
              </svg>
            </div>
          </div>
        )}
      </div>

      {/* Daily P&L & Thunder Score Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily/Weekly/Monthly P&L bar chart */}
        <div className="terminal-card p-6 border border-terminal-border bg-black/15">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center">
                <Activity className="w-4 h-4 text-terminal-accent mr-2" />
                Periodic P&L Breakdown
              </h3>
              <p className="text-[10px] font-mono text-gray-500 uppercase mt-0.5">Track profitable periods chronologically</p>
            </div>
            
            <div className="flex bg-black/40 border border-terminal-border p-0.5 rounded font-mono text-[9px]">
              {(['daily', 'weekly', 'monthly'] as const).map((period) => (
                <button
                  key={period}
                  onClick={() => setPnlPeriod(period)}
                  className={`px-2.5 py-1 rounded uppercase font-bold transition-all cursor-pointer ${
                    pnlPeriod === period 
                      ? 'bg-terminal-accent text-white' 
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {period}
                </button>
              ))}
            </div>
          </div>

          {periodData.length === 0 ? (
            <div className="h-[200px] flex items-center justify-center border border-dashed border-terminal-border bg-black/40 rounded p-6">
              <span className="text-[11px] font-mono text-gray-500 uppercase tracking-widest text-center">
                Log some trades to visualize periodic P&L breakdown.
              </span>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="h-[200px] flex pt-6 px-2 relative">
                {/* Y-axis Labels on the Left */}
                <div className="w-20 h-[160px] flex flex-col justify-between font-mono text-[8px] text-gray-500 select-none pr-2 border-r border-terminal-border/20 relative z-10 py-1">
                  <span className="text-terminal-green font-bold text-left truncate">+₹{(Math.max(...periodData.map(p => Math.abs(p.pnl))) || 1000).toLocaleString('en-IN')}</span>
                  <span className="text-gray-400 font-bold text-left">₹0</span>
                  <span className="text-terminal-red font-bold text-left truncate">-₹{(Math.max(...periodData.map(p => Math.abs(p.pnl))) || 1000).toLocaleString('en-IN')}</span>
                </div>

                {/* Bars Container */}
                <div className="flex-1 h-full flex items-end justify-between gap-2 relative pl-2">
                  {/* Horizontal zero line */}
                  <div className="absolute left-0 right-0 border-t border-white/10" style={{ bottom: '50%' }} />
                  
                  {periodData.map((d, idx) => {
                    const maxVal = Math.max(...periodData.map(p => Math.abs(p.pnl))) || 1000;
                    const absVal = Math.abs(d.pnl);
                    // Height scale to 100% max within its respective half
                    const heightPercent = Math.min(100, (absVal / maxVal) * 100);
                    const isPositive = d.pnl >= 0;
                    const isSelected = selectedPeriod && selectedPeriod.label === d.label && selectedPeriod.periodType === pnlPeriod;

                    return (
                      <div 
                        key={idx} 
                        onClick={() => setSelectedPeriod({ label: d.label, periodType: pnlPeriod })}
                        className={`flex-1 flex flex-col items-center h-full justify-center relative group cursor-pointer rounded p-1 transition-all ${
                          isSelected 
                            ? 'bg-terminal-accent/10 border border-terminal-accent/30 shadow-[0_0_15px_rgba(242,125,38,0.1)]' 
                            : 'hover:bg-white/5'
                        }`}
                      >
                        {/* Bar container */}
                        <div className="w-full flex flex-col items-center h-[160px] relative">
                          {isPositive ? (
                            // Positive Bar (Top half)
                            <div className="absolute bottom-[50%] h-[50%] left-0 right-0 flex flex-col justify-end items-center">
                              <div 
                                style={{ height: `${heightPercent}%` }}
                                className={`w-4 sm:w-6 rounded-t-sm shadow-[0_0_10px_rgba(16,185,129,0.2)] group-hover:brightness-125 transition-all ${
                                  isSelected 
                                    ? 'bg-terminal-green brightness-125 ring-2 ring-white/60' 
                                    : 'bg-gradient-to-t from-terminal-green/60 to-terminal-green'
                                }`}
                              />
                            </div>
                          ) : (
                            // Negative Bar (Bottom half)
                            <div className="absolute top-[50%] h-[50%] left-0 right-0 flex flex-col justify-start items-center">
                              <div 
                                style={{ height: `${heightPercent}%` }}
                                className={`w-4 sm:w-6 rounded-b-sm shadow-[0_0_10px_rgba(239,68,68,0.2)] group-hover:brightness-125 transition-all ${
                                  isSelected 
                                    ? 'bg-terminal-red brightness-125 ring-2 ring-white/60' 
                                    : 'bg-gradient-to-b from-terminal-red/60 to-terminal-red'
                                }`}
                              />
                            </div>
                          )}
                        </div>

                        {/* Period Label */}
                        <span className="text-[8px] font-mono text-gray-400 truncate w-full text-center mt-2 uppercase">
                          {pnlPeriod === 'daily' ? formatChartDate(d.label) : d.label}
                        </span>

                        {/* Tooltip on hover */}
                        <div className="opacity-0 group-hover:opacity-100 absolute bottom-full mb-1 z-50 bg-black border border-terminal-border px-2 py-1 rounded text-[9px] font-mono whitespace-nowrap pointer-events-none transition-all duration-200">
                          <span className="text-gray-400 uppercase">{pnlPeriod === 'daily' ? formatChartDate(d.label) : d.label}: </span>
                          <span className={isPositive ? 'text-terminal-green font-bold' : 'text-terminal-red font-bold'}>
                            {isPositive ? '+' : '-'}₹{Math.abs(d.pnl).toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Legend indicators */}
              <div className="flex justify-between items-center text-[9px] font-mono text-gray-500 uppercase pt-2 border-t border-terminal-border/20">
                <div className="flex gap-4">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-sm bg-terminal-green" /> Profitable Period
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-sm bg-terminal-red" /> Unprofitable Period
                  </span>
                </div>
                <span className="text-[8px] text-gray-400 animate-pulse">Click any bar to view trade breakdown</span>
              </div>

              {/* Interactive Selected Period Breakdown Table */}
              {selectedPeriod && (
                <div className="mt-4 border border-terminal-border/60 bg-black/40 rounded p-4 space-y-4 animate-in fade-in duration-300">
                  <div className="flex items-center justify-between border-b border-terminal-border/30 pb-2">
                    <div className="space-y-0.5">
                      <h4 className="text-xs font-black text-white uppercase tracking-wider font-mono flex items-center">
                        <Activity className="w-3.5 h-3.5 text-terminal-accent mr-1.5" />
                        Analysis: {selectedPeriod.periodType === 'daily' ? formatChartDate(selectedPeriod.label) : selectedPeriod.label}
                      </h4>
                      <p className="text-[9px] font-mono text-gray-400 uppercase">
                        {selectedPeriodTrades.length} Trades Executed • Net P&L:{' '}
                        <span className={selectedPeriodTrades.reduce((sum, t) => sum + t.pnl, 0) >= 0 ? 'text-terminal-green font-bold' : 'text-terminal-red font-bold'}>
                          ₹{selectedPeriodTrades.reduce((sum, t) => sum + t.pnl, 0).toLocaleString('en-IN')}
                        </span>
                      </p>
                    </div>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedPeriod(null);
                      }}
                      className="text-gray-400 hover:text-white font-mono text-[9px] uppercase border border-terminal-border/30 px-2 py-1 rounded hover:bg-white/5 cursor-pointer transition-all"
                    >
                      Close [X]
                    </button>
                  </div>

                  <div className="overflow-x-auto max-h-[160px] scrollbar-none">
                    <table className="w-full text-left border-collapse font-mono text-[10px]">
                      <thead>
                        <tr className="border-b border-terminal-border/20 text-gray-500 uppercase tracking-wider">
                          <th className="py-2 pr-2">Asset</th>
                          <th className="py-2 px-2">Type</th>
                          <th className="py-2 px-2">Quantity</th>
                          <th className="py-2 px-2">Entry</th>
                          <th className="py-2 px-2">Exit</th>
                          <th className="py-2 pl-2 text-right">P&L</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-gray-300">
                        {selectedPeriodTrades.map((t, idx) => (
                          <tr key={idx} className="hover:bg-white/5 transition-all">
                            <td className="py-2.5 pr-2 font-bold text-white uppercase truncate max-w-[120px]" title={t.instrument}>
                              {t.instrument}
                            </td>
                            <td className="py-2.5 px-2">
                              <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${
                                t.direction === 'BUY' ? 'bg-terminal-green/10 text-terminal-green' : 'bg-terminal-accent/10 text-terminal-accent'
                              }`}>
                                {t.direction}
                              </span>
                            </td>
                            <td className="py-2.5 px-2 text-gray-400">{t.quantity}</td>
                            <td className="py-2.5 px-2 text-gray-400">₹{t.entryPrice?.toLocaleString('en-IN')}</td>
                            <td className="py-2.5 px-2 text-gray-400">₹{t.exitPrice?.toLocaleString('en-IN')}</td>
                            <td className={`py-2.5 pl-2 text-right font-bold ${t.pnl >= 0 ? 'text-terminal-green' : 'text-terminal-red'}`}>
                              {t.pnl >= 0 ? '+' : '-'}₹{Math.abs(t.pnl).toLocaleString('en-IN')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Thunder Score Widget */}
        <div className="terminal-card p-6 border border-terminal-border bg-black/15 flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center">
                  <CloudLightning className="w-4 h-4 text-terminal-accent mr-2" />
                  Thunder Score Matrix
                </h3>
                <p className="text-[10px] font-mono text-gray-500 uppercase mt-0.5">Comprehensive diagnostic of your trading edge</p>
              </div>
              <div className="bg-terminal-accent/10 border border-terminal-accent/30 rounded px-2.5 py-1">
                <span className="text-[10px] font-mono font-bold text-terminal-accent uppercase">
                  {thunderScore >= 80 ? 'LEGENDARY' : thunderScore >= 60 ? 'CONSISTENT' : thunderScore >= 40 ? 'AVERAGE' : 'AMATEUR'}
                </span>
              </div>
            </div>

            <div className="flex flex-col md:flex-row items-center justify-between gap-6 my-4">
              {/* Radar Chart (SVG) */}
              <div className="w-[160px] h-[160px] relative flex items-center justify-center bg-black/10 rounded-full border border-terminal-border/20">
                <svg width="160" height="160" viewBox="0 0 160 160" className="overflow-visible">
                  {/* Outer rings & grid lines */}
                  {[0.25, 0.5, 0.75, 1.0].map((scale, sIdx) => {
                    const radius = 55 * scale;
                    const points = [0, 1, 2, 3, 4].map(idx => {
                      const angle = -Math.PI / 2 + (idx * 2 * Math.PI) / 5;
                      const x = 80 + radius * Math.cos(angle);
                      const y = 80 + radius * Math.sin(angle);
                      return `${x},${y}`;
                    }).join(' ');

                    return (
                      <polygon 
                        key={sIdx}
                        points={points}
                        fill="none"
                        stroke="rgba(255, 255, 255, 0.08)"
                        strokeWidth="1"
                        strokeDasharray={sIdx === 3 ? "0" : "2 2"}
                      />
                    );
                  })}

                  {/* Axes lines */}
                  {[0, 1, 2, 3, 4].map(idx => {
                    const angle = -Math.PI / 2 + (idx * 2 * Math.PI) / 5;
                    const x = 80 + 55 * Math.cos(angle);
                    const y = 80 + 55 * Math.sin(angle);
                    return (
                      <line 
                        key={idx}
                        x1="80" 
                        y1="80" 
                        x2={x} 
                        y2={y} 
                        stroke="rgba(255, 255, 255, 0.08)" 
                        strokeWidth="1" 
                      />
                    );
                  })}

                  {/* Score Polygon Area */}
                  {totalTrades > 0 && (() => {
                    const scoreValues = [scoreWinRate, scorePF, scoreAvgWL, scoreConsist, scoreRecovery];
                    const polygonPoints = scoreValues.map((score, idx) => {
                      const scale = score / 100;
                      const radius = 55 * scale;
                      const angle = -Math.PI / 2 + (idx * 2 * Math.PI) / 5;
                      const x = 80 + radius * Math.cos(angle);
                      const y = 80 + radius * Math.sin(angle);
                      return `${x},${y}`;
                    }).join(' ');

                    return (
                      <polygon 
                        points={polygonPoints}
                        fill="rgba(242, 125, 38, 0.25)"
                        stroke="#f27d26"
                        strokeWidth="2"
                        className="filter drop-shadow-[0_0_4px_rgba(242,125,38,0.4)]"
                      />
                    );
                  })()}

                  {/* Axes Labels */}
                  {(() => {
                    const labels = ['Win %', 'PF', 'Avg W/L', 'Consist.', 'Recovery'];
                    return labels.map((label, idx) => {
                      const angle = -Math.PI / 2 + (idx * 2 * Math.PI) / 5;
                      const distance = 70;
                      const x = 80 + distance * Math.cos(angle);
                      const y = 80 + distance * Math.sin(angle);
                      
                      let anchor = "middle";
                      if (Math.cos(angle) > 0.1) anchor = "start";
                      if (Math.cos(angle) < -0.1) anchor = "end";

                      return (
                        <text
                          key={idx}
                          x={x}
                          y={y + 3}
                          fill="#9ca3af"
                          fontSize="8"
                          fontFamily="monospace"
                          textAnchor={anchor}
                          className="uppercase font-bold"
                        >
                          {label}
                        </text>
                      );
                    });
                  })()}
                </svg>

                {/* Overlap of final score in middle */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-2xl font-black text-white leading-none tracking-tight">
                    {thunderScore}
                  </span>
                  <span className="text-[7px] font-mono text-gray-500 uppercase tracking-widest mt-0.5">
                    SCORE
                  </span>
                </div>
              </div>

              {/* Metrics List */}
              <div className="flex-1 w-full md:w-auto space-y-2 font-mono text-[9px]">
                <div className="flex items-center justify-between border-b border-white/5 pb-1">
                  <span className="text-gray-400 uppercase">WIN RATE INDEX:</span>
                  <span className="text-white font-bold">{scoreWinRate}/100</span>
                </div>
                <div className="flex items-center justify-between border-b border-white/5 pb-1">
                  <span className="text-gray-400 uppercase">PROFIT FACTOR MARGIN:</span>
                  <span className="text-white font-bold">{scorePF}/100</span>
                </div>
                <div className="flex items-center justify-between border-b border-white/5 pb-1">
                  <span className="text-gray-400 uppercase">AVG WIN/LOSS RATIO:</span>
                  <span className="text-white font-bold">{scoreAvgWL}/100</span>
                </div>
                <div className="flex items-center justify-between border-b border-white/5 pb-1">
                  <span className="text-gray-400 uppercase">CONSISTENCY PATTERN:</span>
                  <span className="text-white font-bold">{scoreConsist}/100</span>
                </div>
                <div className="flex items-center justify-between border-b border-white/5 pb-1">
                  <span className="text-gray-400 uppercase">DRAWDOWN RECOVERY:</span>
                  <span className="text-white font-bold">{scoreRecovery}/100</span>
                </div>
              </div>
            </div>
          </div>

          {/* Color Slider Gauge */}
          <div className="space-y-1.5 mt-4 border-t border-terminal-border/20 pt-4">
            <div className="flex justify-between text-[8px] font-mono text-gray-400 uppercase">
              <span>Amateur (0-40)</span>
              <span>Consistent (60+)</span>
              <span>Legendary (80+)</span>
            </div>
            <div className="h-2 rounded-full w-full bg-gradient-to-r from-terminal-red via-terminal-accent to-terminal-green relative">
              {/* slider knob */}
              <div 
                className="absolute w-4 h-4 rounded-full bg-white border border-black shadow-[0_0_8px_rgba(255,255,255,0.8)] -top-1 -ml-2 flex items-center justify-center transition-all duration-500"
                style={{ left: `${thunderScore}%` }}
              >
                <div className="w-1 h-1 rounded-full bg-terminal-accent" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Grid of breakdowns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Setups performance */}
        <div className="terminal-card border border-terminal-border p-5 bg-black/10 flex flex-col">
          <h4 className="text-xs font-black uppercase tracking-widest text-white mb-4 flex items-center border-b border-terminal-border pb-2">
            <Zap className="w-4 h-4 text-terminal-accent mr-2" />
            Top Setups performance
          </h4>
          {sortedSetups.length === 0 ? (
            <div className="flex-1 flex items-center justify-center p-6 text-[10px] font-mono text-gray-500 uppercase">
              No setup data recorded.
            </div>
          ) : (
            <div className="space-y-4 flex-1 overflow-y-auto">
              {sortedSetups.slice(0, 5).map((setup, i) => (
                <div key={i} className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="text-white font-bold uppercase truncate max-w-[150px]">{setup.name}</span>
                    <span className={setup.pnl >= 0 ? 'text-terminal-green font-bold' : 'text-terminal-red font-bold'}>
                      {setup.pnl >= 0 ? '+' : ''}₹{setup.pnl.toFixed(0)}
                    </span>
                  </div>
                  <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden flex">
                    <div 
                      className="bg-terminal-green h-full"
                      style={{ width: `${setup.winRate}%` }}
                    />
                    <div 
                      className="bg-terminal-red/40 h-full"
                      style={{ width: `${100 - setup.winRate}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[8px] font-mono text-gray-500 uppercase">
                    <span>{setup.trades} Trades</span>
                    <span>Win Rate: {setup.winRate.toFixed(0)}%</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Leakage Detector: Biggest Mistakes */}
        <div className="terminal-card border border-terminal-border p-5 bg-black/10 flex flex-col">
          <h4 className="text-xs font-black uppercase tracking-widest text-white mb-4 flex items-center border-b border-terminal-border pb-2">
            <AlertTriangle className="w-4 h-4 text-terminal-red mr-2" />
            Profit Leakage Detector
          </h4>
          {sortedMistakes.length === 0 ? (
            <div className="flex-1 flex items-center justify-center p-6 text-[10px] font-mono text-terminal-green uppercase">
              Excellent! No mistakes registered yet.
            </div>
          ) : (
            <div className="space-y-4 flex-1 overflow-y-auto">
              {sortedMistakes.slice(0, 5).map((mistake, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="text-gray-200 font-bold uppercase truncate max-w-[150px]">{mistake.name}</span>
                    <span className="text-terminal-red font-bold">
                      -₹{mistake.totalLoss.toFixed(0)}
                    </span>
                  </div>
                  <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
                    {/* Normalized bar based on highest loss */}
                    <div 
                      className="bg-terminal-red h-full"
                      style={{ 
                        width: `${(mistake.totalLoss / (sortedMistakes[0]?.totalLoss || 1)) * 100}%` 
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-[8px] font-mono text-gray-500 uppercase">
                    <span>Affecting {mistake.count} trades</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Instrument Breakdown */}
        <div className="terminal-card border border-terminal-border p-5 bg-black/10 flex flex-col">
          <h4 className="text-xs font-black uppercase tracking-widest text-white mb-4 flex items-center border-b border-terminal-border pb-2">
            <Layers className="w-4 h-4 text-terminal-accent mr-2" />
            Performance by Asset
          </h4>
          {sortedInstruments.length === 0 ? (
            <div className="flex-1 flex items-center justify-center p-6 text-[10px] font-mono text-gray-500 uppercase">
              No instrument stats yet.
            </div>
          ) : (
            <div className="space-y-4 flex-1 overflow-y-auto">
              {sortedInstruments.slice(0, 5).map((inst, i) => (
                <div key={i} className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="text-white font-bold uppercase truncate max-w-[150px]">{inst.name}</span>
                    <span className={inst.pnl >= 0 ? 'text-terminal-green font-bold' : 'text-terminal-red font-bold'}>
                      {inst.pnl >= 0 ? '+' : ''}₹{inst.pnl.toFixed(0)}
                    </span>
                  </div>
                  <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden flex">
                    <div 
                      className="bg-terminal-accent h-full"
                      style={{ width: `${inst.winRate}%` }}
                    />
                    <div 
                      className="bg-white/5 h-full"
                      style={{ width: `${100 - inst.winRate}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[8px] font-mono text-gray-500 uppercase">
                    <span>{inst.trades} Trades</span>
                    <span>Win Rate: {inst.winRate.toFixed(0)}%</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
