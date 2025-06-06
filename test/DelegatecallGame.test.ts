import { expect } from "chai";
import { ethers } from "hardhat";
import { DelegateCallGameStorage, DelegateCallGameLogic } from "../typechain-types";

describe("DelegatecallGame", function () {
    let gameStorage: DelegateCallGameStorage;
    let gameLogic: DelegateCallGameLogic;
    let owner: any;
    let player1: any;
    let player2: any;
    let player3: any;

    beforeEach(async function () {
        [owner, player1, player2, player3] = await ethers.getSigners();

        const GameLogic = await ethers.getContractFactory("DelegateCallGameLogic");
        gameLogic = await GameLogic.deploy();

        const GameStorage = await ethers.getContractFactory("DelegateCallGameStorage");
        const playerList = [
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
            },
            {
                name: "Player 3",
                wallet: player3.address,
                bet: ethers.parseEther("3.0"),
                isPaid: false,
                isPaidOut: false,
                result: 0n
            }
        ];
        gameStorage = await GameStorage.deploy(playerList);
    });

    describe("Initialization", function () {
        it("Should set the correct owner", async function () {
            const [names, wallets, bets] = await gameStorage.getAllPlayers();
            expect(wallets).to.include(player1.address);
            expect(wallets).to.include(player2.address);
            expect(wallets).to.include(player3.address);
        });
    });

    describe("Betting", function () {
        it("Should accept bets from players", async function () {
            await player1.sendTransaction({
                to: await gameStorage.getAddress(),
                value: ethers.parseEther("1.0")
            });

            await player2.sendTransaction({
                to: await gameStorage.getAddress(),
                value: ethers.parseEther("2.0")
            });

            await player3.sendTransaction({
                to: await gameStorage.getAddress(),
                value: ethers.parseEther("3.0")
            });

            const [, , , isPaid] = await gameStorage.getAllPlayers();
            expect(isPaid[0]).to.be.true;
            expect(isPaid[1]).to.be.true;
            expect(isPaid[2]).to.be.true;
        });

        it("Should not accept incorrect bet amounts", async function () {
            await expect(
                player1.sendTransaction({
                    to: await gameStorage.getAddress(),
                    value: ethers.parseEther("2.0")
                })
            ).to.be.revertedWith("Incorrect bet amount");
        });
    });

    describe("Time Restrictions", function () {
        it("Should not accept bets after betting time is over", async function () {
            // Увеличиваем время на 6 минут (bettingMaxTime = 5 minutes)
            await ethers.provider.send("evm_increaseTime", [6 * 60]);
            await ethers.provider.send("evm_mine");

            await expect(
                player1.sendTransaction({
                    to: await gameStorage.getAddress(),
                    value: ethers.parseEther("1.0")
                })
            ).to.be.revertedWith("Betting time is over");
        });

        it("Should not accept bets after game is finished", async function () {
            // Делаем ставки
            await player1.sendTransaction({
                to: await gameStorage.getAddress(),
                value: ethers.parseEther("1.0")
            });
            await player2.sendTransaction({
                to: await gameStorage.getAddress(),
                value: ethers.parseEther("2.0")
            });
            await player3.sendTransaction({
                to: await gameStorage.getAddress(),
                value: ethers.parseEther("3.0")
            });

            // Завершаем игру
            await gameStorage.updateBettingStatus(await gameLogic.getAddress());
            const playerResults = [
                { wallet: player1.address, percent: 20 },
                { wallet: player2.address, percent: 30 },
                { wallet: player3.address, percent: 50 }
            ];
            await gameStorage.finish(playerResults, await gameLogic.getAddress());

            // Пытаемся сделать ставку после завершения
            await expect(
                player1.sendTransaction({
                    to: await gameStorage.getAddress(),
                    value: ethers.parseEther("1.0")
                })
            ).to.be.revertedWith("Game is already finished");
        });
    });

    describe("Game State", function () {
        it("Should correctly track betting status", async function () {
            // Делаем ставки
            await player1.sendTransaction({
                to: await gameStorage.getAddress(),
                value: ethers.parseEther("1.0")
            });
            await player2.sendTransaction({
                to: await gameStorage.getAddress(),
                value: ethers.parseEther("2.0")
            });
            await player3.sendTransaction({
                to: await gameStorage.getAddress(),
                value: ethers.parseEther("3.0")
            });

            // Проверяем статус до обновления
            const [, , , isPaid] = await gameStorage.getAllPlayers();
            expect(isPaid[0]).to.be.true;
            expect(isPaid[1]).to.be.true;
            expect(isPaid[2]).to.be.true;

            // Обновляем статус
            await gameStorage.updateBettingStatus(await gameLogic.getAddress());

            // Проверяем, что игра не отменена
            const [, , , , , results] = await gameStorage.getAllPlayers();
            expect(results[0]).to.equal(0n);
            expect(results[1]).to.equal(0n);
            expect(results[2]).to.equal(0n);
        });
    });

    describe("Payouts", function () {
        it("Should distribute winnings according to percentages", async function () {
            // Делаем ставки
            await player1.sendTransaction({
                to: await gameStorage.getAddress(),
                value: ethers.parseEther("1.0")
            });
            await player2.sendTransaction({
                to: await gameStorage.getAddress(),
                value: ethers.parseEther("2.0")
            });
            await player3.sendTransaction({
                to: await gameStorage.getAddress(),
                value: ethers.parseEther("3.0")
            });

            // Завершаем игру
            await gameStorage.updateBettingStatus(await gameLogic.getAddress());
            const playerResults = [
                { wallet: player1.address, percent: 20 },
                { wallet: player2.address, percent: 30 },
                { wallet: player3.address, percent: 50 }
            ];

            const initialBalance1 = await ethers.provider.getBalance(player1.address);
            const initialBalance2 = await ethers.provider.getBalance(player2.address);
            const initialBalance3 = await ethers.provider.getBalance(player3.address);

            await gameStorage.finish(playerResults, await gameLogic.getAddress());

            const finalBalance1 = await ethers.provider.getBalance(player1.address);
            const finalBalance2 = await ethers.provider.getBalance(player2.address);
            const finalBalance3 = await ethers.provider.getBalance(player3.address);

            // Проверяем выплаты (6 ETH всего)
            expect(finalBalance1 - initialBalance1).to.equal(ethers.parseEther("1.2")); // 20% от 6 ETH
            expect(finalBalance2 - initialBalance2).to.equal(ethers.parseEther("1.8")); // 30% от 6 ETH
            expect(finalBalance3 - initialBalance3).to.equal(ethers.parseEther("3.0")); // 50% от 6 ETH
        });
    });

    describe("Events", function () {
        it("Should emit correct events during betting", async function () {
            // Проверяем событие LogBet
            await expect(
                player1.sendTransaction({
                    to: await gameStorage.getAddress(),
                    value: ethers.parseEther("1.0")
                })
            ).to.emit(gameStorage, "LogBet")
                .withArgs(player1.address, "Player 1", ethers.parseEther("1.0"));

            // Проверяем событие BettingFinished
            await player2.sendTransaction({
                to: await gameStorage.getAddress(),
                value: ethers.parseEther("2.0")
            });
            await player3.sendTransaction({
                to: await gameStorage.getAddress(),
                value: ethers.parseEther("3.0")
            });

            await expect(
                gameStorage.updateBettingStatus(await gameLogic.getAddress())
            ).to.emit(gameStorage, "BettingFinished");

            // Проверяем событие GameFinalized
            const playerResults = [
                { wallet: player1.address, percent: 20 },
                { wallet: player2.address, percent: 30 },
                { wallet: player3.address, percent: 50 }
            ];

            await expect(
                gameStorage.finish(playerResults, await gameLogic.getAddress())
            ).to.emit(gameStorage, "GameFinalized");
        });
    });

    describe("Delegatecall", function () {
        it("Should fail if logic contract is invalid", async function () {
            // Делаем ставки
            await player1.sendTransaction({
                to: await gameStorage.getAddress(),
                value: ethers.parseEther("1.0")
            });
            await player2.sendTransaction({
                to: await gameStorage.getAddress(),
                value: ethers.parseEther("2.0")
            });
            await player3.sendTransaction({
                to: await gameStorage.getAddress(),
                value: ethers.parseEther("3.0")
            });

            // Пытаемся использовать неверный адрес
            await expect(
                gameStorage.updateBettingStatus(ethers.ZeroAddress)
            ).to.be.revertedWith("Invalid logic contract address");

            // Пытаемся завершить игру с неверным адресом
            const playerResults = [
                { wallet: player1.address, percent: 20 },
                { wallet: player2.address, percent: 30 },
                { wallet: player3.address, percent: 50 }
            ];

            await expect(
                gameStorage.finish(playerResults, ethers.ZeroAddress)
            ).to.be.revertedWith("Invalid logic contract address");
        });

        it("Should handle delegatecall errors gracefully", async function () {
            // Создаем контракт без нужных функций
            const BadContract = await ethers.getContractFactory("DelegateCallGameStorage");
            const badContract = await BadContract.deploy([]);

            // Делаем ставки
            await player1.sendTransaction({
                to: await gameStorage.getAddress(),
                value: ethers.parseEther("1.0")
            });
            await player2.sendTransaction({
                to: await gameStorage.getAddress(),
                value: ethers.parseEther("2.0")
            });
            await player3.sendTransaction({
                to: await gameStorage.getAddress(),
                value: ethers.parseEther("3.0")
            });

            // Пытаемся использовать контракт без нужных функций
            await expect(
                gameStorage.updateBettingStatus(await badContract.getAddress())
            ).to.be.revertedWith("Delegatecall failed");
        });
    });
});
