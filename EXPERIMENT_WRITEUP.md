# TravelFi — Experiment 1: Building an Advanced DApp using React and Ethers.js

## DApp Design Sheet — TravelFi

---

## 1. Problem Statement / Application Scenario

Traditional travel booking platforms (OTAs, travel agencies) act as centralized intermediaries: they hold the traveler's payment in their own accounts, decide unilaterally when to release funds to hotels/airlines/tour operators, charge high commissions, and resolve disputes (cancellations, no-shows, service failures) according to their own internal policy — with no transparency and no participation from the traveler or provider community.

**Proposed Solution:**
TravelFi — a Decentralized Travel Booking & Savings Platform where travelers pay for bookings into a smart-contract escrow (funds released only on confirmed trip completion, or refunded on cancellation), save toward future trips through an ERC-4626 Travel Savings Vault, earn and spend a native Travel Token (TRVL) through an AMM/DEX, stake TRVL/LP tokens for loyalty rewards, and participate in DAO governance over platform fees, dispute-arbitration rules, and supported destinations — all without a centralized company holding or controlling traveler funds.

---

## 2. Actors

| Actor | Role |
|-------|------|
| **Traveler / User** | Books trips (escrow deposit), confirms/cancels bookings, deposits into the savings vault, swaps/stakes TRVL, votes on proposals |
| **Travel Provider** | Hotel, airline, or tour operator who receives escrowed funds once the traveler confirms trip completion |
| **Liquidity Provider** | Provides TRVL + USDC liquidity to the AMM pool and earns trading fees |
| **DAO Voter** | Votes on platform-level proposals (fee changes, arbitration policy, supported routes/destinations) |
| **Admin** | Handles permitted protocol and emergency operations (e.g., pausing in case of an exploit) |
| **Chainlink Oracle** | Provides external USD/local-currency price feeds for accurate booking pricing |
| **Smart Contracts** | Automatically manage escrow, savings, token issuance, governance, and DeFi operations |

---

## 3. Main Functions

| # | Function | Description |
|---|----------|-------------|
| 1 | Connect wallet | Using MetaMask / WalletConnect |
| 2 | Create a booking | Deposit payment into escrow |
| 3 | Confirm trip completion | Release escrowed funds to provider |
| 4 | Cancel a booking | Refund escrowed funds to traveler |
| 5 | Deposit USDC | Into the ERC-4626 Travel Savings Vault |
| 6 | Withdraw / redeem | Travel Savings Vault shares |
| 7 | View booking status | Vault balance, and savings-goal progress |
| 8 | Create and vote on DAO proposals | Fees, arbitration rules, destinations |
| 9 | Swap TRVL ↔ USDC | Through an AMM/DEX |
| 10 | Add / remove liquidity | To the TRVL/USDC pool |
| 11 | Receive LP Tokens | For providing liquidity |
| 12 | Stake LP Tokens | For loyalty rewards |
| 13 | Claim TRVL staking/loyalty rewards | Earned from staking |
| 14 | Fetch currency/asset prices | Using Chainlink |
| 15 | Flash-loan governance attack mitigation | Security measure |

---

## 4. Smart Contract Interface Planning

### TravelBookingEscrow

**Functions:**
- `createBooking(address provider)` — payable, deposits ETH into escrow
- `confirmCompletion(uint256 bookingId)` — releases funds to provider
- `cancelBooking(uint256 bookingId)` — refunds funds to traveler
- `getBookingDetails(uint256 bookingId)` — returns booking struct
- `getBookingCount()` — returns total bookings
- `getContractBalance()` — returns escrowed ETH balance

**State Variables:**
- `owner` — contract deployer
- `bookingCount` — auto-incrementing booking ID counter
- `bookings` — mapping of bookingId → Booking struct

**Events:**
- `BookingCreated(bookingId, traveler, provider, amount)`
- `BookingCompleted(bookingId, provider, amount)`
- `BookingCancelled(bookingId, traveler, amount)`

