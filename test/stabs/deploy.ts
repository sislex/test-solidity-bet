import {ethers} from 'hardhat';

export async function gameLogicContractDeploy() {
  const factory = await ethers.getContractFactory("GameLogic");
  return await factory.deploy();
}

export async function gameContractDeploy(
  playerList: any, 
  gameLogicAddress: string,
  bettingMaxTime: number = 5 * 60,
  gameMaxTime: number = 10 * 60
) {
  const factory = await ethers.getContractFactory("DelegateCallGameStorage");
  return await factory.deploy(playerList, gameLogicAddress, bettingMaxTime, gameMaxTime);
}
