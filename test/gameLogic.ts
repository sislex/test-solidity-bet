import { expect } from "chai";
import { ethers } from "hardhat";
import { GameLogic } from "../typechain-types";
import {gameLogicContractDeploy} from './stabs/deploy';

describe("GameLogic", function () {
    let gameLogic: GameLogic;

    beforeEach(async function () {
        gameLogic = await gameLogicContractDeploy();
    });

    describe("Pure Functions", function () {
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

    });
});
