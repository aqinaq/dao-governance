import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { encodeFunctionData, keccak256, parseEther, toBytes } from "viem";
import { network } from "hardhat";

const MIN_DELAY = 2n * 24n * 60n * 60n;
const VOTING_DELAY = 7200n;
const VOTING_PERIOD = 50400n;

describe("Treasury and Box Governance Control", function () {
  async function mineBlocks(publicClient: any, blocks: bigint) {
    for (let i = 0n; i < blocks; i++) {
      await publicClient.request({ method: "evm_mine" });
    }
  }

  async function increaseTime(publicClient: any, seconds: bigint) {
    await publicClient.request({
      method: "evm_increaseTime",
      params: [Number(seconds)],
    });
    await publicClient.request({ method: "evm_mine" });
  }

  async function deployFixture() {
    const { viem } = await network.connect();
    const publicClient = await viem.getPublicClient();

    const [deployer, team, treasuryWallet, community, liquidity, receiver] =
      await viem.getWalletClients();

    const timelock = await viem.deployContract("MyTimelock", [
      MIN_DELAY,
      [],
      [],
      deployer.account.address,
    ]);

    const token = await viem.deployContract("GovernanceToken", [
      team.account.address,
      treasuryWallet.account.address,
      community.account.address,
      liquidity.account.address,
    ]);

    const governor = await viem.deployContract("MyGovernor", [
      token.address,
      timelock.address,
    ]);

    const treasury = await viem.deployContract("Treasury", [timelock.address]);
    const box = await viem.deployContract("Box", [timelock.address]);

    const proposerRole = await timelock.read.PROPOSER_ROLE();
    const executorRole = await timelock.read.EXECUTOR_ROLE();
    const adminRole = await timelock.read.DEFAULT_ADMIN_ROLE();

    await timelock.write.grantRole([proposerRole, governor.address]);
    await timelock.write.grantRole([
      executorRole,
      "0x0000000000000000000000000000000000000000",
    ]);
    await timelock.write.renounceRole([adminRole, deployer.account.address]);

    await token.write.delegate([community.account.address], {
      account: community.account,
    });

    await mineBlocks(publicClient, 2n);

    return {
      publicClient,
      deployer,
      team,
      treasuryWallet,
      community,
      liquidity,
      receiver,
      token,
      timelock,
      governor,
      treasury,
      box,
    };
  }

  it("sets Treasury owner as Timelock", async function () {
    const { treasury, timelock } = await deployFixture();

    assert.equal(
      (await treasury.read.owner()).toLowerCase(),
      timelock.address.toLowerCase()
    );
  });

  it("sets Box owner as Timelock", async function () {
    const { box, timelock } = await deployFixture();

    assert.equal(
      (await box.read.owner()).toLowerCase(),
      timelock.address.toLowerCase()
    );
  });

  it("Treasury can hold ERC20 tokens", async function () {
    const { token, treasury, treasuryWallet } = await deployFixture();

    await token.write.transfer([treasury.address, parseEther("1000")], {
      account: treasuryWallet.account,
    });

    assert.equal(
      await token.read.balanceOf([treasury.address]),
      parseEther("1000")
    );
  });

  it("non-owner cannot transfer tokens from Treasury", async function () {
    const { token, treasury, treasuryWallet, receiver } = await deployFixture();

    await token.write.transfer([treasury.address, parseEther("1000")], {
      account: treasuryWallet.account,
    });

    await assert.rejects(
      treasury.write.transferToken([
        token.address,
        receiver.account.address,
        parseEther("100"),
      ])
    );
  });

  it("governance transfers ERC20 tokens from Treasury to receiver", async function () {
    const {
      publicClient,
      token,
      treasury,
      treasuryWallet,
      receiver,
      governor,
      community,
    } = await deployFixture();

    await token.write.transfer([treasury.address, parseEther("1000")], {
      account: treasuryWallet.account,
    });

    const calldata = encodeFunctionData({
      abi: treasury.abi,
      functionName: "transferToken",
      args: [token.address, receiver.account.address, parseEther("100")],
    });

    const description = "Proposal #5: Transfer 100 DGT from Treasury";
    const descriptionHash = keccak256(toBytes(description));

    await governor.write.propose(
      [[treasury.address], [0n], [calldata], description],
      { account: community.account }
    );

    const proposalId = await governor.read.hashProposal([
      [treasury.address],
      [0n],
      [calldata],
      descriptionHash,
    ]);

    await mineBlocks(publicClient, VOTING_DELAY + 1n);

    await governor.write.castVote([proposalId, 1], {
      account: community.account,
    });

    await mineBlocks(publicClient, VOTING_PERIOD + 1n);

    await governor.write.queue([
      [treasury.address],
      [0n],
      [calldata],
      descriptionHash,
    ]);

    await increaseTime(publicClient, MIN_DELAY + 1n);

    await governor.write.execute([
      [treasury.address],
      [0n],
      [calldata],
      descriptionHash,
    ]);

    assert.equal(
      await token.read.balanceOf([receiver.account.address]),
      parseEther("100")
    );
  });

  it("governance stores value 42 in Box", async function () {
    const { publicClient, governor, box, community } = await deployFixture();

    const calldata = encodeFunctionData({
      abi: box.abi,
      functionName: "store",
      args: [42n],
    });

    const description = "Proposal #6: Store 42 from TreasuryBox test";
    const descriptionHash = keccak256(toBytes(description));

    await governor.write.propose(
      [[box.address], [0n], [calldata], description],
      { account: community.account }
    );

    const proposalId = await governor.read.hashProposal([
      [box.address],
      [0n],
      [calldata],
      descriptionHash,
    ]);

    await mineBlocks(publicClient, VOTING_DELAY + 1n);

    await governor.write.castVote([proposalId, 1], {
      account: community.account,
    });

    await mineBlocks(publicClient, VOTING_PERIOD + 1n);

    await governor.write.queue([
      [box.address],
      [0n],
      [calldata],
      descriptionHash,
    ]);

    await increaseTime(publicClient, MIN_DELAY + 1n);

    await governor.write.execute([
      [box.address],
      [0n],
      [calldata],
      descriptionHash,
    ]);

    assert.equal(await box.read.retrieve(), 42n);
  });
});