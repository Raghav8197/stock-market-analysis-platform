from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any
import yfinance as yf
import pandas as pd
import numpy as np

router = APIRouter(
    prefix="/api/funds",
    tags=["Mutual Funds"]
)

# In-memory database of Mutual Funds
MUTUAL_FUNDS_DB = {
    # ─────────────── US FUNDS ───────────────
    "VFIAX": {
        "symbol": "VFIAX",
        "name": "Vanguard 500 Index Fund Admiral Shares",
        "market": "US",
        "category": "Index Fund / Large Cap",
        "nav": 498.75,
        "change_pct": 0.32,
        "aum": 875_000_000_000,
        "expense_ratio": 0.04,
        "sharpe_ratio": 1.25,
        "risk_profile": "Moderate",
        "returns_1y": 24.56,
        "returns_3y": 9.87,
        "returns_5y": 14.32,
        "allocation": {"Equity": 99.1, "Debt": 0.0, "Cash": 0.9},
        "top_sectors": [
            {"sector": "Technology", "weight": 30.5},
            {"sector": "Financials", "weight": 12.8},
            {"sector": "Healthcare", "weight": 11.2},
            {"sector": "Consumer Cyclical", "weight": 10.5},
            {"sector": "Industrials", "weight": 8.4}
        ],
        "top_holdings": ["Microsoft Corp", "Apple Inc", "NVIDIA Corp", "Amazon.com Inc", "Alphabet Inc"]
    },
    "VTSAX": {
        "symbol": "VTSAX",
        "name": "Vanguard Total Stock Market Index Fund Admiral Shares",
        "market": "US",
        "category": "Index Fund / Broad Market",
        "nav": 126.80,
        "change_pct": 0.28,
        "aum": 1_350_000_000_000,
        "expense_ratio": 0.04,
        "sharpe_ratio": 1.18,
        "risk_profile": "Moderate",
        "returns_1y": 23.88,
        "returns_3y": 8.95,
        "returns_5y": 13.45,
        "allocation": {"Equity": 98.7, "Debt": 0.0, "Cash": 1.3},
        "top_sectors": [
            {"sector": "Technology", "weight": 28.9},
            {"sector": "Financials", "weight": 13.2},
            {"sector": "Healthcare", "weight": 11.8},
            {"sector": "Consumer Cyclical", "weight": 10.9},
            {"sector": "Industrials", "weight": 9.1}
        ],
        "top_holdings": ["Microsoft Corp", "Apple Inc", "NVIDIA Corp", "Amazon.com Inc", "Alphabet Inc"]
    },
    "VBTLX": {
        "symbol": "VBTLX",
        "name": "Vanguard Total Bond Market Index Fund Admiral Shares",
        "market": "US",
        "category": "Fixed Income / Total Bond Market",
        "nav": 9.45,
        "change_pct": -0.11,
        "aum": 320_000_000_000,
        "expense_ratio": 0.05,
        "sharpe_ratio": 0.38,
        "risk_profile": "Low",
        "returns_1y": 2.10,
        "returns_3y": -2.80,
        "returns_5y": 0.55,
        "allocation": {"Equity": 0.0, "Debt": 97.8, "Cash": 2.2},
        "top_sectors": [
            {"sector": "US Government", "weight": 44.2},
            {"sector": "Investment Grade Corporate", "weight": 26.8},
            {"sector": "Mortgage-Backed Securities", "weight": 20.4},
            {"sector": "Asset-Backed Securities", "weight": 5.1},
            {"sector": "Foreign Bonds (USD)", "weight": 3.5}
        ],
        "top_holdings": ["US Treasury 2.375% 2024", "US Treasury 1.5% 2031", "FNMA MBS Pool", "GNMA MBS Pool", "Freddie Mac RMBS"]
    },
    "VWELX": {
        "symbol": "VWELX",
        "name": "Vanguard Wellington Fund Investor Shares",
        "market": "US",
        "category": "Balanced / Hybrid (Active)",
        "nav": 44.20,
        "change_pct": 0.18,
        "aum": 108_000_000_000,
        "expense_ratio": 0.24,
        "sharpe_ratio": 0.92,
        "risk_profile": "Moderate",
        "returns_1y": 14.60,
        "returns_3y": 5.80,
        "returns_5y": 9.35,
        "allocation": {"Equity": 65.4, "Debt": 32.1, "Cash": 2.5},
        "top_sectors": [
            {"sector": "Technology", "weight": 18.5},
            {"sector": "Financials", "weight": 17.2},
            {"sector": "Healthcare", "weight": 14.8},
            {"sector": "Industrials", "weight": 9.3},
            {"sector": "Consumer Staples", "weight": 7.6}
        ],
        "top_holdings": ["Microsoft Corp", "Broadcom Inc", "Alphabet Inc", "UnitedHealth Group", "Visa Inc"]
    },
    "FCNTX": {
        "symbol": "FCNTX",
        "name": "Fidelity Contrafund",
        "market": "US",
        "category": "Equity Growth / Large Cap (Active)",
        "nav": 18.42,
        "change_pct": 0.52,
        "aum": 115_000_000_000,
        "expense_ratio": 0.81,
        "sharpe_ratio": 1.05,
        "risk_profile": "High",
        "returns_1y": 28.12,
        "returns_3y": 7.42,
        "returns_5y": 12.80,
        "allocation": {"Equity": 97.4, "Debt": 0.0, "Cash": 2.6},
        "top_sectors": [
            {"sector": "Technology", "weight": 41.2},
            {"sector": "Communication Services", "weight": 16.5},
            {"sector": "Consumer Cyclical", "weight": 12.4},
            {"sector": "Financials", "weight": 9.8},
            {"sector": "Healthcare", "weight": 8.1}
        ],
        "top_holdings": ["Meta Platforms", "Microsoft Corp", "NVIDIA Corp", "Amazon.com Inc", "Apple Inc"]
    },
    "FXAIX": {
        "symbol": "FXAIX",
        "name": "Fidelity 500 Index Fund",
        "market": "US",
        "category": "Index Fund / Large Cap",
        "nav": 178.60,
        "change_pct": 0.31,
        "aum": 560_000_000_000,
        "expense_ratio": 0.015,
        "sharpe_ratio": 1.24,
        "risk_profile": "Moderate",
        "returns_1y": 24.52,
        "returns_3y": 9.82,
        "returns_5y": 14.28,
        "allocation": {"Equity": 99.5, "Debt": 0.0, "Cash": 0.5},
        "top_sectors": [
            {"sector": "Technology", "weight": 30.6},
            {"sector": "Financials", "weight": 12.7},
            {"sector": "Healthcare", "weight": 11.3},
            {"sector": "Consumer Cyclical", "weight": 10.4},
            {"sector": "Industrials", "weight": 8.5}
        ],
        "top_holdings": ["Microsoft Corp", "Apple Inc", "NVIDIA Corp", "Amazon.com Inc", "Meta Platforms"]
    },
    "FBALX": {
        "symbol": "FBALX",
        "name": "Fidelity Balanced Fund",
        "market": "US",
        "category": "Balanced / Allocation (Active)",
        "nav": 27.85,
        "change_pct": 0.22,
        "aum": 28_000_000_000,
        "expense_ratio": 0.51,
        "sharpe_ratio": 0.89,
        "risk_profile": "Moderate",
        "returns_1y": 16.40,
        "returns_3y": 5.10,
        "returns_5y": 9.90,
        "allocation": {"Equity": 69.2, "Debt": 28.4, "Cash": 2.4},
        "top_sectors": [
            {"sector": "Technology", "weight": 22.8},
            {"sector": "Financials", "weight": 14.5},
            {"sector": "Healthcare", "weight": 13.2},
            {"sector": "Consumer Cyclical", "weight": 9.7},
            {"sector": "Industrials", "weight": 8.4}
        ],
        "top_holdings": ["Microsoft Corp", "Apple Inc", "NVIDIA Corp", "Amazon.com Inc", "Alphabet Inc"]
    },
    "PRWCX": {
        "symbol": "PRWCX",
        "name": "T. Rowe Price Capital Appreciation Fund",
        "market": "US",
        "category": "Balanced / Allocation (Active)",
        "nav": 33.10,
        "change_pct": 0.19,
        "aum": 52_000_000_000,
        "expense_ratio": 0.71,
        "sharpe_ratio": 1.12,
        "risk_profile": "Moderate",
        "returns_1y": 18.90,
        "returns_3y": 8.40,
        "returns_5y": 12.20,
        "allocation": {"Equity": 71.8, "Debt": 24.5, "Cash": 3.7},
        "top_sectors": [
            {"sector": "Technology", "weight": 25.4},
            {"sector": "Financials", "weight": 15.6},
            {"sector": "Healthcare", "weight": 12.9},
            {"sector": "Consumer Cyclical", "weight": 10.1},
            {"sector": "Communication", "weight": 8.5}
        ],
        "top_holdings": ["Microsoft Corp", "Amazon.com Inc", "UnitedHealth Group", "Alphabet Inc", "Mastercard Inc"]
    },
    "PRGFX": {
        "symbol": "PRGFX",
        "name": "T. Rowe Price Growth Stock Fund",
        "market": "US",
        "category": "Equity Growth / Large Cap (Active)",
        "nav": 91.45,
        "change_pct": 0.61,
        "aum": 74_000_000_000,
        "expense_ratio": 0.65,
        "sharpe_ratio": 1.08,
        "risk_profile": "High",
        "returns_1y": 31.50,
        "returns_3y": 8.20,
        "returns_5y": 14.80,
        "allocation": {"Equity": 98.2, "Debt": 0.0, "Cash": 1.8},
        "top_sectors": [
            {"sector": "Technology", "weight": 42.5},
            {"sector": "Consumer Cyclical", "weight": 14.8},
            {"sector": "Communication Services", "weight": 13.2},
            {"sector": "Healthcare", "weight": 10.5},
            {"sector": "Financials", "weight": 7.9}
        ],
        "top_holdings": ["NVIDIA Corp", "Microsoft Corp", "Amazon.com Inc", "Alphabet Inc", "Meta Platforms"]
    },
    "SWPPX": {
        "symbol": "SWPPX",
        "name": "Schwab S&P 500 Index Fund",
        "market": "US",
        "category": "Index Fund / Large Cap",
        "nav": 72.15,
        "change_pct": 0.30,
        "aum": 92_000_000_000,
        "expense_ratio": 0.02,
        "sharpe_ratio": 1.23,
        "risk_profile": "Moderate",
        "returns_1y": 24.45,
        "returns_3y": 9.75,
        "returns_5y": 14.20,
        "allocation": {"Equity": 99.7, "Debt": 0.0, "Cash": 0.3},
        "top_sectors": [
            {"sector": "Technology", "weight": 30.4},
            {"sector": "Financials", "weight": 13.0},
            {"sector": "Healthcare", "weight": 11.5},
            {"sector": "Consumer Cyclical", "weight": 10.2},
            {"sector": "Industrials", "weight": 8.6}
        ],
        "top_holdings": ["Microsoft Corp", "Apple Inc", "NVIDIA Corp", "Amazon.com Inc", "Alphabet Inc"]
    },
    "PONAX": {
        "symbol": "PONAX",
        "name": "PIMCO Income Fund Class A",
        "market": "US",
        "category": "Fixed Income / Debt Bond (Active)",
        "nav": 11.15,
        "change_pct": -0.05,
        "aum": 72_000_000_000,
        "expense_ratio": 0.90,
        "sharpe_ratio": 0.45,
        "risk_profile": "Low",
        "returns_1y": 5.40,
        "returns_3y": 2.10,
        "returns_5y": 3.80,
        "allocation": {"Equity": 0.0, "Debt": 92.5, "Cash": 7.5},
        "top_sectors": [
            {"sector": "Mortgage Backed", "weight": 42.5},
            {"sector": "High Yield Corporate", "weight": 18.2},
            {"sector": "Investment Grade Corporate", "weight": 12.4},
            {"sector": "Emerging Markets Debt", "weight": 9.5},
            {"sector": "Government / Treasury", "weight": 9.9}
        ],
        "top_holdings": ["US Treasury Bonds", "Fannie Mae MBS", "Freddie Mac MBS", "PIMCO Short-Term Floating Fund", "Ginnie Mae MBS"]
    },
    "BIAWX": {
        "symbol": "BIAWX",
        "name": "BlackRock Advantage Large Cap Growth Fund",
        "market": "US",
        "category": "Equity Growth / Large Cap (Quant)",
        "nav": 22.80,
        "change_pct": 0.48,
        "aum": 18_500_000_000,
        "expense_ratio": 0.72,
        "sharpe_ratio": 1.15,
        "risk_profile": "High",
        "returns_1y": 29.85,
        "returns_3y": 9.10,
        "returns_5y": 15.40,
        "allocation": {"Equity": 98.5, "Debt": 0.0, "Cash": 1.5},
        "top_sectors": [
            {"sector": "Technology", "weight": 38.5},
            {"sector": "Consumer Cyclical", "weight": 13.4},
            {"sector": "Communication Services", "weight": 12.8},
            {"sector": "Healthcare", "weight": 11.2},
            {"sector": "Financials", "weight": 8.9}
        ],
        "top_holdings": ["NVIDIA Corp", "Microsoft Corp", "Alphabet Inc", "Amazon.com Inc", "Tesla Inc"]
    },
    # ─────────────── INDIA FUNDS ───────────────
    "PPFAS": {
        "symbol": "PPFAS",
        "name": "Parag Parikh Flexi Cap Fund Direct Growth",
        "market": "IN",
        "category": "Equity / Flexi Cap (Active)",
        "nav": 84.12,
        "change_pct": 0.65,
        "aum": 685_000_000_000,  # 68,500 Crores
        "expense_ratio": 0.58,
        "sharpe_ratio": 1.45,
        "risk_profile": "High",
        "returns_1y": 27.84,
        "returns_3y": 18.42,
        "returns_5y": 21.15,
        "allocation": {"Equity": 88.5, "Debt": 0.0, "Cash": 11.5},
        "top_sectors": [
            {"sector": "Financial Services", "weight": 25.8},
            {"sector": "Technology", "weight": 16.2},
            {"sector": "Consumer Defensive", "weight": 14.5},
            {"sector": "Automobile", "weight": 9.4},
            {"sector": "Foreign Equities (US)", "weight": 12.6}
        ],
        "top_holdings": ["HDFC Bank", "ICICI Bank", "Power Grid Corp", "Alphabet Inc", "ITC Limited"]
    },
    "SBIBLUE": {
        "symbol": "SBIBLUE",
        "name": "SBI Bluechip Fund Direct Growth",
        "market": "IN",
        "category": "Equity / Large Cap (Active)",
        "nav": 92.45,
        "change_pct": 0.42,
        "aum": 462_000_000_000,  # 46,200 Crores
        "expense_ratio": 0.82,
        "sharpe_ratio": 0.95,
        "risk_profile": "Moderate-High",
        "returns_1y": 21.20,
        "returns_3y": 13.90,
        "returns_5y": 15.60,
        "allocation": {"Equity": 96.2, "Debt": 0.0, "Cash": 3.8},
        "top_sectors": [
            {"sector": "Financial Services", "weight": 29.5},
            {"sector": "Automobile", "weight": 11.4},
            {"sector": "Capital Goods", "weight": 10.8},
            {"sector": "Technology", "weight": 8.4},
            {"sector": "Oil & Gas", "weight": 7.9}
        ],
        "top_holdings": ["HDFC Bank", "ICICI Bank", "Larsen & Toubro", "Reliance Industries", "Infosys"]
    },
    "HDFCMID": {
        "symbol": "HDFCMID",
        "name": "HDFC Mid-Cap Opportunities Fund Direct Growth",
        "market": "IN",
        "category": "Equity / Mid Cap (Active)",
        "nav": 162.80,
        "change_pct": 0.85,
        "aum": 654_000_000_000,  # 65,400 Crores
        "expense_ratio": 0.74,
        "sharpe_ratio": 1.35,
        "risk_profile": "High",
        "returns_1y": 38.40,
        "returns_3y": 22.80,
        "returns_5y": 24.10,
        "allocation": {"Equity": 94.8, "Debt": 0.0, "Cash": 5.2},
        "top_sectors": [
            {"sector": "Capital Goods", "weight": 18.5},
            {"sector": "Financial Services", "weight": 16.2},
            {"sector": "Healthcare", "weight": 10.9},
            {"sector": "Chemicals", "weight": 9.4},
            {"sector": "Automobile", "weight": 8.1}
        ],
        "top_holdings": ["Tata Technologies", "Max Financial Services", "Indian Hotels", "Bharat Electronics", "Cholamandalam Investment"]
    },
    "ICICIDEBT": {
        "symbol": "ICICIDEBT",
        "name": "ICICI Prudential All Seasons Bond Fund Direct Growth",
        "market": "IN",
        "category": "Fixed Income / Debt Hybrid",
        "nav": 36.12,
        "change_pct": 0.02,
        "aum": 118_000_000_000,  # 11,800 Crores
        "expense_ratio": 0.35,
        "sharpe_ratio": 0.85,
        "risk_profile": "Low-Moderate",
        "returns_1y": 7.80,
        "returns_3y": 6.90,
        "returns_5y": 7.40,
        "allocation": {"Equity": 0.0, "Debt": 85.4, "Cash": 14.6},
        "top_sectors": [
            {"sector": "Government Securities", "weight": 48.5},
            {"sector": "Corporate Bonds", "weight": 26.4},
            {"sector": "Treasury Bills", "weight": 10.5},
            {"sector": "Commercial Paper", "weight": 9.1},
            {"sector": "Cash Equivalents", "weight": 5.5}
        ],
        "top_holdings": ["7.26% GOI Bond 2033", "7.18% GOI Bond 2033", "HDFC Bank NCDs", "NABARD Bonds", "Small Industries Dev Bank NCDs"]
    },
    "MIRAELC": {
        "symbol": "MIRAELC",
        "name": "Mirae Asset Large Cap Fund Direct Growth",
        "market": "IN",
        "category": "Equity / Large Cap (Active)",
        "nav": 108.45,
        "change_pct": 0.55,
        "aum": 378_000_000_000,  # 37,800 Crores
        "expense_ratio": 0.54,
        "sharpe_ratio": 1.08,
        "risk_profile": "Moderate-High",
        "returns_1y": 23.60,
        "returns_3y": 14.80,
        "returns_5y": 16.90,
        "allocation": {"Equity": 97.5, "Debt": 0.0, "Cash": 2.5},
        "top_sectors": [
            {"sector": "Financial Services", "weight": 31.2},
            {"sector": "Technology", "weight": 14.8},
            {"sector": "Consumer Goods", "weight": 11.4},
            {"sector": "Healthcare", "weight": 9.5},
            {"sector": "Automobile", "weight": 8.2}
        ],
        "top_holdings": ["HDFC Bank", "ICICI Bank", "Infosys", "Reliance Industries", "Tata Consultancy Services"]
    },
    "AXISSMALL": {
        "symbol": "AXISSMALL",
        "name": "Axis Small Cap Fund Direct Growth",
        "market": "IN",
        "category": "Equity / Small Cap (Active)",
        "nav": 98.30,
        "change_pct": 1.12,
        "aum": 212_000_000_000,  # 21,200 Crores
        "expense_ratio": 0.49,
        "sharpe_ratio": 1.55,
        "risk_profile": "Very High",
        "returns_1y": 42.80,
        "returns_3y": 26.40,
        "returns_5y": 28.70,
        "allocation": {"Equity": 93.5, "Debt": 0.0, "Cash": 6.5},
        "top_sectors": [
            {"sector": "Capital Goods", "weight": 20.8},
            {"sector": "Healthcare", "weight": 15.4},
            {"sector": "Consumer Cyclical", "weight": 12.8},
            {"sector": "Technology", "weight": 10.5},
            {"sector": "Chemicals", "weight": 9.1}
        ],
        "top_holdings": ["Narayana Hrudayalaya", "Carborundum Universal", "Samara Capital Partners", "Garware Technical Fibres", "Cera Sanitaryware"]
    },
    "KOTAKMID": {
        "symbol": "KOTAKMID",
        "name": "Kotak Emerging Equity Fund Direct Growth",
        "market": "IN",
        "category": "Equity / Mid Cap (Active)",
        "nav": 122.70,
        "change_pct": 0.78,
        "aum": 484_000_000_000,  # 48,400 Crores
        "expense_ratio": 0.38,
        "sharpe_ratio": 1.28,
        "risk_profile": "High",
        "returns_1y": 36.20,
        "returns_3y": 21.50,
        "returns_5y": 23.40,
        "allocation": {"Equity": 95.1, "Debt": 0.0, "Cash": 4.9},
        "top_sectors": [
            {"sector": "Financial Services", "weight": 17.8},
            {"sector": "Healthcare", "weight": 14.2},
            {"sector": "Capital Goods", "weight": 13.5},
            {"sector": "Consumer Cyclical", "weight": 11.8},
            {"sector": "Chemicals", "weight": 10.2}
        ],
        "top_holdings": ["Persistent Systems", "AU Small Finance Bank", "Sona BLW Precision Forgings", "Voltas Ltd", "Alkem Laboratories"]
    },
    "NIPNIFTY": {
        "symbol": "NIPNIFTY",
        "name": "Nippon India Index Fund Nifty 50 Direct Growth",
        "market": "IN",
        "category": "Index Fund / Large Cap",
        "nav": 34.55,
        "change_pct": 0.38,
        "aum": 156_000_000_000,  # 15,600 Crores
        "expense_ratio": 0.20,
        "sharpe_ratio": 0.98,
        "risk_profile": "Moderate-High",
        "returns_1y": 19.80,
        "returns_3y": 12.50,
        "returns_5y": 15.10,
        "allocation": {"Equity": 99.8, "Debt": 0.0, "Cash": 0.2},
        "top_sectors": [
            {"sector": "Financial Services", "weight": 36.5},
            {"sector": "Technology", "weight": 13.2},
            {"sector": "Oil & Gas", "weight": 11.8},
            {"sector": "Consumer Goods", "weight": 8.5},
            {"sector": "Automobile", "weight": 7.4}
        ],
        "top_holdings": ["HDFC Bank", "Reliance Industries", "ICICI Bank", "Infosys", "Tata Consultancy Services"]
    },
    "DSPSMALL": {
        "symbol": "DSPSMALL",
        "name": "DSP Small Cap Fund Direct Growth",
        "market": "IN",
        "category": "Equity / Small Cap (Active)",
        "nav": 185.40,
        "change_pct": 0.95,
        "aum": 148_000_000_000,  # 14,800 Crores
        "expense_ratio": 0.64,
        "sharpe_ratio": 1.42,
        "risk_profile": "Very High",
        "returns_1y": 40.10,
        "returns_3y": 25.80,
        "returns_5y": 26.50,
        "allocation": {"Equity": 91.8, "Debt": 0.0, "Cash": 8.2},
        "top_sectors": [
            {"sector": "Capital Goods", "weight": 22.4},
            {"sector": "Chemicals", "weight": 16.8},
            {"sector": "Consumer Cyclical", "weight": 14.5},
            {"sector": "Healthcare", "weight": 12.2},
            {"sector": "Technology", "weight": 9.8}
        ],
        "top_holdings": ["Welspun Enterprises", "Tata Elxsi", "Balrampur Chini Mills", "Safari Industries", "Bharat Dynamics"]
    },
    "TATAMID": {
        "symbol": "TATAMID",
        "name": "Tata Mid Cap Growth Fund Direct Growth",
        "market": "IN",
        "category": "Equity / Mid Cap (Active)",
        "nav": 342.85,
        "change_pct": 0.72,
        "aum": 68_000_000_000,  # 6,800 Crores
        "expense_ratio": 0.59,
        "sharpe_ratio": 1.22,
        "risk_profile": "High",
        "returns_1y": 33.40,
        "returns_3y": 20.10,
        "returns_5y": 22.80,
        "allocation": {"Equity": 96.2, "Debt": 0.0, "Cash": 3.8},
        "top_sectors": [
            {"sector": "Consumer Cyclical", "weight": 18.2},
            {"sector": "Financial Services", "weight": 15.8},
            {"sector": "Technology", "weight": 14.5},
            {"sector": "Healthcare", "weight": 12.1},
            {"sector": "Capital Goods", "weight": 11.4}
        ],
        "top_holdings": ["Indian Hotels", "Mphasis Ltd", "Astral Poly Technik", "Blue Dart Express", "Crompton Greaves Consumer"]
    },
    "UTINIFTY": {
        "symbol": "UTINIFTY",
        "name": "UTI Nifty 50 Index Fund Direct Growth",
        "market": "IN",
        "category": "Index Fund / Large Cap",
        "nav": 128.90,
        "change_pct": 0.36,
        "aum": 192_000_000_000,  # 19,200 Crores
        "expense_ratio": 0.18,
        "sharpe_ratio": 0.97,
        "risk_profile": "Moderate-High",
        "returns_1y": 19.70,
        "returns_3y": 12.40,
        "returns_5y": 15.00,
        "allocation": {"Equity": 99.9, "Debt": 0.0, "Cash": 0.1},
        "top_sectors": [
            {"sector": "Financial Services", "weight": 35.8},
            {"sector": "Technology", "weight": 13.5},
            {"sector": "Oil & Gas", "weight": 12.1},
            {"sector": "Consumer Goods", "weight": 8.8},
            {"sector": "Automobile", "weight": 7.6}
        ],
        "top_holdings": ["HDFC Bank", "Reliance Industries", "ICICI Bank", "Infosys", "Tata Consultancy Services"]
    },
    "SBIESG": {
        "symbol": "SBIESG",
        "name": "SBI Magnum ESG Fund Direct Growth",
        "market": "IN",
        "category": "Equity / ESG Thematic",
        "nav": 22.40,
        "change_pct": 0.48,
        "aum": 34_000_000_000,  # 3,400 Crores
        "expense_ratio": 0.88,
        "sharpe_ratio": 0.88,
        "risk_profile": "Moderate-High",
        "returns_1y": 18.90,
        "returns_3y": 11.50,
        "returns_5y": 14.20,
        "allocation": {"Equity": 98.1, "Debt": 0.0, "Cash": 1.9},
        "top_sectors": [
            {"sector": "Financial Services", "weight": 27.5},
            {"sector": "Technology", "weight": 18.4},
            {"sector": "Healthcare", "weight": 14.2},
            {"sector": "Consumer Goods", "weight": 12.8},
            {"sector": "Industrials", "weight": 10.5}
        ],
        "top_holdings": ["Infosys", "HDFC Bank", "TCS", "Wipro", "Dr. Reddy's Laboratories"]
    },
    "NIPSMALL": {
        "symbol": "NIPSMALL",
        "name": "Nippon India Small Cap Fund Direct Growth",
        "market": "IN",
        "category": "Equity / Small Cap (Active)",
        "nav": 145.25,
        "change_pct": 1.05,
        "aum": 524_000_000_000,  # 52,400 Crores
        "expense_ratio": 0.68,
        "sharpe_ratio": 1.48,
        "risk_profile": "Very High",
        "returns_1y": 43.50,
        "returns_3y": 28.10,
        "returns_5y": 29.80,
        "allocation": {"Equity": 92.4, "Debt": 0.0, "Cash": 7.6},
        "top_sectors": [
            {"sector": "Capital Goods", "weight": 19.5},
            {"sector": "Consumer Cyclical", "weight": 15.8},
            {"sector": "Chemicals", "weight": 14.2},
            {"sector": "Financial Services", "weight": 12.4},
            {"sector": "Healthcare", "weight": 11.1}
        ],
        "top_holdings": ["KPIT Technologies", "Tube Investments of India", "Multi Commodity Exchange", "Nippon Life India AMC", "CG Power & Industrial"]
    },
    "HDFCTOP100": {
        "symbol": "HDFCTOP100",
        "name": "HDFC Top 100 Fund Direct Growth",
        "market": "IN",
        "category": "Equity / Large Cap (Active)",
        "nav": 987.50,
        "change_pct": 0.50,
        "aum": 342_000_000_000,  # 34,200 Crores
        "expense_ratio": 0.95,
        "sharpe_ratio": 0.92,
        "risk_profile": "Moderate-High",
        "returns_1y": 20.80,
        "returns_3y": 13.20,
        "returns_5y": 15.10,
        "allocation": {"Equity": 97.8, "Debt": 0.0, "Cash": 2.2},
        "top_sectors": [
            {"sector": "Financial Services", "weight": 32.4},
            {"sector": "Technology", "weight": 12.8},
            {"sector": "Oil & Gas", "weight": 11.5},
            {"sector": "Consumer Goods", "weight": 9.2},
            {"sector": "Capital Goods", "weight": 8.1}
        ],
        "top_holdings": ["HDFC Bank", "ICICI Bank", "Reliance Industries", "Infosys", "Tata Consultancy Services"]
    },
    "ICICIPRU": {
        "symbol": "ICICIPRU",
        "name": "ICICI Prudential Bluechip Fund Direct Growth",
        "market": "IN",
        "category": "Equity / Large Cap (Active)",
        "nav": 112.35,
        "change_pct": 0.44,
        "aum": 512_000_000_000,  # 51,200 Crores
        "expense_ratio": 0.87,
        "sharpe_ratio": 1.02,
        "risk_profile": "Moderate-High",
        "returns_1y": 22.40,
        "returns_3y": 14.60,
        "returns_5y": 16.40,
        "allocation": {"Equity": 96.8, "Debt": 0.0, "Cash": 3.2},
        "top_sectors": [
            {"sector": "Financial Services", "weight": 30.8},
            {"sector": "Oil & Gas", "weight": 12.4},
            {"sector": "Technology", "weight": 11.8},
            {"sector": "Consumer Goods", "weight": 9.5},
            {"sector": "Automobile", "weight": 8.7}
        ],
        "top_holdings": ["HDFC Bank", "ICICI Bank", "Reliance Industries", "Infosys", "Bharti Airtel"]
    },
    "AXISLONG": {
        "symbol": "AXISLONG",
        "name": "Axis Long Term Equity Fund Direct Growth",
        "market": "IN",
        "category": "Equity / ELSS Tax Saving",
        "nav": 78.90,
        "change_pct": 0.58,
        "aum": 318_000_000_000,  # 31,800 Crores
        "expense_ratio": 0.75,
        "sharpe_ratio": 1.15,
        "risk_profile": "High",
        "returns_1y": 25.80,
        "returns_3y": 16.40,
        "returns_5y": 18.60,
        "allocation": {"Equity": 97.2, "Debt": 0.0, "Cash": 2.8},
        "top_sectors": [
            {"sector": "Financial Services", "weight": 28.5},
            {"sector": "Consumer Goods", "weight": 14.8},
            {"sector": "Technology", "weight": 13.2},
            {"sector": "Healthcare", "weight": 11.5},
            {"sector": "Capital Goods", "weight": 9.8}
        ],
        "top_holdings": ["HDFC Bank", "Bajaj Finance", "Kotak Mahindra Bank", "Avenue Supermarts", "Pidilite Industries"]
    },
    "MIRAE_EMERG": {
        "symbol": "MIRAE_EMERG",
        "name": "Mirae Asset Emerging Bluechip Fund Direct Growth",
        "market": "IN",
        "category": "Equity / Large & Mid Cap (Active)",
        "nav": 138.60,
        "change_pct": 0.68,
        "aum": 296_000_000_000,  # 29,600 Crores
        "expense_ratio": 0.62,
        "sharpe_ratio": 1.38,
        "risk_profile": "High",
        "returns_1y": 30.20,
        "returns_3y": 19.80,
        "returns_5y": 22.10,
        "allocation": {"Equity": 95.5, "Debt": 0.0, "Cash": 4.5},
        "top_sectors": [
            {"sector": "Financial Services", "weight": 22.8},
            {"sector": "Healthcare", "weight": 14.5},
            {"sector": "Technology", "weight": 13.8},
            {"sector": "Consumer Cyclical", "weight": 12.4},
            {"sector": "Capital Goods", "weight": 11.1}
        ],
        "top_holdings": ["HDFC Bank", "ICICI Bank", "Cholamandalam Investment", "Persistent Systems", "Indian Hotels"]
    },
    "KOTAKNIFTY": {
        "symbol": "KOTAKNIFTY",
        "name": "Kotak Nifty 50 Index Fund Direct Growth",
        "market": "IN",
        "category": "Index Fund / Large Cap",
        "nav": 182.45,
        "change_pct": 0.37,
        "aum": 88_000_000_000,  # 8,800 Crores
        "expense_ratio": 0.20,
        "sharpe_ratio": 0.96,
        "risk_profile": "Moderate-High",
        "returns_1y": 19.60,
        "returns_3y": 12.30,
        "returns_5y": 14.90,
        "allocation": {"Equity": 99.6, "Debt": 0.0, "Cash": 0.4},
        "top_sectors": [
            {"sector": "Financial Services", "weight": 36.2},
            {"sector": "Technology", "weight": 13.8},
            {"sector": "Oil & Gas", "weight": 11.5},
            {"sector": "Consumer Goods", "weight": 8.6},
            {"sector": "Automobile", "weight": 7.4}
        ],
        "top_holdings": ["HDFC Bank", "Reliance Industries", "ICICI Bank", "Infosys", "Tata Consultancy Services"]
    },
    "SBIHYBRID": {
        "symbol": "SBIHYBRID",
        "name": "SBI Equity Hybrid Fund Direct Growth",
        "market": "IN",
        "category": "Balanced / Hybrid (Aggressive)",
        "nav": 284.60,
        "change_pct": 0.35,
        "aum": 624_000_000_000,  # 62,400 Crores
        "expense_ratio": 0.76,
        "sharpe_ratio": 1.10,
        "risk_profile": "Moderate",
        "returns_1y": 18.50,
        "returns_3y": 12.80,
        "returns_5y": 15.30,
        "allocation": {"Equity": 74.5, "Debt": 22.8, "Cash": 2.7},
        "top_sectors": [
            {"sector": "Financial Services", "weight": 26.4},
            {"sector": "Technology", "weight": 11.8},
            {"sector": "Consumer Goods", "weight": 9.5},
            {"sector": "Healthcare", "weight": 8.2},
            {"sector": "Oil & Gas", "weight": 7.8}
        ],
        "top_holdings": ["HDFC Bank", "ICICI Bank", "Infosys", "Reliance Industries", "Larsen & Toubro"]
    },
}

