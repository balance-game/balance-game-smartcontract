import { ethers } from "hardhat";
import { BalanceGame } from "../typechain-types";

async function main() {
    if (!process.env.CONTRACT_ADDRESS) {
        throw new Error("can not found contractAddress");
    }
    const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;

    const balanceGame = await ethers.getContractFactory("BalanceGame");
    const contract = balanceGame.attach(CONTRACT_ADDRESS) as BalanceGame;
    const signers = await ethers.getSigners();

    const tx = await contract.claimPool(16);

    const receipt = await tx.wait();
    console.log(receipt?.logs);

    console.log("Transaction Success");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});