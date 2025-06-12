import {ethers} from 'hardhat';
import { BETTING_MAX_TIME, GAME_MAX_TIME } from "./stabs";

export async function gameLogicContractDeploy() {
  const factory = await ethers.getContractFactory("GameLogic");
  return await factory.deploy();
}

export async function gameContractDeploy(
  playerList: any,
  gameLogicAddress: string,
  bettingMaxTime = BETTING_MAX_TIME,
  gameMaxTime = GAME_MAX_TIME
) {
  const factory = await ethers.getContractFactory("DelegateCallGameStorage");
  return await factory.deploy(playerList, gameLogicAddress, bettingMaxTime, gameMaxTime);
}
