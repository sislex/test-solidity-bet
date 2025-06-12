import {ethers} from 'hardhat';


export const BETTING_MAX_TIME = 5 * 60;
export const BETTING_MAX_TIME_IS_OVER = 6 * 60;
export const GAME_MAX_TIME = 10 * 60;
export const GAME_MAX_TIME_IS_OVER = 11 * 60;

export async function getPlayerList3Players() {
  const [owner, player1, player2, player3] = await ethers.getSigners();

  return [
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
  ]
}
