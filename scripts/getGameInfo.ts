import { ethers } from "hardhat";
import { JsonRpcProvider } from "ethers";
import * as BalanceGameJson from "../artifacts/contracts/BalanceGame.sol/BalanceGame.json";

const CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

async function main() {
  const provider = new JsonRpcProvider("http://127.0.0.1:8545");

  // signer 필요 -> 게임 생성은 트랜잭션이니까 signer 연결된 contract 필요함
  const signer = await provider.getSigner();

  const contract = new ethers.Contract(CONTRACT_ADDRESS, BalanceGameJson.abi, signer);

  const voteInfo = {
    questionA: "짜장면",
    questionB: "짬뽕",
    deadline: Math.floor(Date.now() / 1000) + 3600, // 1시간 후
  };

  try {
    // 게임 생성 함수 호출 (payable이니까 value 넣어야 함)
    const tx = await contract.createVote(
      voteInfo.questionA,
      voteInfo.questionB,
      voteInfo.deadline,
      { value: ethers.parseEther("1") }
    );

    console.log("트랜잭션 전송됨, 기다리는 중...");
    await tx.wait();
    console.log("게임 생성 완료!");

    // 생성된 게임 정보 조회
    const gameId = 13; // 1번 게임이라 가정
    const gameInfo = await contract.findGameById(gameId);

    console.log(`게임 ID: ${gameInfo.id.toString()}`);
    console.log(`질문 A: ${gameInfo.questionA}`);
    console.log(`질문 B: ${gameInfo.questionB}`);
    console.log(`투표 수 A: ${gameInfo.voteCountA.toString()}`);
    console.log(`투표 수 B: ${gameInfo.voteCountB.toString()}`);
    console.log(`마감 시간: ${new Date(Number(gameInfo.deadline) * 1000).toLocaleString()}`);
    console.log(`생성자 주소: ${gameInfo.creator}`);

    console.log("투표 트랜잭션 전송");
    const voteTx = await contract.vote(
      gameId,
      1,
      { value: ethers.parseEther("1") }
    );
    const gameInfo2 = await contract.findGameById(gameId);
    console.log(gameInfo2);

    await voteTx.wait();
  } catch (error) {
    console.error("게임 생성 또는 조회 실패:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
