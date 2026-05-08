// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract GovernanceToken is ERC20, ERC20Permit, ERC20Votes, Ownable {
    uint256 public constant TOTAL_SUPPLY = 1_000_000 ether;

    constructor(
        address teamVesting,
        address treasury,
        address community,
        address liquidity
    )
        ERC20("DAO Governance Token", "DGT")
        ERC20Permit("DAO Governance Token")
        Ownable(msg.sender)
    {
        _mint(teamVesting, 400_000 ether);
        _mint(treasury, 300_000 ether);
        _mint(community, 200_000 ether);
        _mint(liquidity, 100_000 ether);
    }

    function clock() public view override returns (uint48) {
        return uint48(block.number);
    }

    function CLOCK_MODE() public pure override returns (string memory) {
        return "mode=blocknumber&from=default";
    }

    function nonces(address owner)
        public
        view
        override(ERC20Permit, Nonces)
        returns (uint256)
    {
        return super.nonces(owner);
    }

    function _update(address from, address to, uint256 value)
        internal
        override(ERC20, ERC20Votes)
    {
        super._update(from, to, value);
    }
}