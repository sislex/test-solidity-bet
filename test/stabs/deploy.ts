import {ethers} from 'hardhat';

export async function gameLogicContractDeploy() {
  const factory = await ethers.getContractFactory("GameLogic");
  return await factory.deploy();
}

export async function gameContractDeploy(playerList: any, gameLogicAddress: string) {
  const factory = await ethers.getContractFactory("DelegateCallGameStorage");
  return await factory.deploy(playerList, gameLogicAddress);
}
