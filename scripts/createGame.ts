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

    const tx = await contract.connect(signers[0]).createGame(
        "물복 vs 딱복",
        "물복",
        "딱복",
        Math.floor(Date.now() / 1000) + 36000000,
        { value: 1 }
    );
    const eventTopic = balanceGame.interface.getEvent("CreateGame")?.topicHash;

    const receipt = await tx.wait();
    console.log(receipt?.logs);
    const foundLog = receipt!.logs.find((log) => log.topics[0] === eventTopic)
    const parseLog = balanceGame.interface.parseLog(foundLog!);

    console.log(parseLog);
    console.log("Transaction Success");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});