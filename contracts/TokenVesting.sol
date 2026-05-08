// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract TokenVesting {
    IERC20 public immutable token;
    address public immutable beneficiary;
    uint256 public immutable start;
    uint256 public immutable duration;
    uint256 public immutable totalAmount;

    uint256 public released;

    constructor(
        address _token,
        address _beneficiary,
        uint256 _start,
        uint256 _duration,
        uint256 _totalAmount
    ) {
        token = IERC20(_token);
        beneficiary = _beneficiary;
        start = _start;
        duration = _duration;
        totalAmount = _totalAmount;
    }

    function vestedAmount() public view returns (uint256) {
        if (block.timestamp < start) {
            return 0;
        }

        if (block.timestamp >= start + duration) {
            return totalAmount;
        }

        return (totalAmount * (block.timestamp - start)) / duration;
    }

    function releasable() public view returns (uint256) {
        return vestedAmount() - released;
    }

    function release() external {
        uint256 amount = releasable();
        require(amount > 0, "No tokens to release");

        released += amount;
        token.transfer(beneficiary, amount);
    }
}