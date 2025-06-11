// SPDX-License-Identifier: GPL-3.0

import "hardhat/console.sol";

pragma solidity >=0.8.2 <0.9.0;

contract GameBase {
    struct Player {
        string name;
        address wallet;
        uint256 bet;
        bool isPaid;
        bool isPaidOut;
        uint256 result;
    }

    struct PlayerResult {
        address wallet;
        uint8 percent;
    }

    address internal owner;
    uint256 internal bettingMaxTime;
    uint256 internal gameMaxTime;

    uint256 internal createdAt;
    uint256 internal startedAt;
    uint256 internal finishedAt;

    bool internal isBettingComplete = false;
    bool internal isGameAborted = false;
    bool internal isGameFinished = false;

    Player[] internal playerList;
    mapping(address => uint256) internal playerMap;
    mapping(address => bool) internal playerExists;

    address internal logicAddr;

    event LogBet(address indexed wallet, string name, uint256 bet);
    event BettingFinished();
    event GameFinalized(uint256 timestamp);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only the owner can call this function");
        _;
    }

    modifier gameNotFinished() {
        require(!isGameFinished, "Game is already finished");
        _;
    }

    modifier playerExist() {
        require(playerExists[msg.sender], "Player does not exist");
        _;
    }

    modifier bettingTimeNotFinished() {
        require(block.timestamp <= createdAt + bettingMaxTime, "Betting time is over");
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

    modifier validLogicAddress() {
        require(logicAddr != address(0), "Invalid logic contract address");
        _;
    }

    modifier gameNotAborted() {
        require(!isGameAborted, "Game is aborted");
        _;
    }

    modifier gameTimeNotExceeded() {
        require(block.timestamp <= startedAt + gameMaxTime, "Game time exceeded");
        _;
    }

    modifier playerNotPaid(uint256 idx) {
        require(!playerList[idx].isPaid, "Player has already paid");
        _;
    }

    modifier playerNotPaidOut(uint256 idx) {
        require(!playerList[idx].isPaidOut, "Player has already been paid out");
        _;
    }

    modifier sufficientBalance(uint256 amount) {
        require(address(this).balance >= amount, "Insufficient contract balance");
        _;
    }

    function _init(
        Player[] memory _playerList,
        address _logicAddr,
        uint256 _bettingMaxTime,
        uint256 _gameMaxTime
    ) internal {
        require(_playerList.length > 0, "Player list cannot be empty");
        require(_logicAddr != address(0), "Invalid logic contract address");
        require(_bettingMaxTime > 0, "Betting time must be greater than 0");
        require(_gameMaxTime > 0, "Game time must be greater than 0");

        owner = msg.sender;
        createdAt = block.timestamp;
        logicAddr = _logicAddr;
        bettingMaxTime = _bettingMaxTime;
        gameMaxTime = _gameMaxTime;

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

    function _updateBettingStatus() internal
        validLogicAddress
        gameNotFinished
        gameNotAborted
    {
        bool  isAllPaid  = true;

        for (uint256 i = 0; i < playerList.length; i++) {
            if (!playerList[i].isPaid) {
                isAllPaid = false;
                break;
            }
        }

        if (isAllPaid && !isBettingComplete) {
            isBettingComplete = true;
            startedAt = block.timestamp; // Todo: change to when the game actually starts
            emit BettingFinished();
        }
    }

    function _finish(PlayerResult[] memory _playerResultList) internal
        validLogicAddress
        onlyOwner
        gameNotFinished
        bettingCompleted
        gameNotAborted
        gameTimeNotExceeded
    {
        uint256 balance = address(this).balance;

        address[] memory wallets = new address[](_playerResultList.length);
        uint8[] memory percents = new uint8[](_playerResultList.length);
        for (uint256 i = 0; i < _playerResultList.length; i++) {
            wallets[i] = _playerResultList[i].wallet;
            percents[i] = _playerResultList[i].percent;
        }

        (bool success, bytes memory result) = logicAddr.delegatecall(
            abi.encodeWithSignature(
                "calculatePayouts(uint256,address[],uint8[])",
                balance,
                wallets,
                percents
            )
        );
        require(success, "Delegatecall failed");

        uint256[] memory payouts = abi.decode(result, (uint256[]));

        for (uint256 i = 0; i < _playerResultList.length; i++) {
            address recipient = wallets[i];
            uint256 amount = payouts[i];
            if (amount > 0) {
                (bool transferSuccess, ) = payable(recipient).call{value: amount}("");
                require(transferSuccess, "Payment failed");

                uint256 idx = playerMap[recipient];
                playerList[idx].result = amount;
                playerList[idx].isPaidOut = true;
            }
        }

        payable(owner).transfer(address(this).balance);
        isGameFinished = true;
        finishedAt = block.timestamp;
        emit GameFinalized(block.timestamp);
    }

    function _receive() internal
        gameNotFinished
        bettingNotCompleted
        bettingTimeNotFinished
        playerExist
        gameNotAborted
    {
        uint256 idx = playerMap[msg.sender];
        Player storage player = playerList[idx];
        require(!player.isPaid, "Player has already paid");
        require(msg.value == player.bet, "Incorrect bet amount");

        player.isPaid = true;

        _updateBettingStatus();

        emit LogBet(msg.sender, player.name, player.bet);
    }

    function _getPlayer(uint256 index) internal view returns (Player memory) {
        return playerList[index];
    }

    function _getAllPlayers() internal view returns (
        string[] memory names,
        address[] memory wallets,
        uint256[] memory bets,
        bool[] memory isPaid,
        bool[] memory isPaidOut,
        uint256[] memory results
    ) {
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

    function _getGameData() internal view returns (
        uint256,
        uint256,
        uint256,
        uint256,
        uint256,
        bool,
        bool,
        bool
    ) {
        return (
            bettingMaxTime,
            gameMaxTime,
            createdAt,
            startedAt,
            finishedAt,
            isBettingComplete,
            isGameAborted,
            isGameFinished
        );
    }

    function _getContractBalance() internal view returns (uint256) {
        return address(this).balance;
    }

    function _withdrawRemainingBalance() internal
        onlyOwner
        gameNotFinished
        gameNotAborted
    {
        uint256 balance = address(this).balance;
        require(balance > 0, "No balance to withdraw");
        
        (bool success, ) = payable(owner).call{value: balance}("");
        require(success, "Transfer failed");
    }

    function _abortGame() internal
        onlyOwner
        gameNotFinished
        gameNotAborted
    {
        isGameAborted = true;
        
        for (uint256 i = 0; i < playerList.length; i++) {
            if (playerList[i].isPaid && !playerList[i].isPaidOut) {
                (bool success, ) = payable(playerList[i].wallet).call{value: playerList[i].bet}("");
                require(success, "Refund failed");
                playerList[i].isPaidOut = true;
            }
        }
        
        if (address(this).balance > 0) {
            (bool success, ) = payable(owner).call{value: address(this).balance}("");
            require(success, "Owner refund failed");
        }
    }
}
