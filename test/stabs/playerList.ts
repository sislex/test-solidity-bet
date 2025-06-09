import {ethers} from 'hardhat';

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
