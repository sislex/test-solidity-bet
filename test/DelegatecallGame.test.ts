import { expect } from "chai";
import { ethers } from "hardhat";
import { DelegateCallGameStorage, GameLogic } from "../typechain-types";
import {gameContractDeploy, gameLogicContractDeploy} from './stabs/deploy';
import { BETTING_MAX_TIME, GAME_MAX_TIME, getPlayerList3Players } from "./stabs/playerList";

describe("DelegatecallGame", function () {
    let gameStorage: DelegateCallGameStorage;
    let gameLogic: GameLogic;
    let owner: any;
    let player1: any;
    let player2: any;
    let player3: any;

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

    describe("Check initialization data", function () {
        it("Should be the correct time limits", async function () {
            const [bettingMaxTime, gameMaxTime] = await gameStorage.getGameData();
            expect(bettingMaxTime).to.equal(BETTING_MAX_TIME);
            expect(gameMaxTime).to.equal(GAME_MAX_TIME);
        });
    });

    describe("Check initialization data", function () {

        it("Should revert when initializing with empty player list", async function () {
            const emptyPlayerList: any[] = [];

            await expect(
              gameContractDeploy(
                emptyPlayerList,
                await gameLogic.getAddress(),
                BETTING_MAX_TIME,
                GAME_MAX_TIME
              )
            ).to.be.revertedWith("Player list cannot be empty");
        });

        it("Should revert when initializing with zero logic address", async function () {
            const zeroAddress = "0x0000000000000000000000000000000000000000";

            await expect(
              gameContractDeploy(
                await getPlayerList3Players(),
                zeroAddress,
                BETTING_MAX_TIME,
                GAME_MAX_TIME
              )
            ).to.be.revertedWith("Invalid logic contract address");
        });

        it("Should revert when initializing with zero betting time", async function () {
            await expect(
              gameContractDeploy(
                await getPlayerList3Players(),
                await gameLogic.getAddress(),
                0,
                GAME_MAX_TIME
              )
            ).to.be.revertedWith("Betting time must be greater than 0");
        });

        it("Should revert when initializing with zero game time", async function () {
            await expect(
              gameContractDeploy(
                await getPlayerList3Players(),
                await gameLogic.getAddress(),
                BETTING_MAX_TIME,
                0
              )
            ).to.be.revertedWith("Game time must be greater than 0");
        });
    });

    describe("Time Restrictions", function () {
        it("Should update betting status when all players have placed bets", async function () {
            const [,,,startedAt,finishedAt,isBettingComplete,isGameAborted,isGameFinished] = await gameStorage.getGameData();
            expect(isBettingComplete).to.be.false;
            expect(startedAt).to.equal(0);
            expect(finishedAt).to.equal(0);
            expect(isGameAborted).to.be.false;
            expect(isGameFinished).to.be.false;

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

            await gameStorage.updateBettingStatus();

            const [,,,newStartedAt,newFinishedAt,newIsBettingComplete,newIsGameAborted,newIsGameFinished] = await gameStorage.getGameData();
            expect(newIsBettingComplete).to.be.true;
            expect(newStartedAt).to.be.greaterThan(0);
            expect(newFinishedAt).to.equal(0);
            expect(newIsGameAborted).to.be.false;
            expect(newIsGameFinished).to.be.false;
        });

        it("Should successfully finish game and distribute winnings", async function () {
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

            // Проверяем начальные балансы
            const initialBalance1 = await ethers.provider.getBalance(player1.address);
            const initialBalance2 = await ethers.provider.getBalance(player2.address);
            const initialBalance3 = await ethers.provider.getBalance(player3.address);

            // Завершаем игру с распределением выигрышей
            const playerResults = [
                { wallet: player1.address, percent: 20 },
                { wallet: player2.address, percent: 30 },
                { wallet: player3.address, percent: 50 }
            ];

            const tx = await gameStorage.finish(playerResults);
            await tx.wait();

            // Проверяем финальные балансы
            const finalBalance1 = await ethers.provider.getBalance(player1.address);
            const finalBalance2 = await ethers.provider.getBalance(player2.address);
            const finalBalance3 = await ethers.provider.getBalance(player3.address);

            // Проверяем распределение выигрышей (6 ETH всего)
            expect(finalBalance1 - initialBalance1).to.equal(ethers.parseEther("1.2")); // 20% от 6 ETH
            expect(finalBalance2 - initialBalance2).to.equal(ethers.parseEther("1.8")); // 30% от 6 ETH
            expect(finalBalance3 - initialBalance3).to.equal(ethers.parseEther("3.0")); // 50% от 6 ETH

            // Проверяем состояние игры
            const [,,,startedAt,finishedAt,isBettingComplete,isGameAborted,isGameFinished] = await gameStorage.getGameData();
            expect(isGameFinished).to.be.true;
            expect(finishedAt).to.be.greaterThan(0);
            expect(isBettingComplete).to.be.true;
            expect(isGameAborted).to.be.false;

            // Проверяем, что контракт пустой
            expect(await gameStorage.getContractBalance()).to.equal(0);
        });

        describe("updateBettingStatus negative scenarios", function () {
            it("Should not update status when not all players have placed bets", async function () {

                await player1.sendTransaction({
                    to: await gameStorage.getAddress(),
                    value: ethers.parseEther("1.0")
                });

                await gameStorage.updateBettingStatus();

                const [,,,startedAt,finishedAt,isBettingComplete,isGameAborted,isGameFinished] = await gameStorage.getGameData();
                expect(isBettingComplete).to.be.false;
                expect(startedAt).to.equal(0);
                expect(finishedAt).to.equal(0);
                expect(isGameAborted).to.be.false;
                expect(isGameFinished).to.be.false;
            });

            it("Should revert when trying to update status after game is finished", async function () {

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

                await gameStorage.updateBettingStatus();

                const playerResults = [
                    { wallet: player1.address, percent: 20 },
                    { wallet: player2.address, percent: 30 },
                    { wallet: player3.address, percent: 50 }
                ];

                await gameStorage.finish(playerResults);

                await expect(
                  gameStorage.updateBettingStatus()
                ).to.be.revertedWith("Game is already finished");
            });

            it("Should revert when trying to update status after game is aborted", async function () {

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

                await gameStorage.abortGame();

                await expect(
                  gameStorage.updateBettingStatus()
                ).to.be.revertedWith("Game is aborted");
            });
        });

        it("Should not accept bets after betting time is over", async function () {

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

            await gameStorage.updateBettingStatus();

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

            if (!receipt) {
                throw new Error("Transaction receipt is null");
            }

            const gasUsed = receipt.gasUsed * receipt.gasPrice;

            expect(await gameStorage.getContractBalance()).to.equal(0);

            const finalOwnerBalance = await ethers.provider.getBalance(owner.address);
            expect(finalOwnerBalance + gasUsed - initialOwnerBalance).to.equal(ethers.parseEther("3.0"));
        });

        it("Should revert when non-owner tries to withdraw balance", async function () {
            await player1.sendTransaction({
                to: await gameStorage.getAddress(),
                value: ethers.parseEther("1.0")
            });

            await expect(
              gameStorage.connect(player1).withdrawRemainingBalance()
            ).to.be.revertedWith("Only the owner can call this function");
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

            if (!receipt) {
                throw new Error("Transaction receipt is null");
            }

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

        it("Should revert when non-owner tries to abort game", async function () {
            await player1.sendTransaction({
                to: await gameStorage.getAddress(),
                value: ethers.parseEther("1.0")
            });

            await expect(
              gameStorage.connect(player1).abortGame()
            ).to.be.revertedWith("Only the owner can call this function");
        });

        it("Should revert when trying to abort game after it is finished", async function () {
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

            await gameStorage.updateBettingStatus();

            const playerResults = [
                { wallet: player1.address, percent: 20 },
                { wallet: player2.address, percent: 30 },
                { wallet: player3.address, percent: 50 }
            ];

            await gameStorage.finish(playerResults);

            await expect(
              gameStorage.abortGame()
            ).to.be.revertedWith("Game is already finished");
        });

        it("Should revert when trying to abort game after it is already aborted", async function () {
            await player1.sendTransaction({
                to: await gameStorage.getAddress(),
                value: ethers.parseEther("1.0")
            });

            await gameStorage.abortGame();

            await expect(
              gameStorage.abortGame()
            ).to.be.revertedWith("Game is aborted");
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

    describe("finish negative scenarios", function () {
        it("Should revert when trying to finish game before all players have placed bets", async function () {
            await player1.sendTransaction({
                to: await gameStorage.getAddress(),
                value: ethers.parseEther("1.0")
            });

            const playerResults = [
                { wallet: player1.address, percent: 20 },
                { wallet: player2.address, percent: 30 },
                { wallet: player3.address, percent: 50 }
            ];

            await expect(
              gameStorage.finish(playerResults)
            ).to.be.revertedWith("Betting not completed yet");
        });

        it("Should revert when trying to finish game after game time is exceeded", async function () {
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

            await gameStorage.updateBettingStatus();

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

        it("Should revert when trying to finish game after game is aborted", async function () {
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

            await gameStorage.updateBettingStatus();
            await gameStorage.abortGame();

            const playerResults = [
                { wallet: player1.address, percent: 20 },
                { wallet: player2.address, percent: 30 },
                { wallet: player3.address, percent: 50 }
            ];

            await expect(
              gameStorage.finish(playerResults)
            ).to.be.revertedWith("Game is aborted");
        });

        it("Should revert when trying to finish game with incorrect percentages", async function () {
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

            await gameStorage.updateBettingStatus();

            const playerResults = [
                { wallet: player1.address, percent: 20 },
                { wallet: player2.address, percent: 30 },
                { wallet: player3.address, percent: 40 } // Sum 90% instead of 100%
            ];

            await expect(
              gameStorage.finish(playerResults)
            ).to.be.revertedWith("Delegatecall failed");
        });

        it("Should revert when trying to finish game with invalid player address", async function () {
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

            await gameStorage.updateBettingStatus();

            const playerResults = [
                { wallet: player1.address, percent: 20 },
                { wallet: player2.address, percent: 30 },
                { wallet: "0x0000000000000000000000000000000000000000", percent: 50 } // Invalid address
            ];

            await expect(
              gameStorage.finish(playerResults)
            ).to.be.revertedWith("Delegatecall failed");
        });

        it("Should revert when non-owner tries to finish game", async function () {
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

            await gameStorage.updateBettingStatus();

            const playerResults = [
                { wallet: player1.address, percent: 20 },
                { wallet: player2.address, percent: 30 },
                { wallet: player3.address, percent: 50 }
            ];

            await expect(
              gameStorage.connect(player1).finish(playerResults)
            ).to.be.revertedWith("Only the owner can call this function");
        });
    });

    describe("Betting Scenarios", function () {
        it("Should revert when trying to place bet after betting time is over", async function () {
            await ethers.provider.send("evm_increaseTime", [6 * 60]); // 6 minutes > bettingMaxTime (5 minutes)
            await ethers.provider.send("evm_mine");

            await expect(
              player1.sendTransaction({
                  to: await gameStorage.getAddress(),
                  value: ethers.parseEther("1.0")
              })
            ).to.be.revertedWith("Betting time is over");
        });

        it("Should revert when trying to place bet after game is finished", async function () {
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

            await gameStorage.updateBettingStatus();

            const playerResults = [
                { wallet: player1.address, percent: 20 },
                { wallet: player2.address, percent: 30 },
                { wallet: player3.address, percent: 50 }
            ];

            await gameStorage.finish(playerResults);

            await expect(
              player1.sendTransaction({
                  to: await gameStorage.getAddress(),
                  value: ethers.parseEther("1.0")
              })
            ).to.be.revertedWith("Game is already finished");
        });

        it("Should revert when trying to place bet after game is aborted", async function () {
            await player1.sendTransaction({
                to: await gameStorage.getAddress(),
                value: ethers.parseEther("1.0")
            });

            await gameStorage.abortGame();

            await expect(
              player2.sendTransaction({
                  to: await gameStorage.getAddress(),
                  value: ethers.parseEther("2.0")
              })
            ).to.be.revertedWith("Game is aborted");
        });

        it("Should revert when non-registered player tries to place bet", async function () {
            const [nonRegisteredPlayer] = await ethers.getSigners();

            await expect(
              nonRegisteredPlayer.sendTransaction({
                  to: await gameStorage.getAddress(),
                  value: ethers.parseEther("1.0")
              })
            ).to.be.revertedWith("Player does not exist");
        });

        it("Should revert when trying to place bet with incorrect amount", async function () {
            await expect(
              player1.sendTransaction({
                  to: await gameStorage.getAddress(),
                  value: ethers.parseEther("2.0") // Should be 1.0
              })
            ).to.be.revertedWith("Incorrect bet amount");
        });

        it("Should revert when trying to place bet twice", async function () {
            await player1.sendTransaction({
                to: await gameStorage.getAddress(),
                value: ethers.parseEther("1.0")
            });

            await expect(
              player1.sendTransaction({
                  to: await gameStorage.getAddress(),
                  value: ethers.parseEther("1.0")
              })
            ).to.be.revertedWith("Player has already paid");
        });
    });
});
