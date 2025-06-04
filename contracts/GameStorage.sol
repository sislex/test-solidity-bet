// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.2 <0.9.0;

import "./GameLogic.sol";

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

    Player[] public playerList;
    mapping(address => uint256) private playerMap;

    /// @notice Структура для передачи результатов (адрес → процент)
    struct PlayerResult {
        address wallet;
        uint8 percent;
    }

    /// @notice События, как и прежде
    event LogBet(address indexed wallet, string name, uint256 bet);
    event BettingFinished();
    event GameFinalized(uint256 timestamp);

    /// @notice Конструктор: заполняем базовые поля и список игроков
    /// @param _playerList — массив Player (name, wallet, bet), который передаёт бэкенд
    constructor(Player[] memory _playerList) {
        owner = msg.sender;
        bettingMaxTime = 5 minutes;
        gameMaxTime = 30 minutes;
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

    /// @notice Точка доступа к общему методу из GameLogic
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
        // Просто передаём свой playerList «родителю»
        return GameLogic.getAllPlayers(playerList);
    }

    /// @notice Возвращает базовые поля контракта (аналог getAllData)
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
    onlyOwner(owner) // модификатор из GameLogic
    returns (uint256 value)
    {
        return address(this).balance;
    }

    /// @notice Функция приёма эфира-ставки от игрока (receive)
    receive()
    external
    payable
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
    function finish(PlayerResult[] memory _playerResultList)
    public
    onlyOwner(owner)                         // модификатор из GameLogic
    gameNotFinished(isGameFinished)          // модификатор из GameLogic
    bettingCompleted(isBettingComplete)      // модификатор из GameLogic
    payable
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
}
