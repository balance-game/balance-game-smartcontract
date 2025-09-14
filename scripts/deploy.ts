import { ethers } from "hardhat";

async function main(): Promise<string> {
  const subscriptionId = "";

  console.log('deploying BalanceGame contract')
  const BalanceGame = await ethers.getContractFactory("BalanceGame");
  const balanceGame = await BalanceGame.deploy(1, subscriptionId);

  console.log(`vendingMachine contract is deployed to ${balanceGame.target}`);

  return balanceGame.target.toString();
}

export default main;

main().catch((err) => {
  console.error(err);
});