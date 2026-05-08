// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract Treasury is Ownable {
    event ETHReceived(address indexed sender, uint256 amount);
    event ETHTransferred(address indexed to, uint256 amount);
    event TokenTransferred(address indexed token, address indexed to, uint256 amount);

    constructor(address initialOwner) Ownable(initialOwner) {}

    receive() external payable {
        emit ETHReceived(msg.sender, msg.value);
    }

    function transferETH(address payable to, uint256 amount) external onlyOwner {
        require(address(this).balance >= amount, "Not enough ETH");
        to.transfer(amount);
        emit ETHTransferred(to, amount);
    }

    function transferToken(address token, address to, uint256 amount) external onlyOwner {
        IERC20(token).transfer(to, amount);
        emit TokenTransferred(token, to, amount);
    }
}