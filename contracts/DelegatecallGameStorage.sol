// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.2 <0.9.0;

import "./DelegatecallGameStorageBase.sol";

contract DelegateCallGameStorage is DelegatecallGameStorageBase {
    constructor(Player[] memory _playerList) {
        _init(_playerList);
    }

    function updateBettingStatus(address logicAddr) public {
        _updateBettingStatus(logicAddr);
    }

    function finish(PlayerResult[] memory _playerResultList, address logicAddr) public payable {
        _finish(_playerResultList, logicAddr);
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
