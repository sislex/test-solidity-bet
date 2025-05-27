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

    struct PlayerResult {
        address wallet;
        uint8 percent;
    }

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
            bet: 1 ether,
            isPaid: false,
            result: 0
        });

        _playerList[1] = Player({
            name: "Max",
            wallet: 0xAb8483F64d9C6d1EcF9b849Ae677dD3315835cb2,
            bet: 2 ether,
            isPaid: false,
            result: 0
        });
        init(_playerList);
    }

    function init(Player[] memory _playerList) private {
        owner = msg.sender;
        bettingMaxTime = 5 minutes;
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

    receive() external payable playerExist bettingTimeFinished {
        Player storage player = playerList[playerMap[msg.sender]];

        if (msg.value >= player.bet) {
            player.isPaid = true;
            emit LogBet(msg.sender, player.name, player.bet);
            setBettingComplete();
        } else {
            revert("Not enough funds.");
        }
    }

    function setBettingComplete() private {
        bool _isBettingComplete = true;
        for (uint256 i = 0; i < playerList.length; ++i) {
            Player storage player = playerList[i];
            if (!player.isPaid) {
                _isBettingComplete = false;
                break;
            }
        }
        if (!isBettingComplete && _isBettingComplete) {
            isBettingComplete = true;
            startedAt = block.timestamp; // Todo: need to change (Alex)
            emit BettingFinished();
        }
    }

    function getValueOnContract() public view returns (uint256 value) {
        return address(this).balance;
    }

    // function finish(PlayerResult[] memory _playerResultList) public payable {
    //     fifnshTransaction(_playerResultList);
    // }

    function finish() public payable {
        PlayerResult[] memory _playerResultList = new PlayerResult[](2);
        _playerResultList[0] = PlayerResult({
            wallet: 0x5B38Da6a701c568545dCfcB03FcB875f56beddC4,
            percent: 45
        });
        _playerResultList[1] = PlayerResult({
            wallet: 0xAb8483F64d9C6d1EcF9b849Ae677dD3315835cb2,
            percent: 45
        });

        fifnshTransaction(_playerResultList);
        sendMoneyToOwner();
    }

    function sendMoneyToOwner() private {
        payable(owner).transfer(address(this).balance);
    }

    function fifnshTransaction(PlayerResult[] memory _playerResultList)
        private
    {
        uint balance = address(this).balance;
        for (uint256 i = 0; i < _playerResultList.length; ++i) {
            PlayerResult memory playerResult = _playerResultList[i];
            uint256 index = playerMap[playerResult.wallet];
            Player storage player = playerList[index];

            uint256 result = 0;

            if (playerResult.percent > 0) {
                result = (balance * playerResult.percent) / 100;
                payable(player.wallet).transfer(result);
            }

            player.result = result;
        }
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only the owner can call this function");
        _;
    }

    modifier playerExist() {
        require(playerExists[msg.sender], "Player does not exist");
        _;
    }

    modifier bettingTimeFinished() {
        require(
            block.timestamp <= createdAt + bettingMaxTime,
            "Betting time is finished"
        );
        _;
    }
}
