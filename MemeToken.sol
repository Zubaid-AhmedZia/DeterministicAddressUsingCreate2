// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MemeToken is ERC20 {
    string public tokenURI;

    constructor(
        string memory name_,
        string memory symbol_,
        string memory uri_
    ) ERC20(name_, symbol_) {
        tokenURI = uri_;
        _mint(msg.sender, 100); 
    }
}
