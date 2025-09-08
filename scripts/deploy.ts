import { ethers } from "hardhat";

async function main(cost: number, subscriptionId: number): Promise<string> {
  console.log('deploying BalanceGame contract')
  const BalanceGame = await ethers.getContractFactory("BalanceGame");
  const balanceGame = await BalanceGame.deploy(cost, subscriptionId);

  console.log(`vendingMachine contract is deployed to ${balanceGame.target}`);

  return balanceGame.target.toString();
}

export default main;