# 🌍 TravelFi — Decentralized Travel Booking & Savings Platform

> **Experiment 1**: Building an Advanced DApp using React and Ethers.js

A full-stack Decentralized Application (DApp) that lets travelers book trips via smart-contract escrow and save toward future trips through an ERC-4626 Savings Vault — all without a centralized intermediary.

---

## 📋 Problem Statement

Traditional travel booking platforms (OTAs, travel agencies) act as centralized intermediaries:
- They hold the traveler's payment in their own accounts
- Decide unilaterally when to release funds to hotels/airlines/tour operators
- Charge high commissions
- Resolve disputes according to their own internal policy — with no transparency

**TravelFi solves this** by using smart-contract escrow: funds are released to the travel provider only on confirmed trip completion, or refunded to the traveler on cancellation.

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────┐
│                   React.js Frontend                       │
│          (Vite + Ethers.js v6 + MetaMask)                │
├──────────────────────────────────────────────────────────┤
│                     Ethers.js v6                          │
│           (BrowserProvider / Contract / Signer)           │
├──────────────────────────────────────────────────────────┤
│                  MetaMask Wallet                          │
│            (Injected Provider / Signer)                   │
├──────────────────────────────────────────────────────────┤
│              Ethereum Blockchain                          │
│     (Remix VM / Sepolia / Polygon Testnet)               │
│                                                           │
│   ┌───────────────────────────────────────────────────┐  │
│   │        TravelBookingEscrow.sol                     │  │
│   │   • createBooking(provider) payable                │  │
│   │   • confirmCompletion(bookingId)                   │  │
│   │   • cancelBooking(bookingId)                       │  │
│   │   • getBookingDetails(bookingId)                   │  │
│   └───────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

---

## 🎯 Main Functions

| # | Function | Description |
|---|----------|-------------|
| 1 | **Connect Wallet** | Connect MetaMask to the DApp |
| 2 | **Create Booking** | Deposit ETH into escrow for a trip |
| 3 | **Confirm Completion** | Release escrowed funds to the provider |
| 4 | **Cancel Booking** | Refund escrowed funds to the traveler |
| 5 | **View Booking** | Look up booking details by ID |
| 6 | **Savings Vault Deposit** | Deposit into ERC-4626 Travel Savings Vault |
| 7 | **Savings Vault Withdraw** | Withdraw from the vault |
| 8 | **Set Travel Goal** | Set a savings goal and track progress |
| 9 | **Booking History** | View all past bookings |

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Smart Contract | Solidity ^0.8.20 |
| Contract IDE | Remix IDE |
| Frontend | React.js (Vite) |
| Blockchain Library | Ethers.js v6 |
| Wallet | MetaMask |
| Network | Remix VM → Sepolia Testnet |

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** v18+ and npm
- **MetaMask** browser extension
- **Remix IDE** (https://remix.ethereum.org)

### Part A — Deploy the Smart Contract

1. Open [Remix IDE](https://remix.ethereum.org)
2. Create a new file `TravelBookingEscrow.sol` and paste the contract from `/contracts/TravelBookingEscrow.sol`
3. Compile with Solidity **0.8.20**
4. Deploy using:
   - **Remix VM** (for local testing), or
   - **Injected Provider – MetaMask** (for Sepolia testnet — needs test ETH from a [faucet](https://sepoliafaucet.com))
5. Copy the **deployed contract address**
6. Copy the **ABI** from the compiler tab

### Part B — Run the Frontend

```bash
# 1. Clone the repository
git clone https://github.com/dolly-balwani/TravelFi.git
cd TravelFi

# 2. Install dependencies
npm install

# 3. Update contract address
#    Edit src/contractInfo.js and paste your deployed address

# 4. Start the development server
npm run dev

# 5. Open http://localhost:5173 in your browser
```

### Part C — Test the DApp

1. Click **Connect MetaMask** and approve the connection
2. Enter a provider address and ETH amount → click **Book & Pay Escrow**
3. Approve the transaction in MetaMask
4. Enter the Booking ID → click **View Booking** to see details
5. Click **Confirm Trip Completed** to release funds, or **Cancel** to refund
6. Switch to the **Savings Vault** tab to deposit/withdraw and set savings goals
7. Check the **Booking History** tab for all past bookings

---

## 📁 Project Structure

```
TravelFi/
├── contracts/
│   └── TravelBookingEscrow.sol   # Solidity smart contract
├── src/
│   ├── App.jsx                    # Main DApp component
│   ├── contractInfo.js            # Contract ABI & deployed address
│   ├── index.css                  # Design system & global styles
│   └── main.jsx                   # React entry point
├── index.html                     # HTML entry with SEO meta tags
├── package.json                   # Dependencies & scripts
├── vite.config.js                 # Vite configuration
├── .gitignore
└── README.md
```

---

## 📸 Screens

### Screen 1 — Book a Trip (Escrow)
- Enter provider address and ETH amount
- Create booking → funds deposited into smart-contract escrow
- View booking details → confirm completion or cancel

### Screen 2 — Travel Savings Vault
- Deposit mUSDC into ERC-4626 vault
- Set a travel savings goal
- Track progress with a visual progress bar
- Withdraw when ready

---

## 🔗 Smart Contract Interface

### TravelBookingEscrow

```solidity
function createBooking(address provider) external payable
function confirmCompletion(uint256 bookingId) external
function cancelBooking(uint256 bookingId) external
function getBookingDetails(uint256 bookingId) external view returns (Booking memory)
function getBookingCount() external view returns (uint256)
function getContractBalance() external view returns (uint256)
```

**Events:**
- `BookingCreated(bookingId, traveler, provider, amount)`
- `BookingCompleted(bookingId, provider, amount)`
- `BookingCancelled(bookingId, traveler, amount)`

---

## 📝 Observations

- Contract compiled successfully in Remix IDE with Solidity 0.8.20
- Contract deployed and all functions verified in Remix before frontend integration
- MetaMask wallet connected successfully to the React DApp
- Booking transactions were signed, mined, and confirmed on chain
- Escrow balance updates correctly after create/confirm/cancel operations
- The DApp UI provides real-time feedback via toast notifications

---

## ✅ Result

An advanced DApp for **TravelFi — Decentralized Travel Booking & Savings Platform** was successfully built by deploying a Solidity smart contract using Remix IDE and connecting it to a React.js frontend through the Ethers.js library. The DApp allows wallet connection via MetaMask and lets travelers create escrow-backed bookings, confirm trip completion, cancel bookings, save in a vault, and view booking history — demonstrating a complete client-to-blockchain interaction pipeline.

---

## 👥 Actors

| Actor | Role |
|-------|------|
| **Traveler** | Books trips, confirms/cancels, deposits into vault |
| **Travel Provider** | Receives escrowed funds on trip completion |
| **Admin / Owner** | Emergency operations (pause, cancel) |
| **Smart Contract** | Manages escrow, savings, token operations |

---

## 📄 License

MIT License
