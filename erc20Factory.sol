// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./MemeToken.sol";

contract MemeTokenFactory {
    event MemeTokenDeployed(
        address token,
        bytes32 salt,
        string name,
        string symbol,
        string uri
    );

    // Compose the bytecode used by create2 (init-code + constructor args)
    function getBytecode(
        string memory name,
        string memory symbol,
        string memory uri
    ) internal pure returns (bytes memory) {
        return
            abi.encodePacked(
                type(MemeToken).creationCode,
                abi.encode(name, symbol, uri)
            );
    }

    /// Compute the address where a MemeToken will be deployed with a given salt.
    function computeAddress(
        bytes32 salt,
        string memory name,
        string memory symbol,
        string memory uri
    ) public view returns (address) {
        bytes memory bytecode = getBytecode(name, symbol, uri);
        bytes32 hash = keccak256(
            abi.encodePacked(
                bytes1(0xff),
                address(this),
                salt,
                keccak256(bytecode)
            )
        );
        return address(uint160(uint256(hash)));
    }

    /// Deploy a MemeToken at the predicted address
    function deploy(
        bytes32 salt,
        string memory name,
        string memory symbol,
        string memory uri
    ) external returns (address tokenAddr) {
        bytes memory bytecode = getBytecode(name, symbol, uri);
        assembly {
            tokenAddr := create2(
                0, // no ETH forwarded
                add(bytecode, 0x20),
                mload(bytecode),
                salt
            )
            if iszero(extcodesize(tokenAddr)) {
                revert(0, 0)
            }
        }
        emit MemeTokenDeployed(tokenAddr, salt, name, symbol, uri);
    }

    function debugInitCodeHash(
        string memory name,
        string memory symbol,
        string memory uri
    ) external pure returns (bytes32) {
        bytes memory bytecode = abi.encodePacked(
            type(MemeToken).creationCode,
            abi.encode(name, symbol, uri)   
        );
        return keccak256(bytecode);
    }
}
