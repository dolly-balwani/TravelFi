# Experiment 4: Creating a Liquidity Pool Using AMM Concepts

## Aim
To deploy a decentralized Automated Market Maker (AMM) liquidity pool that enables token swaps based on the constant-product formula ($x \times y = k$). The experiment demonstrates tracking reserves, adding/removing liquidity, minting/burning LP shares, and performing swaps.

---

## 1. Application Scenario (TravelFi)
In the TravelFi ecosystem, travelers need a way to seamlessly exchange between the **Travel Token (TRVL)** (Token A) and **Mock USDC (mUSDC)** (Token B) to pay for trips or earn staking rewards. The `SimpleAMM` contract serves as the decentralized exchange (DEX) pool for the TRVL/mUSDC pair. 

---

## 2. Smart Contract Source Code

### Contract 1: `MockERC20.sol` (Used for Token A and Token B)
*(Note: Inheriting from OpenZeppelin ERC20)*
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MockERC20 is ERC20, Ownable {
    constructor(string memory name, string memory symbol) 
        ERC20(name, symbol) 
        Ownable(msg.sender) 
    {}

    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }
}
```

### Contract 2: `SimpleAMM.sol` (The Liquidity Pool)
*(Found in `contracts/SimpleAMM.sol`)*
- **Inherits:** `ERC20` (acts as the LP share token `tfLP`) and `ReentrancyGuard`.
- **Logic:** Implements the $x \times y = k$ invariant for swaps without fees. Issues proportional LP shares when liquidity is added, and returns proportional assets when liquidity is removed.

---

## 3. Step-by-Step Execution & Expected Interaction Flow

### Step 1 & 2: Deploy MockERC20 Twice (Token A and Token B)
1. Deploy `MockERC20` with arguments: `"Travel Token"`, `"TRVL"`.
2. Deploy `MockERC20` again with arguments: `"Mock USDC"`, `"mUSDC"`.
3. Record both contract addresses.

### Step 3: Mint Test Tokens
1. Call `mint(YOUR_ADDRESS, 1000000000000000000000)` (1000 TRVL) on Token A.
2. Call `mint(YOUR_ADDRESS, 1000000000000000000000)` (1000 mUSDC) on Token B.
3. Verify using `balanceOf(YOUR_ADDRESS)`.

### Step 4: Deploy the AMM
1. Deploy `SimpleAMM.sol` passing the addresses of Token A (TRVL) and Token B (mUSDC) to the constructor.
2. Record the SimpleAMM contract address.

### Step 5 & 6: Approve the AMM
1. In Token A, call `approve(AMM_ADDRESS, 1000000000000000000000)`.
2. In Token B, call `approve(AMM_ADDRESS, 1000000000000000000000)`.
3. Verify allowances.

### Step 7 & 8: Add Liquidity
1. Call `addLiquidity(100000000000000000000, 100000000000000000000)` on the AMM (100 TRVL and 100 mUSDC).
2. **Verify LP Shares:** Check `AMM.balanceOf(YOUR_ADDRESS)`. It will return exactly `100000000000000000000` (100 tfLP) because $LP = \sqrt{100 \times 100} = 100$.
3. **Verify Reserves:** Call `getReserves()`. It will return `100, 100`.

### Step 9, 10 & 11: Swap Token A for Token B
1. Call `getAmountOut(10000000000000000000, 100000000000000000000, 100000000000000000000)` (Swapping 10 TRVL in a 100/100 pool).
   - *Math:* $y_{new} = (100 \times 100) / (100 + 10) = 10000 / 110 = 90.909$. Output = $100 - 90.909 = 9.09$ mUSDC.
2. Call `swapAForB(10000000000000000000)`.
3. **Verify Reserves post-swap:** Call `getReserves()`.
   - Reserve A (TRVL) is now `110`.
   - Reserve B (mUSDC) is now `90.909`.

### Step 12: Remove Liquidity
1. Call `removeLiquidity(50000000000000000000)` (Burning 50 tfLP shares, which is 50% of the pool).
2. **Verify Returned Assets:** You receive 50% of the current reserves (55 TRVL and 45.45 mUSDC).
3. **Verify LP Balance:** Check `AMM.balanceOf(YOUR_ADDRESS)` → drops to `50 tfLP`.
4. **Verify New Reserves:** Call `getReserves()` → drops to `55 TRVL` and `45.45 mUSDC`.

---

## 4. Minimum Validation Checks Tested
- [x] **Zero-value rejections:** `addLiquidity(0, 0)` reverts with `"Zero amount"`.
- [x] **Insufficient allowance:** Fails via OpenZeppelin's `SafeERC20` wrapper.
- [x] **LP bounds:** Cannot remove more LP shares than owned (`removeLiquidity` reverts).
- [x] **Security:** Standard Checks-Effects-Interactions pattern and `nonReentrant` modifier used.

## 5. Observations on Reserve Changes (Invariant)
Throughout the `swapAForB` operation, the constant product $k$ remained approximately invariant (subject to Solidity integer truncation). 
- Initial pool: $100 \times 100 = 10,000$
- After swapping 10 TRVL: New reserves are $110$ TRVL and $90.909$ mUSDC.
- New $k = 110 \times 90.90909... \approx 10,000$.
The AMM perfectly retained the mathematical balance required by the $x \times y = k$ curve.
