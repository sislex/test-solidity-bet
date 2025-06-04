// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.2 <0.9.0;

contract GameLogic {
    struct Player {
        string name;
        address wallet;
        uint256 bet;
        bool isPaid;
        bool isPaidOut;
        uint256 result;
    }

    mapping(address => bool) internal playerExists;

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

    function getAllPlayers(Player[] memory playerList)
    public
    pure
    returns (
        string[] memory names,
        address[] memory wallets,
        uint256[] memory bets,
        bool[] memory isPaid,
        bool[] memory isPaidOut,
        uint256[] memory results
    )
    {
        uint256 len = playerList.length;
        names = new string[](len);
        wallets = new address[](len);
        bets = new uint256[](len);
        isPaid = new bool[](len);
        isPaidOut = new bool[](len);
        results = new uint256[](len);

        for (uint256 i = 0; i < len; i++) {
            Player memory p = playerList[i];
            names[i] = p.name;
            wallets[i] = p.wallet;
            bets[i] = p.bet;
            isPaid[i] = p.isPaid;
            isPaidOut[i] = p.isPaidOut;
            results[i] = p.result;
        }
        return (names, wallets, bets, isPaid, isPaidOut, results);
    }

    modifier onlyOwner(address _owner) {
        require(msg.sender == _owner, "Only the owner can call this function");
        _;
    }

    modifier gameNotFinished(bool isGameFinished) {
        require(!isGameFinished, "Game is already finished");
        _;
    }

    modifier playerExist() {
        require(playerExists[msg.sender], "Player does not exist");
        _;
    }

    modifier bettingTimeNotFinished(uint256 createdAt, uint256 bettingMaxTime) {
        require(block.timestamp <= createdAt + bettingMaxTime, "Betting time is over");
        _;
    }

    modifier bettingNotCompleted(bool isBettingComplete) {
        require(!isBettingComplete, "Betting already completed");
        _;
    }

    modifier bettingCompleted(bool isBettingComplete) {
        require(isBettingComplete, "Betting not completed yet");
        _;
    }
}
