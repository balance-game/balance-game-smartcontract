import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

const GAME_COST = 1;

describe("BalanceGame", function () {
  async function balanceGameFixture() {
    const [owner, otherAccount] = await ethers.getSigners();

    const BalanceGame = await ethers.getContractFactory("BalanceGame");
    const balanceGame = await BalanceGame.deploy(GAME_COST);

    return { balanceGame, owner, otherAccount };
  }

  describe("BalanceGameTest", function () {
    it(`should gameCost ${GAME_COST}`, async function () {
        const { balanceGame } = await loadFixture(balanceGameFixture);
        expect((await balanceGame.COST())).to.equal(GAME_COST);
    });

    it(`create game`, async function () {
        const { balanceGame, owner } = await loadFixture(balanceGameFixture);
        const voteInfo = {
          questionA: "짜장면",
          questionB: "짬뽕",
          deadline: Math.floor(Date.now() / 1000) + 3600
        }

        await balanceGame.createVote(
          voteInfo.questionA,
          voteInfo.questionB, 
          voteInfo.deadline,
          { value: 1 }
        );

        const gameInfo = await balanceGame.findGameById(1);

        expect(gameInfo[0]).to.equal(1);
        expect(gameInfo[1]).to.equal(voteInfo.questionA, "옵션 A가 짜장면이 아닙니다.");
        expect(gameInfo[2]).to.equal(voteInfo.questionB, "옵션 B가 짬뽕이 아닙니다.");
        expect(gameInfo[3]).to.equal(0, "투표 세팅이 잘못되었습니다");
        expect(gameInfo[4]).to.equal(0, "투표 세팅이 잘못되었습니다");
        expect(gameInfo[5]).to.equal(0, "투표 세팅이 잘못되었습니다");
        expect(gameInfo[6]).to.equal(voteInfo.deadline, "게임 종료시간이 올바르지 않습니다");
        expect(gameInfo[7]).to.equal(owner.address, "주소가 올바르지 않습니다");
      });

    it(`vote`, async function () {
    });

    it(`duplicate vote`, async function () {
    });
  });
});
