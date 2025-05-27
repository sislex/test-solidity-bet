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

    struct Player {
        string name;
        address wallet;
        uint256 bet;
        bool isPaid;
        uint256 result;
    }

    Player[] public playerList;
    mapping(address => uint256) private playerMap; // Хранит индексы игроков
    mapping(address => bool) public playerExists; // Отслеживает существование игрока

    event LogBet(address wallet, string name, uint256 bet);
    event BettingFinished();

    // constructor(Player[] memory _playerList) {
    //     init(_playerList);
    // }

    constructor() {
        Player[] memory _playerList = new Player[](2);
        _playerList[0] = Player({
            name: "Alex",
            wallet: 0x5B38Da6a701c568545dCfcB03FcB875f56beddC4,
            bet: 1,
            isPaid: false,
            result: 0
        });

        _playerList[1] = Player({
            name: "Max",
            wallet: 0xAb8483F64d9C6d1EcF9b849Ae677dD3315835cb2,
            bet: 2,
            isPaid: false,
            result: 0
        });
        init(_playerList);
    }

    function init(Player[] memory _playerList) private {
        owner = msg.sender;
        bettingMaxTime = 1 minutes;
        gameMaxTime = 30 minutes;
        createdAt = block.timestamp;

        for (uint256 i = 0; i < _playerList.length; ++i) {
            require(
                !playerExists[_playerList[i].wallet],
                "Player already exists"
            );

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
            playerExists[_playerList[i].wallet] = true;
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
            bool[] memory isPaid,
            uint256[] memory results
        )
    {
        uint256 len = playerList.length;

        names = new string[](len);
        wallets = new address[](len);
        bets = new uint256[](len);
        isPaid = new bool[](len);
        results = new uint256[](len);

        for (uint256 i = 0; i < len; i++) {
            Player storage p = playerList[i];
            names[i] = p.name;
            wallets[i] = p.wallet;
            bets[i] = p.bet;
            isPaid[i] = p.isPaid;
            results[i] = p.result;
        }

        return (names, wallets, bets, isPaid, results);
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
            bool _isGameAborted //if game was aborted by admin (or no one betted)
        )
    {
        return (
            bettingMaxTime,
            gameMaxTime,
            createdAt,
            startedAt,
            finishedAt,
            isBettingComplete,
            isGameAborted
        );
    }

    receive() external payable playerExist {
        Player storage player = playerList[playerMap[msg.sender]];

        if (msg.value >= player.bet) {
            player.isPaid = true;
            emit LogBet(msg.sender, player.name, player.bet);
        } else {
            revert("Not enough funds.");
        }
    }

    function getValueOnContract() public view returns (uint256 value) {
        return address(this).balance;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only the owner can call this function");
        _;
    }

    modifier playerExist() {
        require(playerExists[msg.sender], "Player does not exist");
        _;
    }
}
