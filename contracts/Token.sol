// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract Token is ERC20 {
    uint8 private _decimalsValue;
    event TokenDeployed(address indexed deployer, uint256 initialSupply);

    constructor(
        string memory name,
        string memory symbol,
        uint256 initialSupply,
        uint8 decimalsValue
    ) ERC20(name, symbol) {
        _decimalsValue = decimalsValue;
        _mint(msg.sender, initialSupply * 10 ** decimalsValue);
        emit TokenDeployed(msg.sender, initialSupply);
    }

    function decimals() public view override returns (uint8) {
        return _decimalsValue;
    }
}
