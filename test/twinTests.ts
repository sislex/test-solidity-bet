import { expect } from "chai";
import { ethers } from "hardhat";
import { DelegateCallGameStorage, DelegateCallGameLogic } from "../typechain-types";

describe("Multiple DelegateCallGameStorage connections", function () {
    let gameLogic: DelegateCallGameLogic;
    let gameStorage1: DelegateCallGameStorage;
    let gameStorage2: DelegateCallGameStorage;
    let owner: any;
    let player1: any;
    let player2: any;
    let player3: any;
    let player4: any;

    beforeEach(async function () {
        [owner, player1, player2, player3, player4] = await ethers.getSigners();

        // Деплоим один контракт логики
        const GameLogic = await ethers.getContractFactory("DelegateCallGameLogic");
        gameLogic = await GameLogic.deploy();

        // Деплоим два storage-контракта с разными игроками
        const GameStorage = await ethers.getContractFactory("DelegateCallGameStorage");
        
        // Первый storage с игроками 1 и 2
        const playerList1 = [
            {
                name: "Player 1",
                wallet: player1.address,
                bet: ethers.parseEther("1.0"),
                isPaid: false,
                isPaidOut: false,
                result: 0n
            },
            {
                name: "Player 2",
                wallet: player2.address,
                bet: ethers.parseEther("2.0"),
                isPaid: false,
                isPaidOut: false,
                result: 0n
            }
        ];
        gameStorage1 = await GameStorage.deploy(playerList1, await gameLogic.getAddress());

        // Второй storage с игроками 3 и 4
        const playerList2 = [
            {
                name: "Player 3",
                wallet: player3.address,
                bet: ethers.parseEther("3.0"),
                isPaid: false,
                isPaidOut: false,
                result: 0n
            },
            {
                name: "Player 4",
                wallet: player4.address,
                bet: ethers.parseEther("4.0"),
                isPaid: false,
                isPaidOut: false,
                result: 0n
            }
        ];
        gameStorage2 = await GameStorage.deploy(playerList2, await gameLogic.getAddress());
    });

    it("Should not mix data between storage contracts", async function () {
        // Делаем ставки в первом storage
        await player1.sendTransaction({
            to: await gameStorage1.getAddress(),
            value: ethers.parseEther("1.0")
        });
        await player2.sendTransaction({
            to: await gameStorage1.getAddress(),
            value: ethers.parseEther("2.0")
        });

        // Делаем ставки во втором storage
        await player3.sendTransaction({
            to: await gameStorage2.getAddress(),
            value: ethers.parseEther("3.0")
        });
        await player4.sendTransaction({
            to: await gameStorage2.getAddress(),
            value: ethers.parseEther("4.0")
        });

        // Завершаем игру в первом storage
        await gameStorage1.updateBettingStatus();
        const playerResults1 = [
            { wallet: player1.address, percent: 40 },
            { wallet: player2.address, percent: 60 }
        ];
        await gameStorage1.finish(playerResults1);

        // Завершаем игру во втором storage
        await gameStorage2.updateBettingStatus();
        const playerResults2 = [
            { wallet: player3.address, percent: 30 },
            { wallet: player4.address, percent: 70 }
        ];
        await gameStorage2.finish(playerResults2);

        // Проверяем результаты в первом storage
        const [, , , , , results1] = await gameStorage1.getAllPlayers();
        expect(results1[0]).to.equal(ethers.parseEther("1.2")); // 40% от 3 ETH
        expect(results1[1]).to.equal(ethers.parseEther("1.8")); // 60% от 3 ETH

        // Проверяем результаты во втором storage
        const [, , , , , results2] = await gameStorage2.getAllPlayers();
        expect(results2[0]).to.equal(ethers.parseEther("2.1")); // 30% от 7 ETH
        expect(results2[1]).to.equal(ethers.parseEther("4.9")); // 70% от 7 ETH
    });
}); 