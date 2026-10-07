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
     * Does not interfere with standard ERC-4626 accounting.
     */
    function setTravelGoal(uint256 _goalAmount) external {
        travelGoals[msg.sender] = _goalAmount;
        emit TravelGoalSet(msg.sender, _goalAmount);
    }

    /**
     * @notice Application-Specific Feature
     * Checks what percentage of the traveler's goal is reached (in basis points, 10000 = 100%).
     * Utilizes standard ERC-4626 `maxWithdraw` to determine user's current underlying asset value.
     */
    function getGoalProgress(address traveler) external view returns (uint256) {
        uint256 goal = travelGoals[traveler];
        if (goal == 0) return 0;

        uint256 currentAssets = maxWithdraw(traveler);
        if (currentAssets >= goal) return 10000; // 100% reached
        
        return (currentAssets * 10000) / goal;
    }
}