### TravelSavingsVault (ERC-4626)

**Functions:** deposit(), withdraw(), mint(), redeem(), totalAssets(), convertToShares(), convertToAssets(), setTravelGoal(), goalProgress()

**Events:** Deposit(), Withdraw(), TravelGoalSet()

### DAO Governance

**Functions:** createProposal(), vote(), executeProposal()

**Events:** ProposalCreated(), VoteCast(), ProposalExecuted()

### AMM / Staking (TRVL / USDC)

**Functions:** swap(), addLiquidity(), removeLiquidity(), stake(), unstake(), claimReward()

**Events:** Swap(), LiquidityAdded(), Staked(), RewardClaimed()

---

## 5. On-Chain vs Off-Chain Data

### On-Chain
- Booking records (traveler, provider, amount, status)
- Escrow fund transfers
- USDC deposits/withdrawals into the Savings Vault
- Vault share (tfvUSDC) balances
- TRVL token balances
- LP Token balances and staking information
- DAO proposals and votes
- Governance parameters
- Smart-contract transactions and events

### Off-Chain / Frontend
- Provider descriptions, trip itineraries, and photos
- Destination and travel-package descriptions
- Historical price/exchange-rate charts
- UI display information (labels, formatting, currency toggles)
- Cached/display data for faster loading

---

## 6. Network Choice

| Phase | Network | Rationale |
|-------|---------|-----------|
| Initial Development | Remix VM | Smart-contract development and function-level testing |
| Testing | Sepolia Testnet | MetaMask interaction and real testnet transactions |
| Later Deployment | Ethereum / Polygon Testnet | Lower gas costs for frequent travel-booking transactions |

---

## 7. Smart Contract Development

### 7.1 Creating the Smart Contract

The smart contract for the project is named **TravelBookingEscrow**. It contains the business logic required for escrow-based travel booking, trip confirmation, and booking cancellation. Remix IDE is used to write and compile the Solidity contract.

### 7.2 Compilation

The Solidity Compiler tab in Remix is used to select compiler version **0.8.20** compatible with the contract pragma and compile TravelBookingEscrow. The contract must compile successfully before deployment.

### 7.3 Deployment on Sepolia

For the actual DApp frontend, the contract is deployed using **Injected Provider – MetaMask**. MetaMask is configured for the Sepolia test network and the deployment transaction is confirmed using test ETH.

### 7.4 Contract Address and ABI

After deployment, the contract address and ABI are required by the React frontend. The contract address identifies the deployed smart contract on Sepolia, while the ABI describes its available functions and events.

