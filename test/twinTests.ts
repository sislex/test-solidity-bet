import { expect } from "chai";
import { ethers } from "hardhat";
import { DelegateCallGameStorage, DelegateCallGameLogic } from "../typechain-types";

describe("Множественное подключение DelegateCallGameLogic к разным storage-контрактам", function () {
    let gameLogic: DelegateCallGameLogic;
    let storage1: DelegateCallGameStorage;
    let storage2: DelegateCallGameStorage;
    let owner: any, p1: any, p2: any, p3: any, p4: any, p5: any, p6: any;

    beforeEach(async function () {
        [owner, p1, p2, p3, p4, p5, p6] = await ethers.getSigners();

        const GameLogic = await ethers.getContractFactory("DelegateCallGameLogic");
        gameLogic = await GameLogic.deploy();

        const GameStorage = await ethers.getContractFactory("DelegateCallGameStorage");
        // Первый storage с 3 игроками
        const playerList1 = [
            { name: "A", wallet: p1.address, bet: ethers.parseEther("1.0"), isPaid: false, isPaidOut: false, result: 0n },
            { name: "B", wallet: p2.address, bet: ethers.parseEther("2.0"), isPaid: false, isPaidOut: false, result: 0n },
            { name: "C", wallet: p3.address, bet: ethers.parseEther("3.0"), isPaid: false, isPaidOut: false, result: 0n }
        ];
        // Второй storage с другими игроками
        const playerList2 = [
            { name: "X", wallet: p4.address, bet: ethers.parseEther("1.5"), isPaid: false, isPaidOut: false, result: 0n },
            { name: "Y", wallet: p5.address, bet: ethers.parseEther("2.5"), isPaid: false, isPaidOut: false, result: 0n },
            { name: "Z", wallet: p6.address, bet: ethers.parseEther("3.5"), isPaid: false, isPaidOut: false, result: 0n }
        ];
        storage1 = await GameStorage.deploy(playerList1);
        storage2 = await GameStorage.deploy(playerList2);
    });

    it("Данные не перемешиваются между storage-контрактами", async function () {
        // Игроки делают ставки в storage1
        await p1.sendTransaction({ to: await storage1.getAddress(), value: ethers.parseEther("1.0") });
        await p2.sendTransaction({ to: await storage1.getAddress(), value: ethers.parseEther("2.0") });
        await p3.sendTransaction({ to: await storage1.getAddress(), value: ethers.parseEther("3.0") });

        // Игроки делают ставки в storage2
        await p4.sendTransaction({ to: await storage2.getAddress(), value: ethers.parseEther("1.5") });
        await p5.sendTransaction({ to: await storage2.getAddress(), value: ethers.parseEther("2.5") });
        await p6.sendTransaction({ to: await storage2.getAddress(), value: ethers.parseEther("3.5") });

        // Завершаем ставки и игру в обоих storage-контрактах
        await storage1.updateBettingStatus(await gameLogic.getAddress());
        await storage2.updateBettingStatus(await gameLogic.getAddress());

        const results1 = [
            { wallet: p1.address, percent: 10 },
            { wallet: p2.address, percent: 30 },
            { wallet: p3.address, percent: 60 }
        ];
        const results2 = [
            { wallet: p4.address, percent: 20 },
            { wallet: p5.address, percent: 30 },
            { wallet: p6.address, percent: 50 }
        ];

        await storage1.finish(results1, await gameLogic.getAddress());
        await storage2.finish(results2, await gameLogic.getAddress());

        // Проверяем, что выплаты и состояния не перемешались
        const [, , , , , resultsOut1] = await storage1.getAllPlayers();
        const [, , , , , resultsOut2] = await storage2.getAllPlayers();

        // Проверяем, что суммы выплат разные и соответствуют своим storage
        expect(resultsOut1[0]).to.not.equal(resultsOut2[0]);
        expect(resultsOut1[1]).to.not.equal(resultsOut2[1]);
        expect(resultsOut1[2]).to.not.equal(resultsOut2[2]);
    });
}); 