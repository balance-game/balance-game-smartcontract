import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import dotenv from "dotenv";
import { BalanceGame, VRFCoordinatorV2_5Mock } from "../typechain-types";

dotenv.config({ quiet: true });

/**
 * TODO:
 * 이벤트 부분 Topic으로 조회하는 방식으로 수정해야됨
 */

const GAME_COST = 1;
// 스크립트 배포시에만 할당
let SUBSCRIPTION_Id;

async function balanceGameFixture() {
  const [owner, ...otherAccount] = await ethers.getSigners();

  // hardhat 시간 초기화
  await ethers.provider.send("hardhat_reset", []);

  // VRF mock
  const Vrf = await ethers.getContractFactory("VRFCoordinatorV2_5Mock");
  const vrf = await Vrf.deploy(100000000000000000n, 1000000000n, ethers.parseEther("0.01"));

  const tx = await vrf.createSubscription();
  const receipt = await tx.wait();
  const log = vrf.interface.parseLog(receipt!.logs[0]);
  SUBSCRIPTION_Id = BigInt(log!.args.subId);

  // fund
  await vrf.fundSubscription(SUBSCRIPTION_Id, ethers.parseEther('1000'));
  
  // balanceGame
  const BalanceGame = await ethers.getContractFactory("BalanceGame");
  const balanceGame = await BalanceGame.deploy(GAME_COST, SUBSCRIPTION_Id);
  
  await vrf.addConsumer(SUBSCRIPTION_Id, balanceGame.target);
  
  return { balanceGame, vrf, owner, otherAccount };
}

describe("BalanceGameTest", async () => {
  let balanceGame: BalanceGame;
  let vrf: VRFCoordinatorV2_5Mock;
  let owner: any;
  let otherAccount: any;

  before(async () => {
    ({ balanceGame, vrf, owner, otherAccount } = await loadFixture(balanceGameFixture));
  });

  it("whitelist update", async () => {
    for(let i = 0; i < 3; i++) {
      const tx = await balanceGame.connect(owner).whitelistUpdate(otherAccount[i].address, true);
      const receipt = await tx.wait();

      expect(receipt).to.exist;
      const log = balanceGame.interface.parseLog(receipt!.logs[0]);
      expect(log?.args.userAddress).to.equal(otherAccount[i].address);
      expect(log?.args.status).to.equal(true);
    }
  });

  it("createGame", async () => {
    const questionA = "짜장면";
    const questionB = "짬뽕";
    const deadline = Math.floor(Date.now() / 1000) + 3600;
    const tx = await balanceGame.createGame(questionA, questionB, deadline, { value: ethers.parseEther("1") });
    const receipt = await tx.wait();

    expect(receipt).to.exist;
    const log = balanceGame.interface.parseLog(receipt!.logs[0]);
    expect(log?.args.gameId).to.equal(BigInt(1));
  });

  it("voteGame", async () => {
    for(let i = 0; i < 3; i++) {
      const tx = await balanceGame.connect(otherAccount[i]).vote(1, 1, { value: ethers.parseEther('1') });
      const receipt = await tx.wait();

      expect(receipt).to.exist;
      const log = balanceGame.interface.parseLog(receipt!.logs[0]);
      expect(log?.args.votedAddress).to.equal(otherAccount[i].address);
      expect(log?.args.voteOption).to.equal(1);
    }
  });

  it("winnerCheck", async () => {
    // 10시간 점프
    await ethers.provider.send("evm_increaseTime", [36000]);
    await ethers.provider.send("evm_mine", []);

    // BalanceGame
    const checkWinnerTx = await balanceGame.checkWinner(1);
    const checkWinnerReceipt = await checkWinnerTx.wait();

    expect(checkWinnerReceipt).to.exist;
    const checkWinnerLog = balanceGame.interface.parseLog(checkWinnerReceipt!.logs[1]);
    const requestId = checkWinnerLog?.args.requestId;

    // BalanceGmae log
    expect(requestId).to.exist;
    expect(checkWinnerLog?.args.gameId).to.equal(1);

    // VRF
    const vrfTx = await vrf.fulfillRandomWords(requestId, balanceGame.target);
    const vrfReceipt = await vrfTx.wait();
    const eventTopic = balanceGame.interface.getEvent("NewWinner").topicHash;
    
    // VRF log
    expect(vrfReceipt).to.exist;
    const foundLog = vrfReceipt?.logs.find((log) => log.topics[0] === eventTopic);
    const parseLog = balanceGame.interface.parseLog(foundLog!);
    expect(parseLog?.args.gameId).to.equal(1);
  });

  it("claimPool", async () => {
    // 생성자
    const tx = await balanceGame.connect(owner).claimPool(1);
    const c_receipt = await tx.wait();
    const c_eventTopic = balanceGame.interface.getEvent("ClaimPool").topicHash;

    expect(c_eventTopic).to.exist;
    const c_foundLog = c_receipt?.logs.find((log) => log.topics[0] === c_eventTopic);
    const parseLog = balanceGame.interface.parseLog(c_foundLog!);

    expect(parseLog?.args.amount).to.equal(150000000000000000n);
    expect(parseLog?.args.winnerRank).to.equal(0);

    // 투표참여자
    for(let i = 0; i < 3; i++) {
      const tx = await balanceGame.connect(otherAccount[i]).claimPool(1);
      const receipt = await tx.wait();
      const eventTopic = balanceGame.interface.getEvent("ClaimPool").topicHash;

      expect(eventTopic).to.exist;
      const foundLog = receipt?.logs.find((log) => log.topics[0] === eventTopic);
      const parseLog = balanceGame.interface.parseLog(foundLog!);

      const iBigInt = BigInt(i);
      switch(iBigInt) {
        case 0n: {
          expect(parseLog?.args.winnerRank).to.equal(2n);
          expect(parseLog?.args.amount).to.equal(750000000000000000n);

          break;
        }
        case 1n: {
          expect(parseLog?.args.winnerRank).to.equal(3n);
          expect(parseLog?.args.amount).to.equal(600000000000000000n);

          break;
        }
        case 2n: {
          expect(parseLog?.args.winnerRank).to.equal(1n);
          expect(parseLog?.args.amount).to.equal(1350000000000000000n);

          break;
        }
        default: {
          throw new Error("Unknown WinnerRank");
        }
      }
    }
  });
});
