// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title SimpleAMM
 * @dev Simple Constant Product AMM (x * y = k) for TravelFi (e.g. TRVL/USDC)
 * Inherits ERC20 to issue LP shares.
 */
contract SimpleAMM is ERC20, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public immutable tokenA;
    IERC20 public immutable tokenB;

    uint256 public reserveA;
    uint256 public reserveB;

    event LiquidityAdded(address indexed provider, uint256 amountA, uint256 amountB, uint256 lpShares);
    event LiquidityRemoved(address indexed provider, uint256 amountA, uint256 amountB, uint256 lpShares);
    event Swap(address indexed trader, address tokenIn, uint256 amountIn, address tokenOut, uint256 amountOut);
    event Sync(uint256 reserveA, uint256 reserveB);

    constructor(address _tokenA, address _tokenB) ERC20("TravelFi TRVL-USDC LP", "tfLP") {
        require(_tokenA != address(0) && _tokenB != address(0), "Invalid tokens");
        tokenA = IERC20(_tokenA);
        tokenB = IERC20(_tokenB);
    }

    /**
     * @notice Adds liquidity to the pool.
     */
    function addLiquidity(uint256 amountA, uint256 amountB) external nonReentrant returns (uint256 lpShares) {
        require(amountA > 0 && amountB > 0, "Zero amount");

        // Pull tokens from the user
        tokenA.safeTransferFrom(msg.sender, address(this), amountA);
        tokenB.safeTransferFrom(msg.sender, address(this), amountB);

        uint256 _totalSupply = totalSupply();
        if (_totalSupply == 0) {
            // Initial liquidity
            lpShares = _sqrt(amountA * amountB);
        } else {
            // Proportional liquidity
            uint256 sharesA = (amountA * _totalSupply) / reserveA;
            uint256 sharesB = (amountB * _totalSupply) / reserveB;
            lpShares = sharesA < sharesB ? sharesA : sharesB; // take the minimum
        }
        
        require(lpShares > 0, "Zero shares minted");

        // Update reserves
        reserveA += amountA;
        reserveB += amountB;

        // Mint LP shares to the provider
        _mint(msg.sender, lpShares);

        emit LiquidityAdded(msg.sender, amountA, amountB, lpShares);
        emit Sync(reserveA, reserveB);
    }

    /**
     * @notice Removes liquidity from the pool by burning LP shares.
     */
    function removeLiquidity(uint256 lpAmount) external nonReentrant returns (uint256 amountA, uint256 amountB) {
        require(lpAmount > 0, "Zero LP amount");
        require(balanceOf(msg.sender) >= lpAmount, "Insufficient LP shares");

        uint256 _totalSupply = totalSupply();

        // Calculate proportional amounts
        amountA = (lpAmount * reserveA) / _totalSupply;
        amountB = (lpAmount * reserveB) / _totalSupply;

        // Update reserves
        reserveA -= amountA;
        reserveB -= amountB;

        // Burn LP shares
        _burn(msg.sender, lpAmount);

        // Send tokens back to the provider
        tokenA.safeTransfer(msg.sender, amountA);
        tokenB.safeTransfer(msg.sender, amountB);

        emit LiquidityRemoved(msg.sender, amountA, amountB, lpAmount);
        emit Sync(reserveA, reserveB);
    }

    /**
     * @notice Swaps Token A for Token B (No Fee).
     */
    function swapAForB(uint256 amountAIn) external nonReentrant returns (uint256 amountBOut) {
        require(amountAIn > 0, "Zero input");

        // Calculate output
        uint256 newReserveA = reserveA + amountAIn;
        uint256 newReserveB = (reserveA * reserveB) / newReserveA;
        amountBOut = reserveB - newReserveB;

        require(amountBOut > 0, "Insufficient output");
        require(amountBOut <= reserveB, "Insufficient liquidity");

        // Pull Token A
        tokenA.safeTransferFrom(msg.sender, address(this), amountAIn);

        // Update reserves
        reserveA = newReserveA;
        reserveB = newReserveB;

        // Send Token B
        tokenB.safeTransfer(msg.sender, amountBOut);

        emit Swap(msg.sender, address(tokenA), amountAIn, address(tokenB), amountBOut);
        emit Sync(reserveA, reserveB);
    }

    /**
     * @notice Swaps Token B for Token A (No Fee).
     */
    function swapBForA(uint256 amountBIn) external nonReentrant returns (uint256 amountAOut) {
        require(amountBIn > 0, "Zero input");

        // Calculate output
        uint256 newReserveB = reserveB + amountBIn;
        uint256 newReserveA = (reserveA * reserveB) / newReserveB;
        amountAOut = reserveA - newReserveA;

        require(amountAOut > 0, "Insufficient output");
        require(amountAOut <= reserveA, "Insufficient liquidity");

        // Pull Token B
        tokenB.safeTransferFrom(msg.sender, address(this), amountBIn);

        // Update reserves
        reserveB = newReserveB;
        reserveA = newReserveA;

        // Send Token A
        tokenA.safeTransfer(msg.sender, amountAOut);

        emit Swap(msg.sender, address(tokenB), amountBIn, address(tokenA), amountAOut);
        emit Sync(reserveA, reserveB);
    }

    /**
     * @notice Returns current reserves.
     */
    function getReserves() external view returns (uint256, uint256) {
        return (reserveA, reserveB);
    }

    /**
     * @notice Computes expected output given an input amount and reserves (No Fee).
     * @dev getAmountOut(amountIn, reserveIn, reserveOut)
     */
    function getAmountOut(uint256 amountIn, uint256 reserveIn, uint256 reserveOut) external pure returns (uint256) {
        require(amountIn > 0, "Zero input");
        require(reserveIn > 0 && reserveOut > 0, "Zero reserves");

        uint256 newReserveIn = reserveIn + amountIn;
        uint256 newReserveOut = (reserveIn * reserveOut) / newReserveIn;
        return reserveOut - newReserveOut;
    }

    /**
     * @dev Simple square root function (Babylonian method).
     */
    function _sqrt(uint256 y) internal pure returns (uint256 z) {
        if (y > 3) {
            z = y;
            uint256 x = y / 2 + 1;
            while (x < z) {
                z = x;
                x = (y / x + x) / 2;
            }
        } else if (y != 0) {
            z = 1;
        }
    }
}
