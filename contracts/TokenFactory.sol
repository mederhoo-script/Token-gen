// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title ManagedToken - ERC20 token deployed by TokenFactory.
/// Mints the entire initial supply to the specified recipient (the caller of the factory).
contract ManagedToken is ERC20 {
    uint8 private _decimalsValue;

    constructor(
        string memory name_,
        string memory symbol_,
        uint256 initialSupply,
        uint8 decimalsValue,
        address recipient
    ) ERC20(name_, symbol_) {
        _decimalsValue = decimalsValue;
        _mint(recipient, initialSupply * (10 ** uint256(decimalsValue)));
    }

    function decimals() public view override returns (uint8) {
        return _decimalsValue;
    }
}

/// @title TokenFactory - Pay-to-deploy ERC20 factory.
/// Users call createToken{value: deploymentFee}(...) to deploy their own ERC20 token.
/// The fee stays in the contract until the owner withdraws it.
contract TokenFactory is Ownable {
    uint256 public deploymentFee;

    event TokenCreated(
        address indexed creator,
        address indexed tokenAddress,
        string name,
        string symbol,
        uint256 initialSupply,
        uint8 decimals
    );

    event FeeUpdated(uint256 oldFee, uint256 newFee);

    constructor(uint256 _deploymentFee) Ownable(msg.sender) {
        deploymentFee = _deploymentFee;
    }

    /// @notice Deploy a new ERC20 token. Caller must send at least deploymentFee wei.
    /// @param name     Token name (1–50 characters).
    /// @param symbol   Token symbol (1–10 characters, uppercase recommended).
    /// @param initialSupply Number of whole tokens to mint (1–1,000,000,000).
    /// @param decimalsValue Token decimals (6, 8, or 18).
    /// @return tokenAddress Address of the newly deployed token contract.
    function createToken(
        string calldata name,
        string calldata symbol,
        uint256 initialSupply,
        uint8 decimalsValue
    ) external payable returns (address tokenAddress) {
        require(msg.value >= deploymentFee, "TokenFactory: insufficient fee");
        require(bytes(name).length > 0 && bytes(name).length <= 50, "TokenFactory: invalid name length");
        require(bytes(symbol).length > 0 && bytes(symbol).length <= 10, "TokenFactory: invalid symbol length");
        require(initialSupply > 0 && initialSupply <= 1_000_000_000, "TokenFactory: supply out of range");
        require(
            decimalsValue == 6 || decimalsValue == 8 || decimalsValue == 18,
            "TokenFactory: decimals must be 6, 8, or 18"
        );

        ManagedToken token = new ManagedToken(name, symbol, initialSupply, decimalsValue, msg.sender);
        tokenAddress = address(token);

        emit TokenCreated(msg.sender, tokenAddress, name, symbol, initialSupply, decimalsValue);

        // Refund any excess ETH sent above the fee
        uint256 excess = msg.value - deploymentFee;
        if (excess > 0) {
            (bool ok, ) = payable(msg.sender).call{value: excess}("");
            require(ok, "TokenFactory: excess refund failed");
        }
    }

    /// @notice Change the deployment fee. Emits FeeUpdated. Owner only.
    function setDeploymentFee(uint256 _fee) external onlyOwner {
        emit FeeUpdated(deploymentFee, _fee);
        deploymentFee = _fee;
    }

    /// @notice Withdraw all accumulated fees to the owner's address.
    function withdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "TokenFactory: nothing to withdraw");
        (bool ok, ) = payable(owner()).call{value: balance}("");
        require(ok, "TokenFactory: withdrawal failed");
    }

    receive() external payable {}
}
