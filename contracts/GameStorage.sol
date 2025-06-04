// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.2 <0.9.0;

import "./GameLogic.sol";

contract GameStorage is GameLogic {

    /// @notice Конструктор: заполняем базовые поля и список игроков
    /// @param _playerList — массив Player (name, wallet, bet), который передаёт бэкенд
    constructor(Player[] memory _playerList) {
        init(_playerList);
    }

    function getOwner() public view returns (address) {
        return owner;
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
    {
        _receive();
    }

    /// @notice Завершение игры — выплата и финализация
    function finish(PlayerResult[] memory _playerResultList)
    public
    payable
    {
        _finish(_playerResultList);
    }
}
