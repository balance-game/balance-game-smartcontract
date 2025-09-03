import { ethers } from "hardhat";
import { BalanceGame, BalanceGame__factory } from "../../typechain-types"; // 타입체인 생성 타입 경로
import dotenv from "dotenv";

dotenv.config();

const provider = new ethers.JsonRpcProvider("https://sepolia.infura.io/v3/e7c9e7ec3e594533b2567f31380e0220");

const contractAddress = "0x67b91C11D4ad206a89f831Ba9187520298447A5a";
const contract: BalanceGame = BalanceGame__factory.connect(contractAddress, provider);

async function getLogs() {
  const filter = contract.filters.logs(); // 이벤트 이름
  const logs = await contract.queryFilter(filter, 0, "latest"); // 0부터 최신 블록까지

  logs.forEach((log) => {
    console.log({
      blockNumber: log.blockNumber,
      args: log.args?.map(arg => arg.toString()), // 이벤트 파라미터
    });
  });
}

getLogs();
