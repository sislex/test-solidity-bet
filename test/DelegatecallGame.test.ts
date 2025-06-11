import { expect } from "chai";
import { ethers } from "hardhat";
import { DelegateCallGameStorage, GameLogic } from "../typechain-types";
import {gameContractDeploy, gameLogicContractDeploy} from './stabs/deploy';
import {getPlayerList3Players} from './stabs/playerList';

describe("DelegatecallGame", function () {
    let gameStorage: DelegateCallGameStorage;
    let gameLogic: GameLogic;
    let owner: any;
    let player1: any;
    let player2: any;
    let player3: any;
    const BETTING_MAX_TIME = 5 * 60;
    const GAME_MAX_TIME = 10 * 60;

    beforeEach(async function () {
        [owner, player1, player2, player3] = await ethers.getSigners();
        gameLogic = await gameLogicContractDeploy();
        gameStorage = await gameContractDeploy(
            await getPlayerList3Players(),
            await gameLogic.getAddress(),
            BETTING_MAX_TIME,
            GAME_MAX_TIME
        );
    });

    describe("Initialization", function () {
        it("Should set the correct time limits", async function () {
            const [bettingMaxTime, gameMaxTime] = await gameStorage.getGameData();
            expect(bettingMaxTime).to.equal(BETTING_MAX_TIME);
            expect(gameMaxTime).to.equal(GAME_MAX_TIME);
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

        it("Should not finish game after game time is exceeded", async function () {
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

            // Обновляем статус ставок
            await gameStorage.updateBettingStatus();

            // Увеличиваем время на 11 минут (gameMaxTime = 10 minutes)
            await ethers.provider.send("evm_increaseTime", [11 * 60]);
            await ethers.provider.send("evm_mine");

            const playerResults = [
                { wallet: player1.address, percent: 20 },
                { wallet: player2.address, percent: 30 },
                { wallet: player3.address, percent: 50 }
            ];

            await expect(
                gameStorage.finish(playerResults)
            ).to.be.revertedWith("Game time exceeded");
        });
    });

    describe("Contract Balance", function () {
        it("Should return correct contract balance", async function () {
            expect(await gameStorage.getContractBalance()).to.equal(0);

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

            expect(await gameStorage.getContractBalance()).to.equal(ethers.parseEther("6.0"));
        });

        it("Should allow owner to withdraw remaining balance", async function () {
            await player1.sendTransaction({
                to: await gameStorage.getAddress(),
                value: ethers.parseEther("1.0")
            });
            await player2.sendTransaction({
                to: await gameStorage.getAddress(),
                value: ethers.parseEther("2.0")
            });

            const initialOwnerBalance = await ethers.provider.getBalance(owner.address);
            
            const tx = await gameStorage.withdrawRemainingBalance();
            const receipt = await tx.wait();
            
            const gasUsed = receipt.gasUsed * receipt.gasPrice;
            
            expect(await gameStorage.getContractBalance()).to.equal(0);
            
            const finalOwnerBalance = await ethers.provider.getBalance(owner.address);
            expect(finalOwnerBalance + gasUsed - initialOwnerBalance).to.equal(ethers.parseEther("3.0"));
        });
    });

    describe("Game Abort", function () {
        it("Should allow owner to abort game and refund players", async function () {
            await player1.sendTransaction({
                to: await gameStorage.getAddress(),
                value: ethers.parseEther("1.0")
            });
            await player2.sendTransaction({
                to: await gameStorage.getAddress(),
                value: ethers.parseEther("2.0")
            });

            const initialBalance1 = await ethers.provider.getBalance(player1.address);
            const initialBalance2 = await ethers.provider.getBalance(player2.address);
            const initialOwnerBalance = await ethers.provider.getBalance(owner.address);

            const tx = await gameStorage.abortGame();
            const receipt = await tx.wait();
            const gasUsed = receipt.gasUsed * receipt.gasPrice;

            const finalBalance1 = await ethers.provider.getBalance(player1.address);
            const finalBalance2 = await ethers.provider.getBalance(player2.address);
            const finalOwnerBalance = await ethers.provider.getBalance(owner.address);

            expect(finalBalance1 - initialBalance1).to.equal(ethers.parseEther("1.0"));
            expect(finalBalance2 - initialBalance2).to.equal(ethers.parseEther("2.0"));
            expect(finalOwnerBalance + gasUsed - initialOwnerBalance).to.equal(0);

            const [, , , , , , isGameAborted] = await gameStorage.getGameData();
            expect(isGameAborted).to.be.true;

            expect(await gameStorage.getContractBalance()).to.equal(0);
        });
    });

    describe("Events", function () {
        it("Should emit correct events during betting", async function () {
            await expect(
              player1.sendTransaction({
                  to: await gameStorage.getAddress(),
                  value: ethers.parseEther("1.0")
              })
            ).to.emit(gameStorage, "LogBet")
              .withArgs(player1.address, "Player 1", ethers.parseEther("1.0"));

            await expect(
              player2.sendTransaction({
                  to: await gameStorage.getAddress(),
                  value: ethers.parseEther("2.0")
              })
            ).to.emit(gameStorage, "LogBet")
              .withArgs(player2.address, "Player 2", ethers.parseEther("2.0"));

            await expect(
              player3.sendTransaction({
                  to: await gameStorage.getAddress(),
                  value: ethers.parseEther("3.0")
              })
            ).to.emit(gameStorage, "LogBet")
              .withArgs(player3.address, "Player 3", ethers.parseEther("3.0"))
              .to.emit(gameStorage, "BettingFinished");

            const playerResults = [
                { wallet: player1.address, percent: 20 },
                { wallet: player2.address, percent: 30 },
                { wallet: player3.address, percent: 50 }
            ];

            await expect(
              gameStorage.finish(playerResults)
            ).to.emit(gameStorage, "GameFinalized");
        });
    });
});
