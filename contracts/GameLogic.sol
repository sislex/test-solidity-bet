// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.2 <0.9.0;

contract GameLogic {

    function calculatePayouts(
        uint256 balance,
        address[] memory wallets,
        uint8[] memory percents
    ) public pure returns (uint256[] memory) {
        require(wallets.length == percents.length, "Lengths mismatch");
        uint256[] memory payouts = new uint256[](wallets.length);
        for (uint256 i = 0; i < wallets.length; i++) {
            payouts[i] = (balance * percents[i]) / 100;
        }
        return payouts;
    }

}