### Smart Contract Code

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract TravelBookingEscrow {
    address public owner;
    uint256 public bookingCount;

    enum BookingStatus { Pending, Completed, Cancelled }

    struct Booking {
        uint256 id;
        address traveler;
        address provider;
        uint256 amount;
        BookingStatus status;
        uint256 createdAt;
    }

    mapping(uint256 => Booking) public bookings;

    event BookingCreated(
        uint256 indexed bookingId,
        address indexed traveler,
        address indexed provider,
        uint256 amount
    );
    event BookingCompleted(uint256 indexed bookingId, address indexed provider, uint256 amount);
    event BookingCancelled(uint256 indexed bookingId, address indexed traveler, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not the contract owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function createBooking(address provider) external payable {
        require(msg.value > 0, "Deposit must be greater than 0");
        require(provider != address(0), "Invalid provider address");
        require(provider != msg.sender, "Cannot book with yourself");

        bookingCount++;
        bookings[bookingCount] = Booking({
            id: bookingCount,
            traveler: msg.sender,
            provider: provider,
            amount: msg.value,
            status: BookingStatus.Pending,
            createdAt: block.timestamp
        });

        emit BookingCreated(bookingCount, msg.sender, provider, msg.value);
    }

    function confirmCompletion(uint256 bookingId) external {
        Booking storage booking = bookings[bookingId];
        require(booking.id != 0, "Booking does not exist");
        require(booking.status == BookingStatus.Pending, "Booking is not pending");
        require(msg.sender == booking.traveler, "Only the traveler can confirm completion");

        booking.status = BookingStatus.Completed;
        payable(booking.provider).transfer(booking.amount);

        emit BookingCompleted(bookingId, booking.provider, booking.amount);
    }

    function cancelBooking(uint256 bookingId) external {
        Booking storage booking = bookings[bookingId];
        require(booking.id != 0, "Booking does not exist");
        require(booking.status == BookingStatus.Pending, "Booking is not pending");
        require(
            msg.sender == booking.traveler || msg.sender == owner,
            "Only traveler or owner can cancel"
        );

        booking.status = BookingStatus.Cancelled;
        payable(booking.traveler).transfer(booking.amount);

        emit BookingCancelled(bookingId, booking.traveler, booking.amount);
    }

    function getBookingDetails(uint256 bookingId)
        external view returns (Booking memory)
    {
        require(bookings[bookingId].id != 0, "Booking does not exist");
        return bookings[bookingId];
    }

    function getBookingCount() external view returns (uint256) {
        return bookingCount;
    }

    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }
}
```

---

## 8. React and Ethers.js Frontend Implementation

### 8.1 Creating the React Project

The React project is created using Vite and Ethers.js is installed using npm.

```bash
npm create vite@latest travelfi-dapp -- --template react
cd travelfi-dapp
npm install
npm install ethers
```

### 8.2 Contract Configuration

A contract information file is maintained inside the `src` folder. It contains the deployed contract address and the ABI obtained from Remix.

```javascript
export const CONTRACT_ADDRESS = "0xPASTE_DEPLOYED_ADDRESS_HERE";
export const CONTRACT_ABI = [
  // ABI copied from TravelBookingEscrow
];
```

### 8.3 Connecting MetaMask

Ethers.js BrowserProvider is used to access the Ethereum provider injected by MetaMask. The `eth_requestAccounts` request asks the user to authorize the DApp to access the selected account.

```javascript
const provider = new BrowserProvider(window.ethereum);
const accounts = await provider.send("eth_requestAccounts", []);
setAccount(accounts[0]);
```

### 8.4 Creating the Contract Instance

The deployed contract address, ABI and either a provider or signer are supplied to the Ethers.js Contract object. Read-only operations use a provider, while write operations use a signer.

```javascript
const provider = new BrowserProvider(window.ethereum);
const signer = await provider.getSigner();
const contract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
```

### 8.5 Running the Frontend

```bash
npm run dev
```

The development server runs locally. The application is opened at **http://localhost:5173**. MetaMask must be connected to the same Sepolia network as the deployed contract.

---

## 9. Step-by-Step DApp Walkthrough

### Step 1 — Open the DApp
Open the React application in the browser. The TravelFi dashboard displays the Sepolia Testnet label, Experiment 1 label, booking statistics and the main operations.

### Step 2 — Connect the wallet
Click **Connect Wallet**. MetaMask opens a connection request. Select the required account and approve the connection. The connected wallet address is then displayed on the application header.

### Step 3 — Enter booking details
In the **Book & Pay Escrow** section, enter the travel provider's Ethereum address and the amount of ETH to be deposited into escrow. In the performed experiment, 0.005 ETH was used for the booking transaction.

### Step 4 — Create the booking
Click **Book & Pay Escrow**. The frontend sends the transaction through Ethers.js and MetaMask displays the transaction request. Confirm the transaction on the Sepolia network.

### Step 5 — Wait for transaction confirmation
The frontend waits for the blockchain transaction to be mined before refreshing the displayed values. A toast notification displays "Transaction submitted — waiting for confirmation…" followed by "Booking created! 0.005 ETH escrowed successfully."

### Step 6 — Verify updated stats
After confirmation, the dashboard displays the updated **Total Bookings** (incremented by 1) and **Escrowed Balance** (increased by the booking amount). The booking count and contract balance reflect the confirmed on-chain state.

### Step 7 — View booking details
In the **View Booking** section, enter the Booking ID (e.g., 1) and click **View Booking**. The DApp displays:
- Booking ID: #1
- Traveler: 0x… (connected wallet address)
- Provider: 0x… (provider address entered)
- Amount: 0.005 ETH
- Status: **Pending** (shown with amber badge)
- Created: timestamp

### Step 8 — Confirm trip completion
Click **Confirm Trip Completed** and approve the MetaMask transaction. After successful processing, the booking status changes to **Completed** (green badge) and the escrowed funds are released to the provider's address.

### Step 9 — Cancel a booking (alternative flow)
For a pending booking, clicking **Cancel Booking** and confirming the MetaMask transaction refunds the escrowed ETH back to the traveler. The booking status changes to **Cancelled** (red badge).

### Step 10 — Verify transaction on Etherscan
Open the transaction verification link. Sepolia Etherscan displays the createBooking / confirmCompletion / cancelBooking function call and the transaction status as **Success**, providing independent blockchain-level verification.

### Step 11 — Travel Savings Vault
Switch to the **Savings Vault** tab. Deposit mUSDC amounts, set a travel savings goal, and track progress with the visual progress bar. Withdraw when the savings goal is reached.

### Step 12 — Booking History
Switch to the **Booking History** tab to view all past bookings with their IDs, provider addresses, amounts, statuses, and dates.

---

## 10. Smart Contract Optimizations

### Optimization 1 — Immutable Owner

```diff
- address public owner;
+ address public immutable owner;  // set once in constructor, never reassigned
```

**Rationale:** `immutable` variables are embedded directly into the deployed bytecode instead of occupying a storage slot. Reading an immutable costs 0 gas (it's part of the code), compared to ~2100 gas for a regular SLOAD.

---

### Optimization 2 — Custom Errors

```diff
- require(msg.value > 0, "Deposit must be greater than 0");
- require(provider == address(0), "Invalid provider address");
+ error ZeroDeposit();
+ error InvalidProvider();
+ if (msg.value == 0) revert ZeroDeposit();
+ if (provider == address(0)) revert InvalidProvider();
```

**Rationale:** Custom errors are encoded as 4-byte selectors instead of storing full revert strings in contract bytecode. This reduces both deployment cost and revert gas cost.

---

### Optimization 3 — Cached Storage Reads

```diff
  function confirmCompletion(uint256 bookingId) external {
      Booking storage booking = bookings[bookingId];
-     require(booking.id != 0, "Booking does not exist");
-     require(msg.sender == booking.traveler, "Only traveler");
-     booking.status = BookingStatus.Completed;
-     payable(booking.provider).transfer(booking.amount);
-     emit BookingCompleted(bookingId, booking.provider, booking.amount);
+     uint256 _id = booking.id;              // cached
+     address _traveler = booking.traveler;   // cached
+     address _provider = booking.provider;   // cached
+     uint256 _amount = booking.amount;       // cached
+     if (_id == 0) revert BookingNotFound();
+     if (msg.sender != _traveler) revert NotTraveler();
+     booking.status = BookingStatus.Completed;
+     payable(_provider).transfer(_amount);
+     emit BookingCompleted(bookingId, _provider, _amount);
  }
