import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseEther } from "viem";
import { network } from "hardhat";

describe("GovernanceToken + TokenVesting", function () {
  async function deployFixture() {
    const { viem } = await network.connect();

    const [deployer, team, treasury, community, liquidity, delegatee] =
      await viem.getWalletClients();

    const start = BigInt(Math.floor(Date.now() / 1000));
    const duration = 365n * 24n * 60n * 60n;
    const teamAmount = parseEther("400000");

    const dummyVestingAddress = team.account.address;

    const token = await viem.deployContract("GovernanceToken", [
      dummyVestingAddress,
      treasury.account.address,
      community.account.address,
      liquidity.account.address,
    ]);

    const vesting = await viem.deployContract("TokenVesting", [
      token.address,
      team.account.address,
      start,
      duration,
      teamAmount,
    ]);

    return {
      viem,
      deployer,
      team,
      treasury,
      community,
      liquidity,
      delegatee,
      token,
      vesting,
      start,
      duration,
      teamAmount,
    };
  }

  it("mints total supply correctly", async function () {
    const { token } = await deployFixture();
    assert.equal(await token.read.totalSupply(), parseEther("1000000"));
  });

  it("distributes 40% to team vesting address placeholder", async function () {
    const { token, team } = await deployFixture();
    assert.equal(
      await token.read.balanceOf([team.account.address]),
      parseEther("400000")
    );
  });

  it("distributes 30% to treasury", async function () {
    const { token, treasury } = await deployFixture();
    assert.equal(
      await token.read.balanceOf([treasury.account.address]),
      parseEther("300000")
    );
  });

  it("distributes 20% to community", async function () {
    const { token, community } = await deployFixture();
    assert.equal(
      await token.read.balanceOf([community.account.address]),
      parseEther("200000")
    );
  });

  it("distributes 10% to liquidity", async function () {
    const { token, liquidity } = await deployFixture();
    assert.equal(
      await token.read.balanceOf([liquidity.account.address]),
      parseEther("100000")
    );
  });

  it("allows vote delegation", async function () {
    const { token, community, delegatee } = await deployFixture();

    await token.write.delegate([delegatee.account.address], {
      account: community.account,
    });

    assert.equal(
  (await token.read.delegates([community.account.address])).toLowerCase(),
  delegatee.account.address.toLowerCase()
);
  });

  it("updates voting power after delegation", async function () {
    const { token, community, delegatee } = await deployFixture();

    await token.write.delegate([delegatee.account.address], {
      account: community.account,
    });

    assert.equal(
      await token.read.getVotes([delegatee.account.address]),
      parseEther("200000")
    );
  });

  it("calculates vesting amount before start as zero", async function () {
    const { viem, team, token, teamAmount } = await deployFixture();

    const futureStart = BigInt(Math.floor(Date.now() / 1000)) + 100000n;
    const duration = 365n * 24n * 60n * 60n;

    const vesting = await viem.deployContract("TokenVesting", [
      token.address,
      team.account.address,
      futureStart,
      duration,
      teamAmount,
    ]);

    assert.equal(await vesting.read.vestedAmount(), 0n);
  });
    it("returns correct token name and symbol", async function () {
    const { token } = await deployFixture();

    assert.equal(await token.read.name(), "DAO Governance Token");
    assert.equal(await token.read.symbol(), "DGT");
  });

  it("has zero voting power before delegation", async function () {
    const { token, community } = await deployFixture();

    assert.equal(await token.read.getVotes([community.account.address]), 0n);
  });
});