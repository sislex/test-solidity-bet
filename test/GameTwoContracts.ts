import { expect } from "chai";
import hre from "hardhat";
import { Contract } from "ethers";

describe("GameTwoContracts", function () {
  let gameContract: Contract;
  let owner: any;
  let player1: any;
  let player2: any;

  async function deployContract() {
    [owner, player1, player2] = await hre.ethers.getSigners();

    const playerList = [
      {
        name: "Alex",
        wallet: player1.address,
        bet: hre.ethers.parseEther("1"),
        isPaid: false,
        isPaidOut: false,
        result: 0,
      },
      {
        name: "Max",
        wallet: player2.address,
        bet: hre.ethers.parseEther("2"),
        isPaid: false,
        isPaidOut: false,
        result: 0,
      },
    ];

    const GameFactory = await hre.ethers.getContractFactory("GameStorage");
    // @ts-ignore
    gameContract = await GameFactory.deploy(playerList);
    await gameContract.waitForDeployment();
  }

  describe("Deployment", function () {
    beforeEach(async () => {
      await deployContract();
    });


    it("Should deploy contract successfully", async function () {
      expect(gameContract.target).to.not.equal(hre.ethers.ZeroAddress);
    });
  });

  describe("Initialization", function () {
    it("Should deploy GameStorage with 2 players", async function () {
      const allPlayers = await gameContract.getAllPlayers();
      expect(allPlayers.wallets.length).to.equal(2);
      expect(allPlayers.names[0]).to.equal("Alex");
      expect(allPlayers.names[1]).to.equal("Max");
    });

    // Время ставок должно быть установлено в 5 минут
    it("should set correct betting max time (5 minutes)", async function () {
      const bettingMaxTime = await gameContract.bettingMaxTime();
      expect(bettingMaxTime).to.equal(5 * 60);
    });

    // Максимальное время игры должно быть 30 минут
    it("should set correct game max time (30 minutes)", async function () {
      const gameMaxTime = await gameContract.gameMaxTime();
      expect(gameMaxTime).to.equal(30 * 60);
    });

  });






});
