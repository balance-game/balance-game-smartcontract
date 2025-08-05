import { ethers } from "hardhat";

async function main() {
  console.log('deploying BalanceGame contract')
  const BalanceGame = await ethers.getContractFactory("BalanceGame");
  const balanceGame = await BalanceGame.deploy(1);
  await balanceGame.waitForDeployment();

  console.log(`vendingMachine contract is deployed to ${balanceGame.target}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
