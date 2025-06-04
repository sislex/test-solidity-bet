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

    /// @notice Структура для передачи результатов (адрес → процент)
    struct PlayerResult {
        address wallet;
        uint8 percent;
    }

    address internal owner;

    uint256 internal bettingMaxTime = 5 minutes;
    uint256 internal gameMaxTime = 30 minutes;

    uint256 internal createdAt;
    uint256 internal startedAt;
    uint256 internal finishedAt;

    bool internal isBettingComplete = false;
    bool internal isGameAborted = false;
    bool internal isGameFinished = false;

    Player[] internal playerList;
    mapping(address => uint256) internal playerMap;

    mapping(address => bool) internal playerExists;

    /// @notice События, как и прежде
    event LogBet(address indexed wallet, string name, uint256 bet);
    event BettingFinished();
    event GameFinalized(uint256 timestamp);

    function init(Player[] memory _playerList) internal {
        owner = msg.sender;
        createdAt = block.timestamp;

        for (uint256 i = 0; i < _playerList.length; ++i) {
            require(!playerExists[_playerList[i].wallet], "Player already exists");

            playerList.push(
                Player({
                    name: _playerList[i].name,
                    wallet: _playerList[i].wallet,
                    bet: _playerList[i].bet,
                    isPaid: false,
                    isPaidOut: false,
                    result: 0
                })
            );
            playerMap[_playerList[i].wallet] = i;
            playerExists[_playerList[i].wallet] = true;
        }
    }

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

    function _receive()
    internal
    gameNotFinished(isGameFinished)             // модификатор из GameLogic
    bettingNotCompleted(isBettingComplete)      // модификатор из GameLogic
    bettingTimeNotFinished(createdAt, bettingMaxTime) // модификатор из GameLogic
    playerExist                                 // модификатор из GameLogic
    {
        Player storage player = playerList[playerMap[msg.sender]];
        require(!player.isPaid, "Player has paid");
        require(msg.value == player.bet, "Incorrect bet amount");

        player.isPaid = true;
        emit LogBet(msg.sender, player.name, player.bet);

        // проверяем, оплатили ли все
        bool[] memory paidFlags = new bool[](playerList.length);
        for (uint256 i = 0; i < playerList.length; i++) {
            paidFlags[i] = playerList[i].isPaid;
        }

        bool allPaid = checkBettingComplete(paidFlags); // функция из GameLogic
        if (allPaid && !isBettingComplete) {
            isBettingComplete = true;
            startedAt = block.timestamp;
            emit BettingFinished();
        }
    }

    /// @notice Завершение игры — выплата и финализация
    function _finish(PlayerResult[] memory _playerResultList)
    internal
    onlyOwner(owner)                         // модификатор из GameLogic
    gameNotFinished(isGameFinished)          // модификатор из GameLogic
    bettingCompleted(isBettingComplete)      // модификатор из GameLogic
    {
        uint256 balance = address(this).balance;

        // формируем локальные массивы для Wallets / Percents
        address[] memory wallets = new address[](_playerResultList.length);
        uint8[] memory percents = new uint8[](_playerResultList.length);
        for (uint256 i = 0; i < _playerResultList.length; i++) {
            wallets[i] = _playerResultList[i].wallet;
            percents[i] = _playerResultList[i].percent;
        }

        // считаем, сколько каждому отправить
        uint256[] memory payouts = calculatePayouts(balance, wallets, percents);

        // отправляем и отмечаем, что выплачено
        for (uint256 i = 0; i < _playerResultList.length; i++) {
            address recipient = wallets[i];
            uint256 amount = payouts[i];
            if (amount > 0) {
                (bool success, ) = payable(recipient).call{value: amount}("");
                require(success, "Payment failed");

                uint256 idx = playerMap[recipient];
                playerList[idx].result = amount;
                playerList[idx].isPaidOut = true;
            }
        }

        // проверяем, выплатили ли уже всем
        bool[] memory paidOutFlags = new bool[](playerList.length);
        for (uint256 i = 0; i < playerList.length; i++) {
            paidOutFlags[i] = playerList[i].isPaidOut;
        }
        require(checkAllPaidOut(paidOutFlags), "Not all players have been paid");

        // остаток — владельцу и завершаем игру
        payable(owner).transfer(address(this).balance);
        isGameFinished = true;
        finishedAt = block.timestamp;
        emit GameFinalized(block.timestamp);
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
