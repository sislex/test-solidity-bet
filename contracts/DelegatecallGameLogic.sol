// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.2 <0.9.0;

contract DelegateCallGameLogic {
    function checkBettingComplete(bool[] memory isPaidList) public pure returns (bool) {
        for (uint256 i = 0; i < isPaidList.length; i++) {
            if (!isPaidList[i]) return false;
        }
        return true;
    }

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

    function checkAllPaidOut(bool[] memory isPaidOutList) public pure returns (bool) {
        for (uint256 i = 0; i < isPaidOutList.length; i++) {
            if (!isPaidOutList[i]) return false;
        }
        return true;
    }

    function getAllPlayers(
        string[] memory names,
        address[] memory wallets,
        uint256[] memory bets,
        bool[] memory isPaid,
        bool[] memory isPaidOut,
        uint256[] memory results
    ) public pure returns (
        string[] memory,
        address[] memory,
        uint256[] memory,
        bool[] memory,
        bool[] memory,
        uint256[] memory
    ) {
        return (names, wallets, bets, isPaid, isPaidOut, results);
    }
}
