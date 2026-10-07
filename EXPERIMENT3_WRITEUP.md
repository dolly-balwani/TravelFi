# Experiment 3: Deploying and Interacting with an ERC-4626 Vault Contract

## Aim
To deploy and interact with an ERC-4626 tokenized vault using an ERC-20 token as the underlying asset, and to demonstrate the complete asset-to-vault-share and vault-share-to-asset lifecycle.

---

## 1. Application-Specific Feature (TravelFi)
This experiment implements the **Travel Savings Vault** for TravelFi. 
**Feature added:** Travelers can set a `travelGoal` (in underlying mUSDC). A custom view function `getGoalProgress()` calculates the percentage of the goal achieved using the standard ERC-4626 `maxWithdraw()` function to check the user's current underlying asset value. This retains 100% of the standard vault behaviour while adding TravelFi-specific utility.

---

## 2. Smart Contract Source Code

### Contract 1: `MockUSDC.sol` (Underlying Asset)
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MockUSDC is ERC20, Ownable {
    constructor() ERC20("Mock USDC", "mUSDC") Ownable(msg.sender) {}

    // Controlled mint function for laboratory testing
    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }
}
```

### Contract 2: `TravelSavingsVault.sol` (ERC-4626 Vault)
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract TravelSavingsVault is ERC4626 {
    // Application-Specific Feature: Travel Savings Goal tracking
    mapping(address => uint256) public travelGoals;

    event TravelGoalSet(address indexed traveler, uint256 goalAmount);

    constructor(IERC20 _asset)
        ERC4626(_asset)
        ERC20("TravelFi Savings Vault Share", "tfvUSDC")
    {}

    /**
     * @notice Application-Specific Feature
     * Allows a traveler to set a target savings goal for their next trip.
     */
    function setTravelGoal(uint256 _goalAmount) external {
        travelGoals[msg.sender] = _goalAmount;
        emit TravelGoalSet(msg.sender, _goalAmount);
    }

    /**
     * @notice Application-Specific Feature
     * Checks percentage of goal reached (10000 = 100%).
     */
    function getGoalProgress(address traveler) external view returns (uint256) {
        uint256 goal = travelGoals[traveler];
        if (goal == 0) return 0;

        uint256 currentAssets = maxWithdraw(traveler);
        if (currentAssets >= goal) return 10000;
        
        return (currentAssets * 10000) / goal;
    }
}
```

---

## 3. Step-by-Step Execution & Expected Interaction Flow

### Step 1-3: Deploy MockUSDC & Mint
1. Deploy `MockUSDC.sol` in Remix IDE.
2. Call `mint(YOUR_ADDRESS, 1000000000000000000000)` (mints 1000 mUSDC with 18 decimals).
3. Verify using `balanceOf(YOUR_ADDRESS)` → Returns 1000 mUSDC.

### Step 4-5: Deploy the ERC-4626 Vault
1. Deploy `TravelSavingsVault.sol`, passing the **MockUSDC address** into the constructor.
2. Record the deployed Vault address.

### Step 6: Verify Underlying Asset
1. In `TravelSavingsVault`, call `asset()`. 
2. **Result:** Returns the MockUSDC address.
3. Call `totalAssets()`. 
4. **Result:** Returns `0` (vault is currently empty).

### Step 7: Approve the Vault
1. Go back to `MockUSDC`.
2. Call `approve(VAULT_ADDRESS, 100000000000000000000)` (Approving 100 mUSDC).
3. Verify by calling `allowance(YOUR_ADDRESS, VAULT_ADDRESS)` → Returns 100 mUSDC.

### Step 8: Preview Deposit
1. In the Vault contract, call `previewDeposit(100000000000000000000)` (100 mUSDC).
2. **Result:** Returns `100000000000000000000`. This means 100 mUSDC will grant exactly 100 tfvUSDC shares (1:1 ratio initially).

### Step 9: Deposit Assets
1. Call `deposit(100000000000000000000, YOUR_ADDRESS)`.
2. **Result:** Transaction succeeds. The vault transfers 100 mUSDC from your wallet into the vault, and mints 100 tfvUSDC shares to your wallet.

### Step 10: Verify Post-Deposit State
1. `MockUSDC.balanceOf(YOUR_ADDRESS)` → Decreased by 100.
2. `Vault.balanceOf(YOUR_ADDRESS)` → Returns 100 tfvUSDC.
3. `Vault.totalAssets()` → Returns 100 mUSDC.

### Step 11: Application-Specific Feature
1. Call `setTravelGoal(200000000000000000000)` (Goal of 200 mUSDC).
2. Call `getGoalProgress(YOUR_ADDRESS)`.
3. **Result:** Returns `5000` (which represents 50.00%, since we have 100 mUSDC deposited and the goal is 200).

### Step 12: Test Conversion
1. Call `convertToShares(50000000000000000000)` (50 mUSDC).
2. **Result:** Returns 50 tfvUSDC shares.

### Step 13: Demonstrate Withdrawal
1. Call `withdraw(50000000000000000000, YOUR_ADDRESS, YOUR_ADDRESS)` (Withdraw 50 mUSDC).
2. **Result:** Transaction succeeds. The vault burns 50 tfvUSDC shares and returns 50 mUSDC to your wallet.
3. Check `Vault.balanceOf(YOUR_ADDRESS)` → Decreased to 50 tfvUSDC.

### Step 14: Demonstrate Redemption
1. Call `redeem(50000000000000000000, YOUR_ADDRESS, YOUR_ADDRESS)` (Redeem remaining 50 shares).
2. **Result:** The vault burns your 50 tfvUSDC shares and returns the remaining 50 mUSDC.
3. Check `Vault.totalAssets()` → Returns `0`.

### Step 15: Observe Events
By checking the transaction logs in Remix:
- **Deposit:** Emits `Transfer` (ERC-20) and `Deposit` (ERC-4626).
- **Withdraw/Redeem:** Emits `Transfer` (burning shares) and `Withdraw` (ERC-4626).
- **Custom:** Emits `TravelGoalSet` from the application-specific function.

---

## 4. Evaluation Points Checklist
- [x] Source code provided for `MockUSDC` and `TravelSavingsVault`.
- [x] Application-specific function `setTravelGoal` & `getGoalProgress` implemented without breaking ERC-4626 standard flow.
- [x] Underlying asset address returned by `asset()`.
- [x] Full asset lifecycle (Mint → Approve → Deposit → Share creation → Withdraw → Asset return) successfully documented.
- [x] `convertToShares()` and `previewDeposit()` utilized to inspect exchange rates.
