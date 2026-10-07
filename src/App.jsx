import { useState, useEffect, useCallback } from "react";
import { BrowserProvider, Contract, parseEther, formatEther } from "ethers";
import { CONTRACT_ADDRESS, CONTRACT_ABI } from "./contractInfo";

/* ════════════════════════════════════════════════════
   Helper — shorten Ethereum address for display
   ════════════════════════════════════════════════════ */
function shortAddr(addr) {
  if (!addr) return "";
  return addr.slice(0, 6) + "…" + addr.slice(-4);
}

const STATUS_LABELS = ["Pending", "Completed", "Cancelled"];
const STATUS_CLASSES = ["pending", "completed", "cancelled"];

/* ════════════════════════════════════════════════════
   Toast Notifications
   ════════════════════════════════════════════════════ */
function ToastContainer({ toasts, onRemove }) {
  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`toast toast--${t.type}`}
          onClick={() => onRemove(t.id)}
        >
          <span>{t.icon}</span>
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  );
}

/* ════════════════════════════════════════════════════
   Main App Component
   ════════════════════════════════════════════════════ */
function App() {
  // ── Wallet State ──
  const [account, setAccount] = useState(null);
  const [networkName, setNetworkName] = useState("");

  // ── Tab State ──
  const [activeTab, setActiveTab] = useState("booking");

  // ── Contract Stats ──
  const [bookingCount, setBookingCount] = useState(0);
  const [contractBalance, setContractBalance] = useState("0");

  // ── Booking Form ──
  const [providerAddr, setProviderAddr] = useState("");
  const [bookingAmount, setBookingAmount] = useState("");

  // ── Booking Lookup ──
  const [lookupId, setLookupId] = useState("");
  const [bookingDetails, setBookingDetails] = useState(null);

  // ── Savings Vault (simulated state for UI) ──
  const [vaultDeposit, setVaultDeposit] = useState("");
  const [vaultBalance, setVaultBalance] = useState("0");
  const [vaultShares, setVaultShares] = useState("0");
  const [travelGoal, setTravelGoal] = useState("");
  const [currentGoal, setCurrentGoal] = useState(0);

  // ── Loading ──
  const [loading, setLoading] = useState(false);

  // ── Toasts ──
  const [toasts, setToasts] = useState([]);

  // ── Booking History ──
  const [bookingHistory, setBookingHistory] = useState([]);

  /* ──────────────────────────────────────────
     Toast Helper
     ────────────────────────────────────────── */
  const addToast = useCallback((message, type = "info") => {
    const icons = { success: "✅", error: "❌", info: "ℹ️" };
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type, icon: icons[type] }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  /* ──────────────────────────────────────────
     Get Contract Instance
     ────────────────────────────────────────── */
  async function getContract(needsSigner = false) {
    if (!window.ethereum) throw new Error("MetaMask not installed");
    const provider = new BrowserProvider(window.ethereum);
    const signerOrProvider = needsSigner
      ? await provider.getSigner()
      : provider;
    return new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signerOrProvider);
  }

  /* ──────────────────────────────────────────
     Connect Wallet
     ────────────────────────────────────────── */
  async function connectWallet() {
    if (!window.ethereum) {
      addToast("Please install MetaMask to use TravelFi!", "error");
      return;
    }
    try {
      setLoading(true);
      const provider = new BrowserProvider(window.ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);
      setAccount(accounts[0]);

      const network = await provider.getNetwork();
      const chainNames = {
        1n: "Ethereum Mainnet",
        5n: "Goerli",
        11155111n: "Sepolia",
        137n: "Polygon",
        80001n: "Mumbai",
      };
      setNetworkName(chainNames[network.chainId] || `Chain ${network.chainId}`);

      addToast("Wallet connected successfully!", "success");
      await fetchStats();
    } catch (err) {
      addToast("Failed to connect wallet: " + err.message, "error");
    } finally {
      setLoading(false);
    }
  }

  /* ──────────────────────────────────────────
     Fetch Contract Stats
     ────────────────────────────────────────── */
  const fetchStats = useCallback(async () => {
    try {
      const contract = await getContract(false);
      const count = await contract.getBookingCount();
      const balance = await contract.getContractBalance();
      setBookingCount(Number(count));
      setContractBalance(formatEther(balance));
    } catch {
      // Contract may not be deployed yet
    }
  }, []);

  /* ──────────────────────────────────────────
     Create Booking
     ────────────────────────────────────────── */
  async function handleCreateBooking() {
    if (!providerAddr || !bookingAmount) {
      addToast("Please fill in provider address and amount", "error");
      return;
    }
    try {
      setLoading(true);
      const contract = await getContract(true);
      const tx = await contract.createBooking(providerAddr, {
        value: parseEther(bookingAmount),
      });
      addToast("Transaction submitted — waiting for confirmation…", "info");
      await tx.wait();
      addToast(
        `Booking created! ${bookingAmount} ETH escrowed successfully.`,
        "success"
      );
      setProviderAddr("");
      setBookingAmount("");
      await fetchStats();
      await fetchAllBookings();
    } catch (err) {
      addToast("Booking failed: " + (err.reason || err.message), "error");
    } finally {
      setLoading(false);
    }
  }

  /* ──────────────────────────────────────────
     View Booking Details
     ────────────────────────────────────────── */
  async function handleViewBooking() {
    if (!lookupId) {
      addToast("Enter a Booking ID", "error");
      return;
    }
    try {
      setLoading(true);
      const contract = await getContract(false);
      const details = await contract.getBookingDetails(lookupId);
      setBookingDetails({
        id: Number(details.id),
        traveler: details.traveler,
        provider: details.provider,
        amount: formatEther(details.amount),
        status: Number(details.status),
        createdAt: Number(details.createdAt),
      });
    } catch (err) {
      addToast("Could not fetch booking: " + (err.reason || err.message), "error");
      setBookingDetails(null);
    } finally {
      setLoading(false);
    }
  }

  /* ──────────────────────────────────────────
     Confirm Completion
     ────────────────────────────────────────── */
  async function handleConfirmCompletion() {
    if (!bookingDetails) return;
    try {
      setLoading(true);
      const contract = await getContract(true);
      const tx = await contract.confirmCompletion(bookingDetails.id);
      addToast("Confirming trip completion…", "info");
      await tx.wait();
      addToast(
        `Trip completed! ${bookingDetails.amount} ETH released to provider.`,
        "success"
      );
      await handleViewBooking();
      await fetchStats();
      await fetchAllBookings();
    } catch (err) {
      addToast("Confirm failed: " + (err.reason || err.message), "error");
    } finally {
      setLoading(false);
    }
  }

  /* ──────────────────────────────────────────
     Cancel Booking
     ────────────────────────────────────────── */
  async function handleCancelBooking() {
    if (!bookingDetails) return;
    try {
      setLoading(true);
      const contract = await getContract(true);
      const tx = await contract.cancelBooking(bookingDetails.id);
      addToast("Cancelling booking…", "info");
      await tx.wait();
      addToast(
        `Booking cancelled. ${bookingDetails.amount} ETH refunded.`,
        "success"
      );
      await handleViewBooking();
      await fetchStats();
      await fetchAllBookings();
    } catch (err) {
      addToast("Cancel failed: " + (err.reason || err.message), "error");
    } finally {
      setLoading(false);
    }
  }

  /* ──────────────────────────────────────────
     Fetch All Bookings for History
     ────────────────────────────────────────── */
  const fetchAllBookings = useCallback(async () => {
    try {
      const contract = await getContract(false);
      const count = await contract.getBookingCount();
      const results = [];
      for (let i = 1; i <= Number(count); i++) {
        try {
          const b = await contract.getBookingDetails(i);
          results.push({
            id: Number(b.id),
            traveler: b.traveler,
            provider: b.provider,
            amount: formatEther(b.amount),
            status: Number(b.status),
            createdAt: Number(b.createdAt),
          });
        } catch {
          // skip
        }
      }
      setBookingHistory(results);
    } catch {
      // Contract may not be deployed
    }
  }, []);

  /* ──────────────────────────────────────────
     Savings Vault — Simulated Handlers
     (In production, these would call an ERC-4626 vault contract)
     ────────────────────────────────────────── */
  function handleVaultDeposit() {
    if (!vaultDeposit || Number(vaultDeposit) <= 0) {
      addToast("Enter a valid deposit amount", "error");
      return;
    }
    const newBalance = (parseFloat(vaultBalance) + parseFloat(vaultDeposit)).toFixed(4);
    const newShares = (parseFloat(vaultShares) + parseFloat(vaultDeposit) * 0.95).toFixed(4);
    setVaultBalance(newBalance);
    setVaultShares(newShares);
    setVaultDeposit("");
    addToast(`Deposited ${vaultDeposit} mUSDC into Savings Vault`, "success");
  }

  function handleVaultWithdraw() {
    if (parseFloat(vaultBalance) <= 0) {
      addToast("No funds to withdraw", "error");
      return;
    }
    addToast(`Withdrew ${vaultBalance} mUSDC from Savings Vault`, "success");
    setVaultBalance("0");
    setVaultShares("0");
  }

  function handleSetGoal() {
    if (!travelGoal || Number(travelGoal) <= 0) {
      addToast("Enter a valid savings goal", "error");
      return;
    }
    setCurrentGoal(parseFloat(travelGoal));
    setTravelGoal("");
    addToast(`Travel savings goal set to ${travelGoal} mUSDC`, "success");
  }

  /* ──────────────────────────────────────────
     Effects
     ────────────────────────────────────────── */
  useEffect(() => {
    if (account) {
      fetchStats();
      fetchAllBookings();
    }
  }, [account, fetchStats, fetchAllBookings]);

  // Listen for account/network changes
  useEffect(() => {
    if (!window.ethereum) return;
    const handleAccountsChanged = (accounts) => {
      if (accounts.length === 0) {
        setAccount(null);
      } else {
        setAccount(accounts[0]);
      }
    };
    const handleChainChanged = () => window.location.reload();

    window.ethereum.on("accountsChanged", handleAccountsChanged);
    window.ethereum.on("chainChanged", handleChainChanged);

    return () => {
      window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
      window.ethereum.removeListener("chainChanged", handleChainChanged);
    };
  }, []);

  /* ──────────────────────────────────────────
     Compute Vault Progress
     ────────────────────────────────────────── */
  const goalProgress =
    currentGoal > 0
      ? Math.min(100, Math.round((parseFloat(vaultBalance) / currentGoal) * 100))
      : 0;

  /* ════════════════════════════════════════════════════
     RENDER
     ════════════════════════════════════════════════════ */
  return (
    <div className="app">
      {/* ── Navbar ── */}
      <header className="navbar" id="navbar">
        <div className="navbar__brand">
          <span className="navbar__logo-icon">✈️</span>
          <div>
            <div className="navbar__logo">TravelFi</div>
            <div className="navbar__network">
              <span className="navbar__network-dot" />
              {networkName || "Not Connected"} | Experiment 1
            </div>
          </div>
        </div>
        <div className="navbar__actions">
          {account && (
            <span className="navbar__address" id="wallet-address">
              {shortAddr(account)}
            </span>
          )}
          {!account ? (
            <button
              className="btn btn--wallet"
              onClick={connectWallet}
              disabled={loading}
              id="connect-wallet-btn"
            >
              {loading ? <span className="spinner" /> : "🦊"} Connect Wallet
            </button>
          ) : (
            <button
              className="btn btn--ghost"
              onClick={() => {
                setAccount(null);
                setNetworkName("");
                addToast("Wallet disconnected", "info");
              }}
              id="disconnect-btn"
            >
              Disconnect
            </button>
          )}
        </div>
      </header>

      {/* ── Not Connected Hero ── */}
      {!account && (
        <section className="hero">
          <h1 className="hero__title">
            Decentralized Travel Booking
            <br />& Savings Platform
          </h1>
          <p className="hero__subtitle">
            Book trips with escrow protection, save toward future trips in an
            ERC‑4626 vault, earn TRVL rewards — all without a centralized
            intermediary.
          </p>
          <button
            className="btn btn--wallet btn--lg"
            onClick={connectWallet}
            disabled={loading}
            id="hero-connect-btn"
          >
            {loading ? <span className="spinner" /> : "🦊"} Connect MetaMask to
            Get Started
          </button>
        </section>
      )}

      {/* ── Connected Dashboard ── */}
      {account && (
        <>
          {/* Stats Row */}
          <div className="stats-grid">
            <div className="stat-card stat-card--primary">
              <div className="stat-card__icon">📋</div>
              <div className="stat-card__label">Total Bookings</div>
              <div className="stat-card__value" id="stat-bookings">
                {bookingCount}
              </div>
            </div>
            <div className="stat-card stat-card--accent">
              <div className="stat-card__icon">🔒</div>
              <div className="stat-card__label">Escrowed Balance</div>
              <div className="stat-card__value" id="stat-balance">
                {contractBalance} ETH
              </div>
            </div>
            <div className="stat-card stat-card--success">
              <div className="stat-card__icon">💰</div>
              <div className="stat-card__label">Vault Balance</div>
              <div className="stat-card__value" id="stat-vault">
                {vaultBalance} mUSDC
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="nav-tabs" id="main-nav">
            <button
              className={`nav-tab ${activeTab === "booking" ? "nav-tab--active" : ""}`}
              onClick={() => setActiveTab("booking")}
              id="tab-booking"
            >
              <span className="nav-tab__icon">✈️</span>Book a Trip
            </button>
            <button
              className={`nav-tab ${activeTab === "vault" ? "nav-tab--active" : ""}`}
              onClick={() => setActiveTab("vault")}
              id="tab-vault"
            >
              <span className="nav-tab__icon">🏦</span>Savings Vault
            </button>
            <button
              className={`nav-tab ${activeTab === "history" ? "nav-tab--active" : ""}`}
              onClick={() => setActiveTab("history")}
              id="tab-history"
            >
              <span className="nav-tab__icon">📜</span>Booking History
            </button>
          </nav>

          {/* ═══ TAB: Book a Trip ═══ */}
          {activeTab === "booking" && (
            <div className="section-grid">
              {/* Create Booking Card */}
              <div className="card" id="create-booking-card">
                <div className="card__header">
                  <div>
                    <h2 className="card__title">✈️ Book & Pay Escrow</h2>
                    <p className="card__subtitle">
                      Funds are held in escrow until you confirm trip completion
                    </p>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="provider-address">
                    Provider Address
                  </label>
                  <input
                    id="provider-address"
                    className="form-input"
                    type="text"
                    placeholder="0x… (hotel, airline, tour operator)"
                    value={providerAddr}
                    onChange={(e) => setProviderAddr(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="booking-amount">
                    Amount (ETH)
                  </label>
                  <input
                    id="booking-amount"
                    className="form-input"
                    type="number"
                    step="0.001"
                    min="0"
                    placeholder="0.1"
                    value={bookingAmount}
                    onChange={(e) => setBookingAmount(e.target.value)}
                  />
                </div>

                <button
                  className="btn btn--primary btn--full"
                  onClick={handleCreateBooking}
                  disabled={loading}
                  id="create-booking-btn"
                >
                  {loading ? <span className="spinner" /> : "🔒"} Book & Pay
                  Escrow
                </button>
              </div>

              {/* View Booking Card */}
              <div className="card" id="view-booking-card">
                <div className="card__header">
                  <div>
                    <h2 className="card__title">🔍 View Booking</h2>
                    <p className="card__subtitle">
                      Look up a booking by its ID
                    </p>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="booking-id">
                    Booking ID
                  </label>
                  <input
                    id="booking-id"
                    className="form-input"
                    type="number"
                    min="1"
                    placeholder="1"
                    value={lookupId}
                    onChange={(e) => setLookupId(e.target.value)}
                  />
                </div>

                <button
                  className="btn btn--ghost btn--full"
                  onClick={handleViewBooking}
                  disabled={loading}
                  id="view-booking-btn"
                >
                  {loading ? <span className="spinner" /> : "🔍"} View Booking
                </button>

                {/* Booking Details */}
                {bookingDetails && (
                  <div className="booking-details" id="booking-details">
                    <div className="booking-details__row">
                      <span className="booking-details__label">Booking ID</span>
                      <span className="booking-details__value">
                        #{bookingDetails.id}
                      </span>
                    </div>
                    <div className="booking-details__row">
                      <span className="booking-details__label">Traveler</span>
                      <span className="booking-details__value">
                        {shortAddr(bookingDetails.traveler)}
                      </span>
                    </div>
                    <div className="booking-details__row">
                      <span className="booking-details__label">Provider</span>
                      <span className="booking-details__value">
                        {shortAddr(bookingDetails.provider)}
                      </span>
                    </div>
                    <div className="booking-details__row">
                      <span className="booking-details__label">Amount</span>
                      <span className="booking-details__value">
                        {bookingDetails.amount} ETH
                      </span>
                    </div>
                    <div className="booking-details__row">
                      <span className="booking-details__label">Status</span>
                      <span
                        className={`status-badge status-badge--${STATUS_CLASSES[bookingDetails.status]}`}
                      >
                        {STATUS_LABELS[bookingDetails.status]}
                      </span>
                    </div>
                    <div className="booking-details__row">
                      <span className="booking-details__label">Created</span>
                      <span className="booking-details__value">
                        {bookingDetails.createdAt > 0
                          ? new Date(
                              bookingDetails.createdAt * 1000
                            ).toLocaleString()
                          : "—"}
                      </span>
                    </div>

                    {bookingDetails.status === 0 && (
                      <div className="booking-details__actions">
                        <button
                          className="btn btn--success"
                          onClick={handleConfirmCompletion}
                          disabled={loading}
                          id="confirm-btn"
                        >
                          {loading ? <span className="spinner" /> : "✅"}{" "}
                          Confirm Trip Completed
                        </button>
                        <button
                          className="btn btn--danger"
                          onClick={handleCancelBooking}
                          disabled={loading}
                          id="cancel-btn"
                        >
                          {loading ? <span className="spinner" /> : "❌"} Cancel
                          Booking
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ═══ TAB: Savings Vault ═══ */}
          {activeTab === "vault" && (
            <div className="section-grid">
              {/* Vault Overview */}
              <div className="card" id="vault-overview-card">
                <div className="card__header">
                  <div>
                    <h2 className="card__title">🏦 Travel Savings Vault</h2>
                    <p className="card__subtitle">
                      ERC-4626 Tokenized Vault — save toward your next trip
                    </p>
                  </div>
                </div>

                <div className="vault-info">
                  <div className="vault-info__item">
                    <div className="vault-info__label">Total Vault Assets</div>
                    <div className="vault-info__value">
                      {vaultBalance} mUSDC
                    </div>
                  </div>
                  <div className="vault-info__item">
                    <div className="vault-info__label">Your Shares</div>
                    <div className="vault-info__value">
                      {vaultShares} tfvUSDC
                    </div>
                  </div>
                </div>

                {currentGoal > 0 && (
                  <>
                    <div className="form-label">
                      Savings Goal: {currentGoal} mUSDC
                    </div>
                    <div className="progress-bar">
                      <div
                        className="progress-bar__fill"
                        style={{ width: `${goalProgress}%` }}
                      />
                    </div>
                    <div className="progress-info">
                      <span className="progress-info__text">
                        {vaultBalance} / {currentGoal} mUSDC
                      </span>
                      <span className="progress-info__percent">
                        {goalProgress}%
                      </span>
                    </div>
                  </>
                )}
              </div>

              {/* Vault Actions */}
              <div className="card" id="vault-actions-card">
                <div className="card__header">
                  <h2 className="card__title">💸 Vault Actions</h2>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="vault-amount">
                    Amount (mUSDC)
                  </label>
                  <input
                    id="vault-amount"
                    className="form-input"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="100"
                    value={vaultDeposit}
                    onChange={(e) => setVaultDeposit(e.target.value)}
                  />
                </div>

                <div className="form-row" style={{ marginBottom: "var(--space-5)" }}>
                  <button
                    className="btn btn--primary"
                    onClick={handleVaultDeposit}
                    id="vault-deposit-btn"
                  >
                    📥 Deposit
                  </button>
                  <button
                    className="btn btn--ghost"
                    onClick={handleVaultWithdraw}
                    id="vault-withdraw-btn"
                  >
                    📤 Withdraw
                  </button>
                </div>

                <div className="divider" />

                <div className="form-group">
                  <label className="form-label" htmlFor="travel-goal">
                    Set Travel Savings Goal (mUSDC)
                  </label>
                  <input
                    id="travel-goal"
                    className="form-input"
                    type="number"
                    step="1"
                    min="0"
                    placeholder="500"
                    value={travelGoal}
                    onChange={(e) => setTravelGoal(e.target.value)}
                  />
                </div>

                <button
                  className="btn btn--accent btn--full"
                  onClick={handleSetGoal}
                  id="set-goal-btn"
                >
                  🎯 Set Goal
                </button>
              </div>
            </div>
          )}

          {/* ═══ TAB: Booking History ═══ */}
          {activeTab === "history" && (
            <div className="card" id="history-card">
              <div className="card__header">
                <h2 className="card__title">📜 All Bookings</h2>
                <button
                  className="btn btn--ghost"
                  onClick={fetchAllBookings}
                  id="refresh-history-btn"
                >
                  🔄 Refresh
                </button>
              </div>

              {bookingHistory.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state__icon">📭</div>
                  <div className="empty-state__title">No Bookings Yet</div>
                  <p className="empty-state__text">
                    Create your first booking in the "Book a Trip" tab.
                  </p>
                </div>
              ) : (
                <div className="booking-history">
                  {/* Header */}
                  <div
                    className="booking-history__item"
                    style={{
                      color: "var(--text-muted)",
                      fontSize: "var(--font-size-xs)",
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    <span>ID</span>
                    <span>Provider</span>
                    <span style={{ textAlign: "right" }}>Amount</span>
                    <span>Status</span>
                    <span>Date</span>
                  </div>
                  {bookingHistory.map((b) => (
                    <div
                      key={b.id}
                      className="booking-history__item"
                      onClick={() => {
                        setLookupId(String(b.id));
                        setActiveTab("booking");
                        handleViewBooking();
                      }}
                      style={{ cursor: "pointer" }}
                    >
                      <span className="booking-history__id">#{b.id}</span>
                      <span className="booking-history__addr">
                        {shortAddr(b.provider)}
                      </span>
                      <span className="booking-history__amount">
                        {b.amount} ETH
                      </span>
                      <span
                        className={`status-badge status-badge--${STATUS_CLASSES[b.status]}`}
                      >
                        {STATUS_LABELS[b.status]}
                      </span>
                      <span
                        style={{
                          fontSize: "var(--font-size-xs)",
                          color: "var(--text-muted)",
                        }}
                      >
                        {b.createdAt > 0
                          ? new Date(b.createdAt * 1000).toLocaleDateString()
                          : "—"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}

export default App;
