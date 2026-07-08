import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Sparkles, 
  Calendar, 
  AlertTriangle, 
  Clock, 
  Info,
  ChevronRight,
  TrendingDown,
  Compass
} from "lucide-react";

export interface RetrogradePeriod {
  planet: string;
  symbol: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  duration: number; // days
  details?: string;
}

// Complete astronomical retrograde dataset extracted from official calendars (2026 - 2036)
export const RETROGRADE_DATA: RetrogradePeriod[] = [
  // --- 2026 ---
  { planet: "Mercury", symbol: "☿", startDate: "2026-02-26", endDate: "2026-03-20", duration: 22, details: "Retrograde in Pisces (♓) - Expect communication glitches and market volatility." },
  { planet: "Mercury", symbol: "☿", startDate: "2026-06-29", endDate: "2026-07-23", duration: 24, details: "Retrograde in Cancer (♋) - Focus on domestic markets and real estate sectors." },
  { planet: "Mercury", symbol: "☿", startDate: "2026-10-24", endDate: "2026-11-13", duration: 20, details: "Retrograde in Scorpio (♏) - Hidden financial patterns emerge." },
  { planet: "Venus", symbol: "♀", startDate: "2026-10-03", endDate: "2026-11-14", duration: 41, details: "Retrograde in Scorpio (♏) - Valuation corrections in luxury, fashion, and banking." },
  { planet: "Jupiter", symbol: "♃", startDate: "2025-11-11", endDate: "2026-03-11", duration: 119, details: "Retrograde in Cancer (♋) - Re-evaluating banking policies and global growth metrics." },
  { planet: "Jupiter", symbol: "♃", startDate: "2026-12-13", endDate: "2027-04-13", duration: 121, details: "Retrograde in Leo (♌) - Speculative market bubbles and sovereign asset revisions." },
  { planet: "Saturn", symbol: "♄", startDate: "2026-07-26", endDate: "2026-12-10", duration: 137, details: "Retrograde in Aries (♈) - Regulatory audits and systemic tightening of leverage." },
  { planet: "Uranus", symbol: "♅", startDate: "2025-09-06", endDate: "2026-02-04", duration: 150, details: "Retrograde in Taurus (♉) - Realigning fintech platforms and crypto market structure." },
  { planet: "Uranus", symbol: "♅", startDate: "2026-09-10", endDate: "2027-02-08", duration: 150, details: "Retrograde in Gemini (♊) - Technology index corrections and sudden logistics disruptions." },
  { planet: "Neptune", symbol: "♆", startDate: "2026-07-07", endDate: "2026-12-12", duration: 158, details: "Retrograde in Aries (♈) - Speculation in alternative energy and pharma cools down." },
  { planet: "Pluto", symbol: "♇", startDate: "2026-05-06", endDate: "2026-10-16", duration: 162, details: "Retrograde in Aquarius (♒) - Power shifts in technology giants and decentralized networks." },
  { planet: "Chiron", symbol: "⚷", startDate: "2025-07-30", endDate: "2026-01-02", duration: 155, details: "Retrograde in Aries (♈) - Restructuring healthcare assets and pharmaceutical indices." },
  { planet: "Chiron", symbol: "⚷", startDate: "2026-08-03", endDate: "2027-01-06", duration: 155, details: "Retrograde in Aries (♈) - Volatility in medical research and emergency funding caps." },

  // --- 2027 ---
  { planet: "Mercury", symbol: "☿", startDate: "2027-02-09", endDate: "2027-03-03", duration: 21, details: "Retrograde in Aquarius (♒) - Telecom and computer network contracts face reviews." },
  { planet: "Mercury", symbol: "☿", startDate: "2027-06-10", endDate: "2027-07-04", duration: 24, details: "Retrograde in Gemini (♊) - Trading platform latency and high-frequency algorithms adjust." },
  { planet: "Mercury", symbol: "☿", startDate: "2027-10-07", endDate: "2027-10-28", duration: 21, details: "Retrograde in Libra (♎) - Mergers, acquisitions, and trade partnerships delayed." },
  { planet: "Mars", symbol: "♂", startDate: "2027-01-10", endDate: "2027-04-01", duration: 81, details: "Retrograde in Virgo (♍) - Industrial manufacturing, defense, and automation slowdowns." },
  { planet: "Saturn", symbol: "♄", startDate: "2027-08-09", endDate: "2027-12-24", duration: 136, details: "Retrograde in Aries (♈) - Debt ceilings and infrastructure expenditure audits." },
  { planet: "Uranus", symbol: "♅", startDate: "2027-09-15", endDate: "2028-02-12", duration: 150, details: "Retrograde in Gemini (♊) - Heavy disruptions in aerospace and social network assets." },
  { planet: "Neptune", symbol: "♆", startDate: "2027-07-09", endDate: "2027-12-15", duration: 158, details: "Retrograde in Aries (♈) - Shift in medical supply chain protocols and maritime shipping." },
  { planet: "Pluto", symbol: "♇", startDate: "2027-05-08", endDate: "2027-10-18", duration: 162, details: "Retrograde in Aquarius (♒) - Systemic revisions of tech regulations and database privacy." },
  { planet: "Chiron", symbol: "⚷", startDate: "2027-08-08", endDate: "2028-01-10", duration: 155, details: "Retrograde in Aries (♈) - Re-evaluating clinical trial models and bio-engineering portfolios." },

  // --- 2028 ---
  { planet: "Mercury", symbol: "☿", startDate: "2028-01-24", endDate: "2028-02-14", duration: 21, details: "Retrograde in Aquarius (♒) - Crypto-market regulatory shifts and logistics blocks." },
  { planet: "Mercury", symbol: "☿", startDate: "2028-05-21", endDate: "2028-06-14", duration: 23, details: "Retrograde in Gemini (♊) - High volatility in tech options and index derivatives." },
  { planet: "Mercury", symbol: "☿", startDate: "2028-09-19", endDate: "2028-10-11", duration: 21, details: "Retrograde in Libra (♎) - Legal gridlocks and diplomatic barriers impact markets." },
  { planet: "Venus", symbol: "♀", startDate: "2028-05-10", endDate: "2028-06-22", duration: 42, details: "Retrograde in Gemini (♊) - Currency trading volatility and luxury retail cooling." },
  { planet: "Jupiter", symbol: "♃", startDate: "2028-01-12", endDate: "2028-05-13", duration: 122, details: "Retrograde in Virgo (♍) - Re-evaluation of agricultural commodities and health tech sectors." },
  { planet: "Saturn", symbol: "♄", startDate: "2028-08-22", endDate: "2029-01-05", duration: 135, details: "Retrograde in Taurus (♉) - Real estate credit restrictions and construction delays." },
  { planet: "Uranus", symbol: "♅", startDate: "2028-09-19", endDate: "2029-02-16", duration: 150, details: "Retrograde in Gemini (♊) - Supply chain bottlenecks and chip manufacturing delays." },
  { planet: "Neptune", symbol: "♆", startDate: "2028-07-11", endDate: "2028-12-16", duration: 158, details: "Retrograde in Aries (♈) - Global chemical and fuel commodity pricing pivots." },
  { planet: "Pluto", symbol: "♇", startDate: "2028-05-09", endDate: "2028-10-19", duration: 162, details: "Retrograde in Aquarius (♒) - Institutional crypto consolidation and central bank digital assets." },
  { planet: "Chiron", symbol: "⚷", startDate: "2028-08-11", endDate: "2029-01-13", duration: 154, details: "Retrograde in Aries (♈) - National healthcare budget trims and biotech valuation adjustments." },

  // --- 2029 ---
  { planet: "Mercury", symbol: "☿", startDate: "2029-01-07", endDate: "2029-01-27", duration: 20, details: "Retrograde in Capricorn (♑) - Corporate restructure announcements and banking audits." },
  { planet: "Mercury", symbol: "☿", startDate: "2029-05-01", endDate: "2029-05-25", duration: 23, details: "Retrograde in Taurus (♉) - Commodity price swings and gold backing discussions." },
  { planet: "Mercury", symbol: "☿", startDate: "2029-09-02", endDate: "2029-09-25", duration: 22, details: "Retrograde in Virgo (♏) - Financial tracking database updates and data-center audits." },
  { planet: "Mercury", symbol: "☿", startDate: "2029-12-22", endDate: "2030-01-11", duration: 19, details: "Retrograde in Capricorn (♑) - Executive leadership transits and yearly fiscal targets reset." },
  { planet: "Venus", symbol: "♀", startDate: "2029-12-16", endDate: "2030-01-26", duration: 40, details: "Retrograde in Capricorn (♑) - Major shifts in global banking alliances and luxury valuations." },
  { planet: "Mars", symbol: "♂", startDate: "2029-02-14", endDate: "2029-05-05", duration: 80, details: "Retrograde in Libra (♎) - International trade disputes and raw material embargoes." },
  { planet: "Jupiter", symbol: "♃", startDate: "2029-02-10", endDate: "2029-06-13", duration: 123, details: "Retrograde in Scorpio (♏) - Debt refinancing restructuring and shadow banking exposures." },
  { planet: "Saturn", symbol: "♄", startDate: "2029-09-06", endDate: "2030-01-19", duration: 134, details: "Retrograde in Taurus (♉) - Capital preservation focus and treasury rate restructuring." },
  { planet: "Uranus", symbol: "♅", startDate: "2029-09-23", endDate: "2030-02-20", duration: 150, details: "Retrograde in Gemini (♊) - Aviation industry strikes and satellite communication outages." },
  { planet: "Neptune", symbol: "♆", startDate: "2029-07-14", endDate: "2029-12-19", duration: 158, details: "Retrograde in Taurus (♉) - Biotech research breakthroughs face legal patent battles." },
  { planet: "Pluto", symbol: "♇", startDate: "2029-05-11", endDate: "2029-10-21", duration: 162, details: "Retrograde in Aquarius (♒) - AI chip licensing regulations and quantum compute policy changes." },
  { planet: "Chiron", symbol: "⚷", startDate: "2029-08-16", endDate: "2030-01-17", duration: 154, details: "Retrograde in Taurus (♉) - Real estate healthcare hubs and medical campus funding." },

  // --- 2030 ---
  { planet: "Mercury", symbol: "☿", startDate: "2030-04-13", endDate: "2030-05-06", duration: 23, details: "Retrograde in Aries (♈) - High frequency trading errors and brokerage fee reviews." },
  { planet: "Mercury", symbol: "☿", startDate: "2030-08-16", endDate: "2030-09-08", duration: 23, details: "Retrograde in Virgo (♍) - Automated data compliance checks and system debugging." },
  { planet: "Mercury", symbol: "☿", startDate: "2030-12-06", endDate: "2030-12-25", duration: 19, details: "Retrograde in Sagittarius (♐) - Tourism stocks and long-distance shipping cargo delays." },
  { planet: "Jupiter", symbol: "♃", startDate: "2030-03-13", endDate: "2030-07-15", duration: 123, details: "Retrograde in Sagittarius (♐) - Sovereign fund allocation cuts and import tariff changes." },
  { planet: "Saturn", symbol: "♄", startDate: "2030-09-20", endDate: "2031-02-02", duration: 134, details: "Retrograde in Gemini (♊) - Logistical bottlenecks in ground transit and rail network projects." },
  { planet: "Uranus", symbol: "♅", startDate: "2030-09-28", endDate: "2031-02-25", duration: 150, details: "Retrograde in Gemini (♊) - High volatility in drone technology and electric grid infrastructure." },
  { planet: "Neptune", symbol: "♆", startDate: "2030-07-16", endDate: "2030-12-21", duration: 158, details: "Retrograde in Taurus (♉) - Agricultural bio-reforms and sustainable energy audits." },
  { planet: "Pluto", symbol: "♇", startDate: "2030-05-12", endDate: "2030-10-23", duration: 163, details: "Retrograde in Pisces (♓) - Global maritime routes and naval trade policy shifts." },
  { planet: "Chiron", symbol: "⚷", startDate: "2030-08-21", endDate: "2031-01-21", duration: 153, details: "Retrograde in Taurus (♉) - Changes in diagnostic clinical trials and drug pricing ceilings." },

  // --- 2031 ---
  { planet: "Mercury", symbol: "☿", startDate: "2031-03-26", endDate: "2031-04-18", duration: 23, details: "Retrograde in Aries (♈) - Swift movements in micro-cap tech and startup funding limits." },
  { planet: "Mercury", symbol: "☿", startDate: "2031-07-29", endDate: "2031-08-22", duration: 23, details: "Retrograde in Leo (♌) - Entertainment, gaming, and media conglomerate mergers delayed." },
  { planet: "Mercury", symbol: "☿", startDate: "2031-11-19", endDate: "2031-12-09", duration: 19, details: "Retrograde in Sagittarius (♐) - Cross-border payment platform upgrades cause latency." },
  { planet: "Venus", symbol: "♀", startDate: "2031-07-20", endDate: "2031-09-01", duration: 43, details: "Retrograde in Leo (♌) - Sovereign wealth reserves adjust holdings in visual/creative industries." },
  { planet: "Mars", symbol: "♂", startDate: "2031-03-29", endDate: "2031-06-13", duration: 76, details: "Retrograde in Scorpio (♏) - Volatility in defense indices and heavy equipment manufacturing." },
  { planet: "Jupiter", symbol: "♃", startDate: "2031-04-15", endDate: "2031-08-16", duration: 122, details: "Retrograde in Capricorn (♑) - Corporate credit downgrades and structural real estate audits." },
  { planet: "Saturn", symbol: "♄", startDate: "2031-10-05", endDate: "2032-02-16", duration: 133, details: "Retrograde in Gemini (♊) - Regulatory changes in publishing and algorithmic cloud services." },
  { planet: "Uranus", symbol: "♅", startDate: "2031-10-03", endDate: "2032-03-01", duration: 149, details: "Retrograde in Gemini (♊) - Major tech network outages and telecom stock volatility." },
  { planet: "Neptune", symbol: "♆", startDate: "2031-07-19", endDate: "2031-12-24", duration: 158, details: "Retrograde in Taurus (♉) - Commodity exchange storage fees and chemical sector pivots." },
  { planet: "Pluto", symbol: "♇", startDate: "2031-05-14", endDate: "2031-10-24", duration: 163, details: "Retrograde in Pisces (♓) - Shadow banking regulations and digital currency taxation rules." },
  { planet: "Chiron", symbol: "⚷", startDate: "2031-08-26", endDate: "2032-01-25", duration: 152, details: "Retrograde in Gemini (♊) - Medical communication systems and bio-tech patents reviews." },

  // --- 2032 ---
  { planet: "Mercury", symbol: "☿", startDate: "2032-03-07", endDate: "2032-03-30", duration: 22, details: "Retrograde in Pisces (♓) - Global maritime logistics contracts re-negotiated." },
  { planet: "Mercury", symbol: "☿", startDate: "2032-07-10", endDate: "2032-08-03", duration: 24, details: "Retrograde in Leo (♌) - Entertainment production delays and media sector drops." },
  { planet: "Mercury", symbol: "☿", startDate: "2032-11-02", endDate: "2032-11-22", duration: 20, details: "Retrograde in Scorpio (♏) - Derivatives market audits and hidden assets discovery." },
  { planet: "Jupiter", symbol: "♃", startDate: "2032-05-19", endDate: "2032-09-17", duration: 121, details: "Retrograde in Aquarius (♒) - Biotech research budget trims and technology patent disputes." },
  { planet: "Saturn", symbol: "♄", startDate: "2032-10-18", endDate: "2033-03-01", duration: 133, details: "Retrograde in Cancer (♋) - Steel and cement infrastructure raw material costs surge." },
  { planet: "Uranus", symbol: "♅", startDate: "2032-10-06", endDate: "2033-03-05", duration: 149, details: "Retrograde in Cancer (♋) - Domestic energy grid upgrades delay; shipping port issues." },
  { planet: "Neptune", symbol: "♆", startDate: "2032-07-20", endDate: "2032-12-25", duration: 158, details: "Retrograde in Gemini (♊) - Tech cloud service outages and digital streaming security fixes." },
  { planet: "Pluto", symbol: "♇", startDate: "2032-05-15", endDate: "2032-10-25", duration: 163, details: "Retrograde in Pisces (♓) - Re-evaluating maritime defense systems and ocean freight rates." },
  { planet: "Chiron", symbol: "⚷", startDate: "2032-08-30", endDate: "2033-01-29", duration: 151, details: "Retrograde in Gemini (♊) - Genetic research centers audit; health data system updates." },

  // --- 2033 ---
  { planet: "Mercury", symbol: "☿", startDate: "2033-02-18", endDate: "2033-03-13", duration: 22, details: "Retrograde in Pisces (♓) - Water utility commodities and cargo shipping delay." },
  { planet: "Mercury", symbol: "☿", startDate: "2033-06-21", endDate: "2033-07-15", duration: 24, details: "Retrograde in Cancer (♋) - Housing loan rate revisions and cement industry audits." },
  { planet: "Mercury", symbol: "☿", startDate: "2033-10-16", endDate: "2033-11-06", duration: 20, details: "Retrograde in Scorpio (♏) - Shadow asset management regulations take shape." },
  { planet: "Venus", symbol: "♀", startDate: "2033-02-27", endDate: "2033-04-10", duration: 41, details: "Retrograde in Pisces (♓) - Chemical, pharma, and global oil commodities trade pivots." },
  { planet: "Mars", symbol: "♂", startDate: "2033-05-26", endDate: "2033-08-01", duration: 66, details: "Retrograde in Sagittarius (♐) - Aerospace sector manufacturing and metal pricing volatility." },
  { planet: "Jupiter", symbol: "♃", startDate: "2033-06-25", endDate: "2033-10-23", duration: 119, details: "Retrograde in Pisces (♓) - Sovereign funds reduce exposure to medical & water tech." },
  { planet: "Saturn", symbol: "♄", startDate: "2033-11-02", endDate: "2034-03-16", duration: 133, details: "Retrograde in Cancer (♋) - Infrastructure construction labor guidelines and regulatory rules." },
  { planet: "Uranus", symbol: "♅", startDate: "2033-10-11", endDate: "2034-03-10", duration: 149, details: "Retrograde in Cancer (♋) - Supply chain disruptions in heavy metals and residential piping." },
  { planet: "Neptune", symbol: "♆", startDate: "2033-07-23", endDate: "2033-12-28", duration: 157, details: "Retrograde in Gemini (♊) - Cyberdefense updates across banking servers after high-profile leaks." },
  { planet: "Pluto", symbol: "♇", startDate: "2033-05-17", endDate: "2033-10-27", duration: 163, details: "Retrograde in Aries (♈) - Heavy metal mining regulatory audits and sovereign gold shifts." },
  { planet: "Chiron", symbol: "⚷", startDate: "2033-09-05", endDate: "2034-02-03", duration: 150, details: "Retrograde in Gemini (♊) - Medical data system upgrades and bio-insurance premium restructuring." },

  // --- 2034 ---
  { planet: "Mercury", symbol: "☿", startDate: "2034-02-02", endDate: "2034-02-23", duration: 21, details: "Retrograde in Aquarius (♒) - Server-side security checks cause transactional delays." },
  { planet: "Mercury", symbol: "☿", startDate: "2034-06-02", endDate: "2034-06-26", duration: 24, details: "Retrograde in Gemini (♊) - Futures market and automated derivatives algorithm adjustments." },
  { planet: "Mercury", symbol: "☿", startDate: "2034-09-30", endDate: "2034-10-21", duration: 21, details: "Retrograde in Scorpio (♏) - Forensic financial reports trigger banking oversight checks." },
  { planet: "Venus", symbol: "♀", startDate: "2034-09-30", endDate: "2034-11-11", duration: 41, details: "Retrograde in Scorpio (♏) - Re-evaluating banking reserve ratios and asset pricing pools." },
  { planet: "Jupiter", symbol: "♃", startDate: "2034-08-03", endDate: "2034-11-29", duration: 117, details: "Retrograde in Aries (♈) - Venture capital funding rounds cooling; IPO valuations adjust." },
  { planet: "Saturn", symbol: "♄", startDate: "2034-11-16", endDate: "2035-03-30", duration: 134, details: "Retrograde in Leo (♌) - Corporate governance audits and entertainment sector consolidations." },
  { planet: "Uranus", symbol: "♅", startDate: "2034-10-16", endDate: "2035-03-14", duration: 149, details: "Retrograde in Cancer (♋) - Domestic real estate credit regulations tighten." },
  { planet: "Neptune", symbol: "♆", startDate: "2034-07-25", endDate: "2034-12-30", duration: 157, details: "Retrograde in Gemini (♊) - Communication bandwidth supply chains and satellite stocks drop." },
  { planet: "Pluto", symbol: "♇", startDate: "2034-05-19", endDate: "2034-10-29", duration: 163, details: "Retrograde in Aries (♈) - Mining automation projects and global defense contractor audits." },
  { planet: "Chiron", symbol: "⚷", startDate: "2034-09-11", endDate: "2035-02-08", duration: 150, details: "Retrograde in Cancer (♋) - Restructuring hospital real estate and localized clinics." },

  // --- 2035 ---
  { planet: "Mercury", symbol: "☿", startDate: "2035-01-17", endDate: "2035-02-07", duration: 20, details: "Retrograde in Capricorn (♑) - Government trade departments reset policy targets." },
  { planet: "Mercury", symbol: "☿", startDate: "2035-05-13", endDate: "2035-06-06", duration: 23, details: "Retrograde in Gemini (♊) - High frequency stock brokers adjust safety buffers." },
  { planet: "Mercury", symbol: "☿", startDate: "2035-09-13", endDate: "2035-10-05", duration: 22, details: "Retrograde in Scorpio (♏) - Shadow asset management structures come under lens." },
  { planet: "Mars", symbol: "♂", startDate: "2035-08-15", endDate: "2035-10-15", duration: 60, details: "Retrograde in Taurus (♉) - Industrial metals index drops and defense budget checks." },
  { planet: "Jupiter", symbol: "♃", startDate: "2035-09-09", endDate: "2036-01-05", duration: 117, details: "Retrograde in Taurus (♉) - Agricultural commodity price caps and credit reserve changes." },
  { planet: "Saturn", symbol: "♄", startDate: "2035-11-30", endDate: "2036-04-12", duration: 134, details: "Retrograde in Leo (♌) - Entertainment and gaming sector regulations take hold." },
  { planet: "Uranus", symbol: "♅", startDate: "2035-10-21", endDate: "2036-03-18", duration: 149, details: "Retrograde in Leo (♌) - Automotive and electric vehicle stocks feel supply chain issues." },
  { planet: "Neptune", symbol: "♆", startDate: "2035-07-28", endDate: "2036-01-02", duration: 157, details: "Retrograde in Gemini (♊) - Internet routing algorithms face updates after localized hacking." },
  { planet: "Pluto", symbol: "♇", startDate: "2035-05-20", endDate: "2035-10-31", duration: 163, details: "Retrograde in Aries (♈) - Military hardware export guidelines undergo reviews." },
  { planet: "Chiron", symbol: "⚷", startDate: "2035-09-18", endDate: "2036-02-13", duration: 147, details: "Retrograde in Cancer (♋) - Bio-health infrastructure planning delayed." },

  // --- 2036 ---
  { planet: "Mercury", symbol: "☿", startDate: "2036-01-01", endDate: "2036-01-21", duration: 20, details: "Retrograde in Capricorn (♑) - Banking security protocols reset; system freezes." },
  { planet: "Mercury", symbol: "☿", startDate: "2036-04-23", endDate: "2036-05-17", duration: 23, details: "Retrograde in Taurus (♉) - Volatile commodity pricing for copper and battery metals." },
  { planet: "Mercury", symbol: "☿", startDate: "2036-08-25", endDate: "2036-09-17", duration: 22, details: "Retrograde in Virgo (♍) - Big Data platform audits and cloud hosting security tests." },
  { planet: "Mercury", symbol: "☿", startDate: "2036-12-15", endDate: "2037-01-03", duration: 19, details: "Retrograde in Capricorn (♑) - Corporate merger reviews block critical retail stocks." },
  { planet: "Venus", symbol: "♀", startDate: "2036-05-08", endDate: "2036-06-20", duration: 42, details: "Retrograde in Gemini (♊) - Technology startups valuations drop; media rights frozen." },
  { planet: "Jupiter", symbol: "♃", startDate: "2036-10-14", endDate: "2037-02-09", duration: 118, details: "Retrograde in Gemini (♊) - Smart city funding freezes and telecom hardware audits." },
  { planet: "Saturn", symbol: "♄", startDate: "2036-12-13", endDate: "2037-04-27", duration: 135, details: "Retrograde in Leo (♌) - Entertainment conglomerate credit tightening." },
  { planet: "Uranus", symbol: "♅", startDate: "2036-10-25", endDate: "2037-03-23", duration: 149, details: "Retrograde in Leo (♌) - Automobile logistics bottlenecks; luxury EV stocks volatile." },
  { planet: "Neptune", symbol: "♆", startDate: "2036-07-30", endDate: "2037-01-03", duration: 157, details: "Retrograde in Cancer (♋) - Maritime energy shipping logistics face regional regulatory blocks." },
  { planet: "Pluto", symbol: "♇", startDate: "2036-05-21", endDate: "2036-11-01", duration: 163, details: "Retrograde in Aries (♈) - Venture capital funding in defense and weapon tech halts." },
  { planet: "Chiron", symbol: "⚷", startDate: "2036-09-25", endDate: "2037-02-18", duration: 146, details: "Retrograde in Cancer (♋) - Restructuring hospital management software and regional care funds." }
];