@router.get("/list")
def list_funds():
    return [
        {
            "symbol": f["symbol"],
            "name": f["name"],
            "market": f["market"],
            "category": f["category"],
            "nav": f["nav"],
            "change_pct": f["change_pct"],
            "risk_profile": f["risk_profile"]
        } for f in MUTUAL_FUNDS_DB.values()
    ]

def fetch_and_parse_mutual_fund(symbol: str) -> dict:
    import math
    
    def clean_float(val: Any, default: float = 0.0) -> float:
        try:
            if val is None or pd.isna(val):
                return default
            fval = float(val)
            if math.isnan(fval) or math.isinf(fval):
                return default
            return fval
        except (ValueError, TypeError):
            return default

    symbol_upper = symbol.upper()
    ticker = yf.Ticker(symbol_upper)
    info = ticker.info
    
    if not info or ('longName' not in info and 'shortName' not in info):
        raise ValueError(f"Could not find mutual fund with symbol {symbol_upper}")
        
    # Check market
    is_indian = symbol_upper.endswith(".NS") or symbol_upper.endswith(".BO") or symbol_upper in ["PPFAS", "SBIBLUE", "HDFCMID", "ICICIDEBT", "MIRAELC", "AXISSMALL", "KOTAKMID", "NIPNIFTY", "DSPSMALL", "TATAMID", "UTINIFTY", "SBIESG", "NIPSMALL", "HDFCTOP100", "ICICIPRU", "AXISLONG", "MIRAE_EMERG", "KOTAKNIFTY", "SBIHYBRID"]
    market = "IN" if is_indian else "US"
    
    name = info.get('longName') or info.get('shortName') or symbol_upper
    category = info.get('category') or info.get('fundFamily') or "Mutual Fund"
    nav = info.get('regularMarketPrice') or info.get('previousClose') or 10.0
    aum = info.get('totalAssets') or info.get('netAssets') or 100_000_000
    
    # Expense Ratio conversion
    expense_ratio = info.get('annualReportExpenseRatio') or info.get('netExpenseRatio') or 0.005
    if expense_ratio < 0.1:
        expense_ratio = expense_ratio * 100
    expense_ratio = round(expense_ratio, 2)
    
    df = ticker.history(period="5y")
    
    # Default returns
    returns_1y = 12.0
    returns_2y = 10.0
    returns_3y = 8.0
    returns_5y = 9.0
    change_pct = 0.0
    sharpe_ratio = 1.0
    risk_profile = "Moderate"
    
    if not df.empty and len(df) >= 2:
        latest_price = df['Close'].iloc[-1]
        latest_date = df.index[-1]
        total_days = (latest_date - df.index[0]).days
        
        prev_price = df['Close'].iloc[-2]
        if prev_price > 0:
            change_pct = round(((latest_price - prev_price) / prev_price) * 100, 2)
        
        # 1-Year (365 days, margin of 7 days)
        try:
            if total_days >= 358:
                target_date_1y = latest_date - pd.DateOffset(years=1)
                idx_1y = abs(df.index - target_date_1y).values.argmin()
                price_1y = df['Close'].iloc[idx_1y]
                if price_1y > 0:
                    returns_1y = round(((latest_price - price_1y) / price_1y) * 100, 2)
        except Exception:
            pass
            
        # 2-Year (730 days, margin of 7 days)
        try:
            if total_days >= 723:
                target_date_2y = latest_date - pd.DateOffset(years=2)
                idx_2y = abs(df.index - target_date_2y).values.argmin()
                price_2y = df['Close'].iloc[idx_2y]
                if price_2y > 0 and latest_price / price_2y > 0:
                    returns_2y = round(((latest_price / price_2y) ** (1 / 2) - 1) * 100, 2)
        except Exception:
            pass
            
        # 3-Year (1095 days, margin of 7 days)
        try:
            if total_days >= 1088:
                target_date_3y = latest_date - pd.DateOffset(years=3)
                idx_3y = abs(df.index - target_date_3y).values.argmin()
                price_3y = df['Close'].iloc[idx_3y]
                if price_3y > 0 and latest_price / price_3y > 0:
                    returns_3y = round(((latest_price / price_3y) ** (1 / 3) - 1) * 100, 2)
        except Exception:
            pass
            
        # 5-Year (1825 days, margin of 15 days)
        try:
            if total_days >= 1810:
                target_date_5y = latest_date - pd.DateOffset(years=5)
                idx_5y = abs(df.index - target_date_5y).values.argmin()
                price_5y = df['Close'].iloc[idx_5y]
                if price_5y > 0 and latest_price / price_5y > 0:
                    returns_5y = round(((latest_price / price_5y) ** (1 / 5) - 1) * 100, 2)
        except Exception:
            pass
            
        try:
            daily_returns = df['Close'].pct_change().dropna()
            volatility = daily_returns.std() * (252 ** 0.5)
            mean_return = daily_returns.mean() * 252
            if volatility > 0:
                sharpe_ratio = round((mean_return - 0.03) / volatility, 2)
            
            vol_pct = volatility * 100
            if vol_pct < 8.0:
                risk_profile = "Low"
            elif vol_pct < 14.0:
                risk_profile = "Moderate"
            elif vol_pct < 20.0:
                risk_profile = "Moderate-High"
            else:
                risk_profile = "High"
        except Exception:
            pass
            
    allocation = {"Equity": 60.0, "Debt": 30.0, "Cash": 10.0}
    top_sectors = []
    top_holdings = []
    
    try:
        fd = ticker.funds_data
        if fd is not None:
            ac = fd.asset_classes
            if ac:
                allocation = {
                    "Equity": round(clean_float(ac.get('stockPosition'), 0.6) * 100, 1),
                    "Debt": round(clean_float(ac.get('bondPosition'), 0.3) * 100, 1),
                    "Cash": round(clean_float(ac.get('cashPosition'), 0.1) * 100, 1)
                }
                if sum(allocation.values()) == 0:
                    allocation = {"Equity": 60.0, "Debt": 30.0, "Cash": 10.0}
                    
            sw = fd.sector_weightings
            if sw:
                sector_mapping = {
                    "technology": "Technology",
                    "financial_services": "Financial Services",
                    "healthcare": "Healthcare",
                    "consumer_cyclical": "Consumer Cyclical",
                    "consumer_defensive": "Consumer Defensive",
                    "utilities": "Utilities",
                    "industrials": "Industrials",
                    "energy": "Energy",
                    "basic_materials": "Basic Materials",
                    "realestate": "Real Estate",
                    "communication_services": "Communication Services"
                }
                for sec_key, weight in sw.items():
                    w_val = clean_float(weight, 0.0)
                    if w_val > 0:
                        name_mapped = sector_mapping.get(sec_key, sec_key.replace('_', ' ').capitalize())
                        top_sectors.append({
                            "sector": name_mapped,
                            "weight": round(w_val * 100, 1)
                        })
                top_sectors = sorted(top_sectors, key=lambda x: x['weight'], reverse=True)[:5]
                
            th = fd.top_holdings
            if th is not None and not th.empty:
                names = th["Name"].tolist() if "Name" in th.columns else []
                top_holdings = [n for n in names if n][:5]
    except Exception:
        pass
        
    if not top_sectors:
        top_sectors = [
            {"sector": "Technology", "weight": 35.0},
            {"sector": "Financials", "weight": 25.0},
            {"sector": "Healthcare", "weight": 15.0},
            {"sector": "Consumer Cyclical", "weight": 15.0},
            {"sector": "Industrials", "weight": 10.0}
        ]
    if not top_holdings:
        top_holdings = ["Microsoft Corp", "Apple Inc", "NVIDIA Corp", "Amazon.com Inc", "Alphabet Inc"]
        
    return {
        "symbol": symbol_upper,
        "name": name,
        "market": market,
        "category": category,
        "nav": round(clean_float(nav, 10.0), 2),
        "change_pct": round(clean_float(change_pct, 0.0), 2),
        "aum": int(clean_float(aum, 100_000_000)),
        "expense_ratio": round(clean_float(expense_ratio, 0.50), 2),
        "sharpe_ratio": round(clean_float(sharpe_ratio, 1.0), 2),
        "risk_profile": risk_profile,
        "returns_1y": round(clean_float(returns_1y, 12.0), 2),
        "returns_2y": round(clean_float(returns_2y, 10.0), 2),
        "returns_3y": round(clean_float(returns_3y, 8.0), 2),
        "returns_5y": round(clean_float(returns_5y, 9.0), 2),
        "allocation": allocation,
        "top_sectors": top_sectors,
        "top_holdings": top_holdings
    }

