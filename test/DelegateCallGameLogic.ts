import { expect } from "chai";
import { ethers } from "hardhat";
import { DelegateCallGameLogic } from "../typechain-types";

describe("DelegateCallGameLogic", function () {
    let gameLogic: DelegateCallGameLogic;

    beforeEach(async function () {
        const GameLogic = await ethers.getContractFactory("DelegateCallGameLogic");
        gameLogic = await GameLogic.deploy();
    });

    describe("Pure Functions", function () {
        it("Should check if all players have paid", async function () {
            const isPaidList = [true, true, true];
            expect(await gameLogic.checkBettingComplete(isPaidList)).to.be.true;

            const isPaidList2 = [true, false, true];
            expect(await gameLogic.checkBettingComplete(isPaidList2)).to.be.false;
        });

        it("Should calculate payouts correctly", async function () {
            const balance = ethers.parseEther("1.0");
            const wallets = [
                "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
                "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC"
            ];
            const percents = [60, 40];

            const payouts = await gameLogic.calculatePayouts(balance, wallets, percents);
            expect(payouts[0]).to.equal(ethers.parseEther("0.6"));
            expect(payouts[1]).to.equal(ethers.parseEther("0.4"));
        });

        it("Should check if all players have been paid out", async function () {
            const isPaidOutList = [true, true, true];
            expect(await gameLogic.checkAllPaidOut(isPaidOutList)).to.be.true;

            const isPaidOutList2 = [true, false, true];
            expect(await gameLogic.checkAllPaidOut(isPaidOutList2)).to.be.false;
        });

        it("Should get all players data", async function () {
            const names = ["Alice", "Bob", "Charlie"];
            const wallets = [
                "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
                "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
                "0x90F79bf6EB2c4f870365E785982E1f101E93b906"
            ];
            const bets = [
                ethers.parseEther("1.0"),
                ethers.parseEther("2.0"),
                ethers.parseEther("3.0")
            ];
            const isPaid = [true, true, false];
            const isPaidOut = [false, false, false];
            const results = [0, 0, 0];

            const result = await gameLogic.getAllPlayers(
                names,
                wallets,
                bets,
                isPaid,
                isPaidOut,
                results
            );

            expect(result[0]).to.deep.equal(names);
            expect(result[1]).to.deep.equal(wallets);
            expect(result[2]).to.deep.equal(bets);
            expect(result[3]).to.deep.equal(isPaid);
            expect(result[4]).to.deep.equal(isPaidOut);
            expect(result[5]).to.deep.equal(results);
        });
    });
});
