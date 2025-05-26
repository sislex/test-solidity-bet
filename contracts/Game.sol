// SPDX-License-Identifier: GPL-3.0

pragma solidity >=0.8.2 <0.9.0;

contract Game {
    address public owner;
    uint256 public bettingMaxTime;
    uint256 public gameMaxTime;

    uint256 public createdAt;
    uint256 public startedAt;
    uint256 public finishedAt;

    bool public isBettingComplete = false;
    bool public isGameAborted = false;
    bool public isGameFinished = false;

    uint256 public bank;

    struct Player {
        string name;
        address wallet;
        uint256 bet;
        bool isPaid;
        uint256 result;
    }

    Player[] public playerList;
    mapping (address => uint) private playerMap;

    event LogBet(address wallet, string name, uint256 bet);
    event BettingFinished();

    constructor(Player[] memory _playerList) {
        owner = msg.sender;
        bettingMaxTime = 1 minutes; // can be changed
        gameMaxTime = 30 minutes; // can be changed
        createdAt = block.timestamp;
        for (uint256 i = 0; i < _playerList.length; ++i) {
            playerList.push(
                Player({
                    name: _playerList[i].name,
                    wallet: _playerList[i].wallet,
                    bet: _playerList[i].bet,
                    isPaid: false,
                    result: 0
                })
            );
            playerMap[_playerList[i].wallet] = i;
        }
    }

    function getAllPlayers()
        public
        view
        onlyOwner
        returns (
            string[] memory names,
            address[] memory wallets,
            uint256[] memory bets,
            bool[] memory isPaids,
            uint256[] memory results
        )
    {
        uint256 len = playerList.length;

        names = new string[](len);
        wallets = new address[](len);
        bets = new uint256[](len);
        isPaids = new bool[](len);
        results = new uint256[](len);

        for (uint256 i = 0; i < len; i++) {
            Player storage p = playerList[i];
            names[i] = p.name;
            wallets[i] = p.wallet;
            bets[i] = p.bet;
            isPaids[i] = p.isPaid;
            results[i] = p.result;
        }

        return (names, wallets, bets, isPaids, results);
    }

    function getAllData()
        public
        view
        returns (
            uint256 _bettingMaxTime, //30 minutes
            uint256 _gameMaxTime, //1 minutes,
            uint256 _createdAt,
            uint256 _startedAt,
            uint256 _finished,
            bool _isBettingComplete, // if all bettors paid or not
            bool _isGameAborted, //if game was aborted by admin (or no one betted)
            uint256 _bankBalance
        )
    {
        return (
            bettingMaxTime,
            gameMaxTime,
            createdAt,
            startedAt,
            finishedAt,
            isBettingComplete,
            isGameAborted,
            bank
        );
    }

    receive() external payable {
        Player storage player = playerList[playerMap[msg.sender]];
        // check player exist
        if (playerMap[msg.sender] >= 0) {  // check if player exist in list and no one betted
             if (msg.value >= player.bet) {
            player.isPaid = true;
            emit LogBet(msg.sender, player.name, player.bet);
        } else {
            revert("Not enough funds.");
        }
        } else {
            revert("Player does not exist.");
        }


    }

    function  getValueOnContract() public view returns (uint256 value) {
        return address(this).balance;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only the owner can call this function");
        _;
    }
}