```

**Rationale:** Each SLOAD costs ~2100 gas. By reading each storage field once into a local variable (3 gas per read), repeated accesses save ~2097 gas each.

---

### Optimization 4 — Safe ETH Transfer with call{value}

```diff
- payable(_provider).transfer(_amount);
+ (bool success, ) = payable(_provider).call{value: _amount}("");
+ if (!success) revert TransferFailed();
```

**Rationale:** `transfer()` forwards only 2300 gas, which can fail if the recipient is a contract with a `receive()`/`fallback()` that costs more. `call{value}("")` forwards all remaining gas and is the recommended safe pattern.

---

### Optimization 5 — Unchecked Arithmetic & Checks-Effects-Interactions

```diff
  function createBooking(address provider) external payable {
-     bookingCount++;
+     uint256 _bookingCount;
+     unchecked {
+         _bookingCount = bookingCount + 1;  // can't realistically overflow uint256
+     }
+     bookingCount = _bookingCount;

  function confirmCompletion(uint256 bookingId) external {
      booking.status = BookingStatus.Completed;
+     emit BookingCompleted(bookingId, _provider, _amount);  // event BEFORE call
      (bool success, ) = payable(_provider).call{value: _amount}("");
+     if (!success) revert TransferFailed();
-     emit BookingCompleted(bookingId, _provider, _amount);  // moved up
  }
```

**Rationale:** (a) `unchecked` skips overflow checks for arithmetic that provably can't overflow, saving ~100 gas per operation. (b) Checks-Effects-Interactions pattern places all state changes and events before external calls to prevent reentrancy attacks.

---

## 11. Observations

- The TravelBookingEscrow smart contract was successfully compiled and deployed on the Sepolia test network using Remix IDE with Solidity 0.8.20.
- The React frontend successfully connected to MetaMask.
- The user was able to create a booking with 0.005 ETH deposited into the escrow smart contract.
- The dashboard reflected the updated Total Bookings and Escrowed Balance after each transaction.
- The booking details were correctly displayed with traveler address, provider address, amount, status, and timestamp.
- The Confirm Trip Completed operation successfully released escrowed funds to the provider.
- The Cancel Booking operation successfully refunded escrowed funds to the traveler.
- All transactions were verified on Sepolia Etherscan with Success status.
- The Savings Vault tab correctly tracked deposits, shares, and goal progress.
- The Booking History tab displayed all past bookings with correct status badges.
- Five optimization steps were applied to reduce gas consumption and improve security.

---

## 12. Result

The **TravelFi — Decentralized Travel Booking & Savings Platform** DApp was successfully implemented using a Solidity smart contract, React.js, Ethers.js and MetaMask. The deployed application successfully demonstrated:

1. **Wallet connection** via MetaMask
2. **Escrow booking creation** with ETH deposit
3. **Trip completion confirmation** releasing funds to the provider
4. **Booking cancellation** with traveler refund
5. **Booking lookup** by ID with full details display
6. **Savings Vault** with deposit, withdrawal, and goal tracking
7. **Booking History** with status tracking
8. **On-chain state updates** reflected in real-time on the UI
9. **Transaction verification** on Sepolia Etherscan
10. **Five smart contract optimizations** (immutable, custom errors, cached storage, safe calls, unchecked arithmetic)

The complete client-to-blockchain interaction pipeline was demonstrated on the Sepolia test network.

---

## 13. Project Structure

```
TravelFi/
├── contracts/
│   ├── TravelBookingEscrow.sol                          # Base smart contract
│   └── optimizations/
│       ├── TravelBookingEscrow_Opt1_ImmutableOwner.sol  # Optimization 1
│       ├── TravelBookingEscrow_Opt2_CustomErrors.sol    # Optimization 2
│       ├── TravelBookingEscrow_Opt3_CachedStorage.sol   # Optimization 3
│       ├── TravelBookingEscrow_Opt4_SafeCall.sol        # Optimization 4
│       └── TravelBookingEscrow_Opt5_Full.sol            # Optimization 5 (final)
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

## 14. Tech Stack

| Layer | Technology |
|-------|-----------|
| Smart Contract | Solidity ^0.8.20 |
| Contract IDE | Remix IDE (https://remix.ethereum.org) |
| Frontend | React.js (Vite) |
| Blockchain Library | Ethers.js v6 |
| Wallet | MetaMask browser extension |
| Network | Remix VM (development) → Sepolia Testnet (deployment) |
| Package Manager | npm |
| Code Editor | VS Code |
