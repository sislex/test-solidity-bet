// import { expect } from "chai";
// import hre from "hardhat";
// import { Contract, ethers } from "ethers";
// const { time } = require("@nomicfoundation/hardhat-network-helpers");
//
// describe("GameStorage", function () {
//   let gameParentContract: Contract;
//   let gameContract: Contract;
//   let owner: any;
//   let player1: any;
//   let player2: any;
//
//   async function deployParentContract() {
//     const GameFactory = await hre.ethers.getContractFactory("GameLogic");
//     // @ts-ignore
//     gameParentContract = await GameFactory.deploy();
//     await gameParentContract.waitForDeployment();
//   }
//
//   async function deployContract1() {
//     [owner, player1, player2] = await hre.ethers.getSigners();
//
//     const playerList = [
//       {
//         name: "Alex",
//         wallet: player1.address,
//         bet: hre.ethers.parseEther("1"),
//         isPaid: false,
//         isPaidOut: false,
//         result: 0,
//       },
//       {
//         name: "Max",
//         wallet: player2.address,
//         bet: hre.ethers.parseEther("2"),
//         isPaid: false,
//         isPaidOut: false,
//         result: 0,
//       },
//     ];
//
//     const GameFactory = await hre.ethers.getContractFactory("GameStorage");
//     // @ts-ignore
//     gameContract = await GameFactory.deploy(playerList);
//     await gameContract.waitForDeployment();
//   }
//
//
//
//   describe("Deployment", function () {
//     beforeEach(async () => {
//       await deployParentContract();
//       await deployContract1();
//     });
//
//
//     it("Should deploy contract successfully", async function () {
//       expect(gameContract.target).to.not.equal(hre.ethers.ZeroAddress);
//     });
//   });
//
//   describe("Initialization", function () {
//     it("Should deploy GameStorage with 2 players", async function () {
//       const allPlayers = await gameContract.getAllPlayers();
//       expect(allPlayers.wallets.length).to.equal(2);
//       expect(allPlayers.names[0]).to.equal("Alex");
//       expect(allPlayers.names[1]).to.equal("Max");
//     });
//
//     // Время ставок должно быть установлено в 5 минут
//     it("should set correct betting max time (5 minutes)", async function () {
//       const [bettingMaxTime, gameMaxTime, createdAt, startedAt, finishedAt, isBettingComplete, isGameAborted] = await gameContract.getAllData();
//       expect(bettingMaxTime).to.equal(5 * 60);
//     });
//
//     // Максимальное время игры должно быть 30 минут
//     it("should set correct game max time (30 minutes)", async function () {
//       const [bettingMaxTime, gameMaxTime, createdAt, startedAt, finishedAt, isBettingComplete, isGameAborted] = await gameContract.getAllData();
//       expect(gameMaxTime).to.equal(30 * 60);
//     });
//
//     // Владелец контракта должен быть установлен правильно
//     it("should set correct owner", async function () {
//       const contractOwner = await gameContract.getOwner();
//       expect(contractOwner).to.equal(owner.address);
//     });
//
//     // Время создания должно быть задано
//     it("should set createdAt timestamp", async function () {
//       const [bettingMaxTime, gameMaxTime, createdAt, startedAt, finishedAt, isBettingComplete, isGameAborted] = await gameContract.getAllData();
//       expect(createdAt).to.not.equal(0);
//       const currentTime = Math.floor(Date.now() / 1000);
//       expect(createdAt).to.be.closeTo(currentTime, 5);
//     });
//
//     // Данные игроков должны быть установлены правильно
//     it("should have correct initial player data", async function () {
//       const [names, wallets, bets] = await gameContract.getAllPlayers();
//
//       expect(names[0]).to.equal("Alex");
//       expect(wallets[0]).to.equal(player1.address);
//       expect(bets[0]).to.equal(ethers.parseEther("1"));
//
//
//       expect(names[1]).to.equal("Max");
//       expect(wallets[1]).to.equal(player2.address);
//       expect(bets[1]).to.equal(ethers.parseEther("2"));
//     });
//   });
//
//   describe("Pay (Bet Placement)", function () {
//     // Принимает правильную ставку от существующего игрока
//     it("should accept correct bet from existing player", async function () {
//       const [,, bets] = await gameContract.getAllPlayers();
//       const bet = bets[0];
//
//       await expect(
//         player1.sendTransaction({
//           to: gameContract.target,
//           value: bet,
//         })
//       ).to.emit(gameContract, "LogBet");
//     });
//
//     // Отклоняет повторную ставку от того же игрока
//     it("should reject second bet from same player", async function () {
//       const [,, bets] = await gameContract.getAllPlayers();
//       const bet = bets[0];
//
//       await expect(
//         player1.sendTransaction({
//           to: gameContract.target,
//           value: bet,
//         })
//       ).to.be.revertedWith("Player has paid");
//     });
//
//     // Отклоняет ставку с неправильной суммой
//     it("should reject incorrect bet amount", async function () {
//       const [,, bets] = await gameContract.getAllPlayers();
//       const bet = bets[1];
//
//       await expect(
//         player2.sendTransaction({
//           to: gameContract.target,
//           value: bet - ethers.parseEther("0.5"),
//         })
//       ).to.be.revertedWith("Incorrect bet amount");
//     });
//
//     // Отклоняет ставку после окончания времени ставок
//     it("should reject bet after betting time is over", async function () {
//       const [bettingMaxTime, gameMaxTime, createdAt, startedAt, finishedAt, isBettingComplete, isGameAborted] = await gameContract.getAllData();
//
//       await time.increaseTo(
//         createdAt + bettingMaxTime + BigInt(1)
//       );
//
//       const [,, bets] = await gameContract.getAllPlayers();
//       const bet = bets[1];
//
//       await expect(
//         player2.sendTransaction({
//           to: gameContract.target,
//           value: bet,
//         })
//       ).to.be.revertedWith("Betting time is over");
//     });
//
//
//     // Отклоняет ставку, если все игроки уже поставили
//     it("should reject bet when all players have already bet", async function () {
//       // Заново деплоим чистый контракт
//       await deployContract1();
//
//       const [,, bets] = await gameContract.getAllPlayers();
//
//       const tx1 = await player1.sendTransaction({
//         to: gameContract.target,
//         value: bets[0],
//       });
//       await tx1.wait();
//
//       const tx2 =  await player2.sendTransaction({
//         to: gameContract.target,
//         value: bets[1],
//       });
//       await tx2.wait();
//
//       await expect(
//         player2.sendTransaction({
//           to: gameContract.target,
//           value: bets[1],
//         })
//       ).to.be.revertedWith("Betting already completed");
//     });
//
//     // Отклоняет ставку от несуществующего игрока
//     it("should reject bet from non-existing player", async function () {
//       await deployContract1();
//       const [, , , ,nonPlayer] = await hre.ethers.getSigners();
//
//
//       await expect(
//         nonPlayer.sendTransaction({
//           to: gameContract.target,
//           value: ethers.parseEther("1"),
//         })
//       ).to.be.revertedWith("Player does not exist");
//     });
//
//     // Корректно эмитирует событие LogBet с правильными параметрами
//     it("should emit LogBet event with correct player address and bet amount", async function () {
//       const [names] = await gameContract.getAllPlayers();
//       const [,, bets] = await gameContract.getAllPlayers();
//
//       const alexBet = bets[0];
//       const alexName = names[0];
//
//       await expect(
//         player1.sendTransaction({
//           to: gameContract.target,
//           value: alexBet,
//         })
//       )
//         .to.emit(gameContract, "LogBet")
//         .withArgs(player1.address, alexName, alexBet);
//     });
//
//   });
//
//   describe("Betting Completion", function () {
//
//     // Проверяем, что isBettingComplete становится true, когда все игроки оплатили
//     it("should set isBettingComplete to true when all players have paid", async function () {
//       await deployContract1();
//       let [bettingMaxTime, gameMaxTime, createdAt, startedAt, finishedAt, isBettingComplete, isGameAborted] = await gameContract.getAllData();
//       expect(isBettingComplete).to.be.false;
//
//
//       const [names, wallets, bets] = await gameContract.getAllPlayers();
//
//       const tx1 = await player1.sendTransaction({
//         to: gameContract.target,
//         value: bets[0],
//       });
//       await tx1.wait(); // wait transaction to be mined
//
//       [bettingMaxTime, gameMaxTime, createdAt, startedAt, finishedAt, isBettingComplete, isGameAborted] = await gameContract.getAllData();
//       expect(isBettingComplete).to.be.false;
//
//       const tx2 =   await player2.sendTransaction({
//         to: gameContract.target,
//         value: bets[1],
//       });
//       await tx2.wait(); // wait transaction to be mined
//       [bettingMaxTime, gameMaxTime, createdAt, startedAt, finishedAt, isBettingComplete, isGameAborted] = await gameContract.getAllData();
//       expect(isBettingComplete).to.be.true;
//     });
//
//     // Проверяем, что startedAt устанавливается когда все игроки сделали ставки
//     it("should set startedAt when all players have paid", async function () {
//       await deployContract1();
//
//       let [bettingMaxTime, gameMaxTime, createdAt, startedAt, finishedAt, isBettingComplete, isGameAborted] = await gameContract.getAllData();
//       expect(startedAt).to.equal(0);
//
//       const [,, bets] = await gameContract.getAllPlayers();
//
//       const tx1 = await player1.sendTransaction({
//         to: gameContract.target,
//         value: bets[0],
//       });
//       await tx1.wait(); // wait transaction to be mined
//
//       [bettingMaxTime, gameMaxTime, createdAt, startedAt, finishedAt, isBettingComplete, isGameAborted] = await gameContract.getAllData();
//       expect(startedAt).to.equal(0);
//
//       const tx2 = await player2.sendTransaction({
//         to: gameContract.target,
//         value: bets[1],
//       });
//
//       await tx2.wait(); // wait transaction to be mined
//       const expectedStartedAt = await time.latest();
//
//       // Проверяем, что startedAt установился
//       [bettingMaxTime, gameMaxTime, createdAt, startedAt, finishedAt, isBettingComplete, isGameAborted] = await gameContract.getAllData();
//       expect(startedAt).to.not.equal(0);
//       expect(startedAt).to.equal(expectedStartedAt);
//     });
//
//     // Проверяем, что startedAt не устанавливается, если не все игроки сделали ставки
//     it("should not set startedAt if not all players have paid", async function () {
//       await deployContract1();
//
//       const [,, bets] = await gameContract.getAllPlayers();
//
//       const tx1 = await player1.sendTransaction({
//         to: gameContract.target,
//         value: bets[0],
//       });
//       await tx1.wait(); // wait transaction to be mined
//
//       let [bettingMaxTime, gameMaxTime, createdAt, startedAt, finishedAt, isBettingComplete, isGameAborted] = await gameContract.getAllData();
//       await time.increaseTo(createdAt + bettingMaxTime + BigInt(1));
//
//       expect(startedAt).to.equal(0);
//     });
//
//   });
//
//   // describe("Force finish by time", function () {
//   //   beforeEach(async function () {
//   //     await deployContract1();
//   //     const [,, bets] = await gameContract.getAllPlayers();
//   //     const tx1 = await player1.sendTransaction({ to: gameContract.target, value: bets[0] });
//   //     await tx1.wait(); // wait transaction to be mined
//   //     const tx2 = await player2.sendTransaction({ to: gameContract.target, value: bets[1] });
//   //     await tx2.wait(); // wait transaction to be mined
//   //   });
//   // });
//
// });
