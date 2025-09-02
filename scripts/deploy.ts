import { ethers } from "hardhat";

async function main() {
  console.log('deploying BalanceGame contract')
  const BalanceGame = await ethers.getContractFactory("BalanceGame");
  const balanceGame = await BalanceGame.deploy(1, 1);
  await balanceGame.waitForDeployment();

  console.log(`vendingMachine contract is deployed to ${balanceGame.target}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
