// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.2 <0.9.0;

import "./DelegatecallGameStorageBase.sol";

contract DelegateCallGameStorage is DelegatecallGameStorageBase {
    constructor(Player[] memory _playerList, address logicAddr) {
        _init(_playerList, logicAddr);
    }

    function updateBettingStatus() public {
        _updateBettingStatus();
    }

    function finish(PlayerResult[] memory _playerResultList) public payable {
        _finish(_playerResultList);
    }

    receive() external payable {
        _receive();
    }

    function getPlayer(uint256 index) public view returns (Player memory) {
        return _getPlayer(index);
    }

    function getAllPlayers() public view returns (
        string[] memory names,
        address[] memory wallets,
        uint256[] memory bets,
        bool[] memory isPaid,
        bool[] memory isPaidOut,
        uint256[] memory results
    ) {
        return _getAllPlayers();
    }
}
