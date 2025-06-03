// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.2 <0.9.0;

// Контракт GameLogic остается без изменений
contract GameLogic {

    function checkBettingComplete(bool[] memory isPaidList) public pure returns (bool) {
        for (uint256 i = 0; i < isPaidList.length; i++) {
            if (!isPaidList[i]) return false;
        }
        return true;
    }

    function calculatePayouts(uint256 balance, address[] memory wallets, uint8[] memory percents) public pure returns (uint256[] memory) {
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
}

contract GameStorage is GameLogic {
    address public owner;
    uint256 public bettingMaxTime;
    uint256 public gameMaxTime;

    uint256 public createdAt;
    uint256 public startedAt;
    uint256 public finishedAt;

    bool public isBettingComplete = false;
    bool public isGameAborted = false;
    bool public isGameFinished = false;

    /// @notice Структура игрока хранится только здесь, в «дочернем» контракте
    struct Player {
        string name;
        address wallet;
        uint256 bet;
        bool isPaid;
        bool isPaidOut;
        uint256 result;
    }

    /// @notice Список игроков и вспомогательные отображения
    Player[] public playerList;
    mapping(address => uint256) private playerMap;
    mapping(address => bool) public playerExists;

    /// @notice Структура для передачи результатов (адрес → процент)
    struct PlayerResult {
        address wallet;
        uint8 percent;
    }

    /// @notice События, как и в исходном контракте
    event LogBet(address indexed wallet, string name, uint256 bet);
    event BettingFinished();
    event GameFinalized(uint256 timestamp);

    /// @notice Конструктор: данные о игроках (имена, адреса, ставки) передаются бэкендом при деплое.
    /// @param _playerList массив заранее подготовленных Player (имя, адрес, ставка)
    constructor(Player[] memory _playerList) {
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
                    isPaidOut: false,
                    result: 0
                })
            );
            playerMap[_playerList[i].wallet] = i;
            playerExists[_playerList[i].wallet] = true;
        }
    }

    /// @notice Возвращает всю информацию о списке игроков (аналог getAllPlayers)
    function getAllPlayers()
    public
    view
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
            Player storage p = playerList[i];
            names[i] = p.name;
            wallets[i] = p.wallet;
            bets[i] = p.bet;
            isPaid[i] = p.isPaid;
            isPaidOut[i] = p.isPaidOut;
            results[i] = p.result;
        }
        return (names, wallets, bets, isPaid, isPaidOut, results);
    }

    /// @notice Возвращает базовые параметры игры (аналог getAllData)
    function getAllData()
    public
    view
    returns (
        uint256 _bettingMaxTime,
        uint256 _gameMaxTime,
        uint256 _createdAt,
        uint256 _startedAt,
        uint256 _finishedAt,
        bool _isBettingComplete,
        bool _isGameAborted
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

    /// @notice Получить баланс контракта (только для владельца)
    function getValueOnContract()
    public
    view
    onlyOwner
    returns (uint256 value)
    {
        return address(this).balance;
    }

    /// @notice Функция для приема эфир-ставки от игрока (receive)
    receive()
    external
    payable
    gameNotFinished
    bettingNotCompleted
    bettingTimeNotFinished
    playerExist
    {
        Player storage player = playerList[playerMap[msg.sender]];
        require(!player.isPaid, "Player has paid");
        require(msg.value == player.bet, "Incorrect bet amount");

        player.isPaid = true;
        emit LogBet(msg.sender, player.name, player.bet);

        // собираем текущий список isPaid, чтобы передать в логику родителя
        bool[] memory paidFlags = new bool[](playerList.length);
        for (uint256 i = 0; i < playerList.length; i++) {
            paidFlags[i] = playerList[i].isPaid;
        }

        // вызываем чистую функцию из родительского контракта
        bool allPaid = checkBettingComplete(paidFlags);
        if (allPaid && !isBettingComplete) {
            isBettingComplete = true;
            startedAt = block.timestamp;
            emit BettingFinished();
        }
    }

    /// @notice Завершение игры (с), вызывает распределение денег
    function finish(PlayerResult[] memory _playerResultList)
    public
    onlyOwner
    gameNotFinished
    bettingCompleted
    payable
    {
        uint256 balance = address(this).balance;

        // Собираем массив адресов и процентов в локальные массивы для передачи в родителя
        address[] memory wallets = new address[](_playerResultList.length);
        uint8[] memory percents = new uint8[](_playerResultList.length);
        for (uint256 i = 0; i < _playerResultList.length; i++) {
            wallets[i] = _playerResultList[i].wallet;
            percents[i] = _playerResultList[i].percent;
        }

        // Рассчитываем, сколько отправить каждому (чистая функция из родителя)
        uint256[] memory payouts = calculatePayouts(balance, wallets, percents);

        // Выплачиваем каждому, обновляем хранилище «дочернего»
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

        // Проверяем, завершена ли выплата всем игрокам
        bool[] memory paidOutFlags = new bool[](playerList.length);
        for (uint256 i = 0; i < playerList.length; i++) {
            paidOutFlags[i] = playerList[i].isPaidOut;
        }
        require(checkAllPaidOut(paidOutFlags), "Not all players have been paid");

        // Отправляем остаток владельцу и помечаем игру как завершённую
        payable(owner).transfer(address(this).balance);
        isGameFinished = true;
        finishedAt = block.timestamp;
        emit GameFinalized(block.timestamp);
    }

    ////////////////////////////////
    //       МОДИФИКАТОРЫ        //
    ////////////////////////////////

    modifier onlyOwner() {
        require(msg.sender == owner, "Only the owner can call this function");
        _;
    }

    modifier playerExist() {
        require(playerExists[msg.sender], "Player does not exist");
        _;
    }

    modifier bettingTimeNotFinished() {
        require(
            block.timestamp <= createdAt + bettingMaxTime,
            "Betting time is over"
        );
        _;
    }

    modifier bettingNotCompleted() {
        require(!isBettingComplete, "Betting already completed");
        _;
    }

    modifier bettingCompleted() {
        require(isBettingComplete, "Betting not completed yet");
        _;
    }

    modifier gameNotFinished() {
        require(!isGameFinished, "Game is already finished");
        _;
    }
}