@router.get("/{symbol}/analysis")
def analyze_fund(symbol: str):
    sym = symbol.upper()
    if sym not in MUTUAL_FUNDS_DB:
        try:
            fund_data = fetch_and_parse_mutual_fund(sym)
            MUTUAL_FUNDS_DB[sym] = fund_data
        except Exception as e:
            raise HTTPException(status_code=404, detail=f"Mutual fund symbol not found and failed to fetch from Yahoo Finance: {str(e)}")
            
    fund = MUTUAL_FUNDS_DB[sym]
    
    # Ensure returns_2y exists (interpolate for seed funds)
    if "returns_2y" not in fund:
        r1 = fund.get("returns_1y", 10.0)
        r3 = fund.get("returns_3y", 8.0)
        fund["returns_2y"] = round((r1 + r3) / 2.0, 2)
        
    expense_ratio = fund["expense_ratio"]
    sharpe_ratio = fund["sharpe_ratio"]
    returns_5y = fund["returns_5y"]
    
    stars = 3
    recommendation = "Hold"
    reasons = []
    
    # 1. Analyze expense ratio
    if expense_ratio <= 0.10:
        reasons.append(f"Ultra-low expense ratio of {expense_ratio}% keeps transaction costs minimal.")
    elif expense_ratio <= 0.60:
        reasons.append(f"Reasonable active-management expense fee benchmark of {expense_ratio}%.")
    else:
        reasons.append(f"Relatively higher expense ratio of {expense_ratio}%. Monitor active performance vs index benchmarks.")
        
    # 2. Analyze Sharpe ratio
    if sharpe_ratio >= 1.2:
        reasons.append(f"Outstanding risk-adjusted performance with an active Sharpe ratio of {sharpe_ratio}x.")
        stars += 1
    elif sharpe_ratio >= 0.8:
        reasons.append(f"Healthy risk-reward parameters with an active Sharpe ratio of {sharpe_ratio}x.")
    else:
        reasons.append(f"Lower risk-adjusted rating (Sharpe ratio of {sharpe_ratio}x). Returns might carry excess volatility.")
        stars -= 1
        
    # 3. Analyze returns
    if returns_5y >= 15.0:
        reasons.append(f"Stellar long-term compound annual growth rate of {returns_5y}% over 5 years.")
        stars += 1
    elif returns_5y >= 8.0:
        reasons.append(f"Steady mid-to-high single digit long-term returns ({returns_5y}% annualized).")
    else:
        reasons.append(f"Conservative growth parameters. Fund aims to preserve capital and provide liquidity ({returns_5y}% returns).")
        
    if stars >= 5:
        stars = 5
        recommendation = "Strong Buy"
    elif stars == 4:
        recommendation = "Buy"
    elif stars == 3:
        recommendation = "Hold"
    else:
        stars = max(1, stars)
        recommendation = "Avoid"
        
    return {
        **fund,
        "ai_recommendation": {
            "stars": stars,
            "recommendation": recommendation,
            "reasons": reasons
        }
    }