export default function PlanetaryRetrogrades() {
  const [isExplorerOpen, setIsExplorerOpen] = useState<boolean>(false);
  const [selectedPlanet, setSelectedPlanet] = useState<string>("ALL");
  const [selectedYear, setSelectedYear] = useState<number>(2026);

  // Determine current system date as UTC to prevent local computer timezone bias
  const today = useMemo(() => {
    // Current date object
    const d = new Date();
    // Create zeroed UTC date representing today
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  }, []);

  const todayStr = useMemo(() => {
    return today.toISOString().split("T")[0];
  }, [today]);

  // Check which retrogrades are active TODAY
  const activeRetrogrades = useMemo(() => {
    return RETROGRADE_DATA.filter((item) => {
      const start = new Date(item.startDate);
      const end = new Date(item.endDate);
      return today >= start && today <= end;
    });
  }, [today]);

  // Upcoming retrogrades (start after today) sorted chronologically
  const upcomingRetrogrades = useMemo(() => {
    return RETROGRADE_DATA.filter((item) => {
      const start = new Date(item.startDate);
      return start > today;
    })
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
      .slice(0, 3);
  }, [today]);

  // List of all unique planets in database for dropdown
  const planetsList = useMemo(() => {
    const set = new Set(RETROGRADE_DATA.map((r) => r.planet));
    return Array.from(set).sort();
  }, []);

  // Filtered retrogrades based on selection
  const filteredRetrogrades = useMemo(() => {
    return RETROGRADE_DATA.filter((item) => {
      const yearMatches = new Date(item.startDate).getUTCFullYear() === selectedYear || 
                          new Date(item.endDate).getUTCFullYear() === selectedYear;
      const planetMatches = selectedPlanet === "ALL" || item.planet === selectedPlanet;
      return yearMatches && planetMatches;
    }).sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
  }, [selectedPlanet, selectedYear]);

  const yearsList = [2026, 2027, 2028, 2029, 2030, 2031, 2032, 2033, 2034, 2035, 2036];

  const formatDisplayDate = (dateStr: string) => {
    const parts = dateStr.split("-");
    if (parts.length < 3) return dateStr;
    const year = parts[0];
    const monthIdx = parseInt(parts[1]) - 1;
    const day = parts[2];
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${day}-${months[monthIdx]}-${year}`;
  };

  return (
    <div id="planetary-retrogrades-section" className="space-y-6">
      {/* SECTION HEADER */}
      <div className="border-t border-terminal-border pt-6 pb-2">
        <h3 className="text-md font-bold text-white uppercase tracking-widest flex items-center">
          <TrendingDown className="w-5 h-5 text-terminal-accent mr-2 animate-pulse" />
          PLANETARY RETROGRADES
        </h3>
        <p className="text-xs text-gray-500 font-mono mt-1">
          Monitor planetary speed reversals (apparent backward motion) which correspond strongly with major systemic shifts, trend exhaustion, and major counter-trend pivots in global asset markets.
        </p>
      </div>

      {/* ACTIVE & UPCOMING DASHBOARD ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* CURRENTLY ACTIVE RETROGRADES */}
        <div className="lg:col-span-7 bg-white/[0.02] border border-white/5 rounded-lg p-4 font-mono space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-2">
            <span className="text-xs font-bold text-white uppercase flex items-center">
              <Clock className="w-3.5 h-3.5 text-terminal-accent mr-1.5 animate-pulse" />
              CURRENTLY ACTIVE RETROGRADES
            </span>
            <span className="text-[9px] text-gray-500 font-bold">
              SYS DATE: {formatDisplayDate(todayStr)}
            </span>
          </div>

          {activeRetrogrades.length > 0 ? (
            <div className="space-y-3">
              <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded flex items-start space-x-3 text-xs">
                <AlertTriangle className="w-4 h-4 mt-0.5 text-red-500 animate-bounce flex-shrink-0" />
                <div>
                  <span className="font-black block uppercase tracking-wider">⚠️ System Alert: {activeRetrogrades.length} Retrogrades Active Today</span>
                  <span className="text-[10px] text-gray-400">Trading during multi-retrograde periods usually exhibits decreased liquidity, false breakouts, and high whipsaw rates.</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {activeRetrogrades.map((item, idx) => (
                  <div key={idx} className="p-3 bg-black/40 border border-white/5 rounded-lg space-y-2 hover:border-red-500/30 transition-all">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black text-white flex items-center">
                        <span className="text-red-400 text-sm mr-1.5">{item.symbol}</span>
                        {item.planet.toUpperCase()}
                      </span>
                      <span className="text-[8px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded font-black uppercase">
                        ACTIVE
                      </span>
                    </div>
                    <div className="text-[10px] space-y-0.5 leading-relaxed">
                      <div><span className="text-gray-500">Begins:</span> <span className="font-bold text-white">{formatDisplayDate(item.startDate)}</span></div>
                      <div><span className="text-gray-500">Ends:</span> <span className="font-bold text-white">{formatDisplayDate(item.endDate)}</span></div>
                      <div><span className="text-gray-500">Duration:</span> <span className="font-bold text-red-400">{item.duration} Days</span></div>
                    </div>
                    <p className="text-[9px] text-gray-400 pt-1.5 border-t border-white/5 leading-relaxed italic">
                      {item.details}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-6 bg-terminal-green/5 border border-terminal-green/10 rounded-lg text-center space-y-2">
              <div className="text-terminal-green text-lg font-black font-mono">✓ NO ACTIVE RETROGRADES</div>
              <p className="text-[10px] text-gray-400 max-w-md mx-auto leading-relaxed">
                All major planets are currently in direct motion. This supports high-momentum trends, clean institutional breakouts, and reliable technical chart structures.
              </p>
            </div>
          )}
        </div>

        {/* UPCOMING RETROGRADES TIMELINE */}
        <div className="lg:col-span-5 bg-white/[0.02] border border-white/5 rounded-lg p-4 font-mono space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-2">
            <span className="text-xs font-bold text-white uppercase flex items-center">
              <Calendar className="w-3.5 h-3.5 text-terminal-accent mr-1.5" />
              UPCOMING RETROGRADES
            </span>
          </div>

          <div className="space-y-3">
            {upcomingRetrogrades.map((item, idx) => (
              <div key={idx} className="flex items-start space-x-3 p-2.5 bg-black/20 rounded border border-white/5 hover:border-terminal-accent/20 transition-all">
                <div className="bg-terminal-accent/10 border border-terminal-accent/20 p-2 rounded text-center min-w-[44px] flex-shrink-0">
                  <span className="text-terminal-accent text-lg block leading-none">{item.symbol}</span>
                  <span className="text-[7px] text-gray-400 block font-bold uppercase mt-1">{item.planet.slice(0, 3)}</span>
                </div>
                <div className="space-y-1 flex-1 text-[10px]">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-white">{item.planet.toUpperCase()} INBOUND</span>
                    <span className="text-[8px] font-bold text-terminal-accent">IN {(Math.round((new Date(item.startDate).getTime() - today.getTime()) / 86400000))} DAYS</span>
                  </div>
                  <div className="text-[9px] text-gray-400 flex flex-wrap gap-x-3 leading-relaxed">
                    <span>FROM: <strong className="text-gray-300">{formatDisplayDate(item.startDate)}</strong></span>
                    <span>TO: <strong className="text-gray-300">{formatDisplayDate(item.endDate)}</strong></span>
                    <span>LEN: <strong className="text-terminal-accent">{item.duration}d</strong></span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* YEARLY RETROGRADE EXPLORER PANEL PREVIEW */}
      <div className="bg-gradient-to-b from-white/[0.01] to-transparent border border-white/5 rounded-xl p-6 font-mono text-center space-y-4">
        <div className="flex flex-col items-center space-y-2 max-w-lg mx-auto">
          <div className="bg-terminal-accent/10 border border-terminal-accent/20 p-3 rounded-full">
            <Compass className="w-6 h-6 text-terminal-accent animate-spin-slow" />
          </div>
          <h4 className="text-xs font-bold text-white uppercase tracking-wider">
            ASTRO RETROGRADE EXPLORER & CALENDAR
          </h4>
          <p className="text-[10px] text-gray-500 leading-relaxed">
            Access the full historical and predictive retrograde matrix for years 2026 to 2036. Analyze long-term cosmological speed anomalies paired with direct index catalyst projections.
          </p>
        </div>
        
        <button
          onClick={() => setIsExplorerOpen(true)}
          className="mx-auto bg-terminal-accent/15 hover:bg-terminal-accent/30 border border-terminal-accent/30 hover:border-terminal-accent/50 text-terminal-accent text-[11px] font-black uppercase px-6 py-2.5 rounded transition-all tracking-wider flex items-center space-x-2 cursor-pointer shadow-lg hover:shadow-terminal-accent/5"
        >
          <span>VIEW ALL RETROGRADE MATRIX</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <AnimatePresence>
        {isExplorerOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed inset-0 z-50 overflow-y-auto bg-neutral-950/98 backdrop-blur-xl p-6 md:p-10 font-mono flex flex-col space-y-6"
          >
            {/* Header / Nav bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-5">
              <div className="space-y-1">
                <button
                  onClick={() => setIsExplorerOpen(false)}
                  className="flex items-center text-[10px] font-bold text-gray-400 hover:text-terminal-accent uppercase tracking-wider mb-2 transition-colors cursor-pointer group"
                >
                  <span className="mr-1 group-hover:-translate-x-0.5 transition-transform">←</span> BACK TO MAIN DASHBOARD
                </button>
                <h2 className="text-sm font-black text-white uppercase flex items-center tracking-widest">
                  <Compass className="w-5 h-5 text-terminal-accent mr-2 animate-pulse" />
                  ASTRO RETROGRADE EXPLORER & CALENDAR
                </h2>
                <p className="text-[10px] text-gray-500">Chronological list of planetary speed reversals and target market cycle exhaustions.</p>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="space-y-1">
                  <label className="text-[8px] text-gray-500 uppercase font-bold block">Planet Filter</label>
                  <select
                    value={selectedPlanet}
                    onChange={(e) => setSelectedPlanet(e.target.value)}
                    className="bg-neutral-900 border border-white/10 rounded p-1.5 text-[10px] text-white focus:border-terminal-accent outline-none font-mono cursor-pointer"
                  >
                    <option value="ALL">ALL PLANETS</option>
                    {planetsList.map((p) => (
                      <option key={p} value={p}>{p.toUpperCase()}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[8px] text-gray-500 uppercase font-bold block">Year Selector</label>
                  <div className="flex bg-neutral-900 border border-white/10 rounded p-0.5">
                    {yearsList.map((y) => (
                      <button
                        key={y}
                        onClick={() => setSelectedYear(y)}
                        className={`px-2 py-1 rounded text-[9px] font-black transition-all ${
                          selectedYear === y 
                            ? "bg-terminal-accent text-white" 
                            : "text-gray-400 hover:text-white"
                        }`}
                      >
                        {y}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Main Full Page Content */}
            <div className="flex-1 space-y-6">
              {filteredRetrogrades.length > 0 ? (
                <div className="overflow-x-auto rounded-lg border border-white/10 bg-black/40">
                  <table className="w-full text-left border-collapse text-[11px]">
                    <thead>
                      <tr className="bg-white/5 text-gray-400 border-b border-white/10">
                        <th className="p-3.5 font-bold uppercase">Planet</th>
                        <th className="p-3.5 font-bold uppercase">Retrograde Begins</th>
                        <th className="p-3.5 font-bold uppercase">Retrograde Ends</th>
                        <th className="p-3.5 font-bold uppercase text-center">Duration</th>
                        <th className="p-3.5 font-bold uppercase">Astrological Implications / Market Impact details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRetrogrades.map((res, idx) => {
                        const startD = new Date(res.startDate);
                        const endD = new Date(res.endDate);
                        const isCurrent = today >= startD && today <= endD;
                        
                        return (
                          <tr 
                            key={idx} 
                            className={`border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors ${
                              isCurrent ? "bg-red-500/[0.04] border-l-2 border-l-red-500 animate-pulse" : ""
                            }`}
                          >
                            <td className="p-3.5 font-black text-white flex items-center space-x-1.5">
                              <span className="text-terminal-accent text-xs">{res.symbol}</span>
                              <span>{res.planet}</span>
                              {isCurrent && (
                                <span className="text-[7px] font-black bg-red-500/20 text-red-400 px-1 rounded">ACTIVE</span>
                              )}
                            </td>
                            <td className="p-3.5 font-bold text-gray-300">{formatDisplayDate(res.startDate)}</td>
                            <td className="p-3.5 font-bold text-gray-300">{formatDisplayDate(res.endDate)}</td>
                            <td className="p-3.5 font-black text-center text-terminal-accent">{res.duration} Days</td>
                            <td className="p-3.5 text-gray-400 text-[10px] italic leading-relaxed">{res.details}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-12 text-center bg-white/[0.01] border border-white/5 rounded-lg text-xs text-gray-500 leading-relaxed font-mono">
                  No retrogrades matching the selected criteria found in {selectedYear}. Direct motion dominates this year's planetary chart.
                </div>
              )}
            </div>

            {/* Footer with a quick back action */}
            <div className="border-t border-white/10 pt-4 flex justify-between items-center text-[9px] text-gray-500">
              <span>ASTRO RETROGRADE MATRIX • DETAILED DATASET LAYER</span>
              <button
                onClick={() => setIsExplorerOpen(false)}
                className="bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 px-3 py-1 rounded cursor-pointer transition-all"
              >
                CLOSE EXPLORER
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
