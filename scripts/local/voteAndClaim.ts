import { ethers } from "hardhat";
import { BalanceGame } from "../../typechain-types";
import * as dotenv from "dotenv";

dotenv.config({ quiet: true });


/**
 * 
 * TEMP FILE
 * Not Working
 * VRF ISSUE
 * 
 */

async function deployContract() {
  console.log('deploying BalanceGame contract')
  const BalanceGame = await ethers.getContractFactory("BalanceGame");
  const balanceGame = await BalanceGame.deploy(1, 1);
  await balanceGame.waitForDeployment();

  console.log(`vendingMachine contract is deployed to ${balanceGame.target}`);
  return balanceGame.target;
}

async function main() {
    const CONTRACT_ADDRESS = await deployContract();
    const balanceGame = await ethers.getContractFactory("BalanceGame");
    const contract = balanceGame.attach(CONTRACT_ADDRESS) as BalanceGame;
    const signers = await ethers.getSigners();

    console.log("contract crator: " + signers[0].address + "\n");

    // 권한 부여
    for (let i = 0; i < 3; i++) {
        await contract.whitelistUpdate(signers[i].address, true);
    }

    // 게임생성
    const date = new Date();
    const unixTime = Math.floor(date.getTime() / 1000) + 60;
    const gameInfo = {
        questionA: "짜장면",
        questionB: "짬뽕",
        deadline: unixTime 
    }
    const game = await contract.createGame(
        gameInfo.questionA,
        gameInfo.questionB,
        gameInfo.deadline,
        { value: ethers.parseEther('1') }
    );

    const gameId = await contract.gameIndex();
    
    // 투표
    for (let i = 0; i < 3; i++) {
        await contract.connect(signers[i]).vote(gameId, 1, {
            value: ethers.parseEther("1")
        });
    }
    
    // 1시간 점프
    await ethers.provider.send("evm_increaseTime", [3600]);
    await ethers.provider.send("evm_mine", []);

    console.log("추첨전 잔고");
    for (let i = 0; i < 3; i++) {
        const balance = await ethers.provider.getBalance(signers[i].address);
        console.log(signers[i].address + ": " + ethers.formatEther(balance));
    }

    // 추첨 및 수령
    await contract.connect(signers[0]).checkWinner(1);
    for (let i = 0; i < 3; i++) {
        await contract.connect(signers[i]).claimPool(gameId);
    }

    // 당첨자 조회
    const getGamewinners = await contract.getGameWinner(gameId);

    // 지갑 잔고조회
    console.log("\n추첨후 잔고");
    for (let i = 0; i < 3; i++) {
        const balance = await ethers.provider.getBalance(getGamewinners.winners[i]);
        console.log(`${i + 1}등 ` + getGamewinners.winners[i] + ": " + ethers.formatEther(balance));
    }

    const getGameInfo = await contract.getGameInfo(gameId);
    const contractBalance = await ethers.provider.getBalance(CONTRACT_ADDRESS);
    console.log("컨트랙트에 남은 이더: " + ethers.formatEther(contractBalance));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});