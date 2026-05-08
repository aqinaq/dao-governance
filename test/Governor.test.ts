import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { encodeFunctionData, keccak256, toBytes } from "viem";
import { network } from "hardhat";

const MIN_DELAY = 2n * 24n * 60n * 60n;
const VOTING_DELAY = 7200n;
const VOTING_PERIOD = 50400n;

describe("DAO Governor Lifecycle", function () {
  async function deployDaoFixture() {
    const { viem } = await network.connect();
    const publicClient = await viem.getPublicClient();

    const [deployer, team, treasuryWallet, community, liquidity, voter, receiver] =
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
      voter,
      receiver,
      timelock,
      token,
      governor,
      box,
    };
  }

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

  it("creates a proposal to call Box.store(42)", async function () {
    const { governor, box, community } = await deployDaoFixture();

    const calldata = encodeFunctionData({
      abi: box.abi,
      functionName: "store",
      args: [42n],
    });

    const description = "Proposal #1: Store value 42 in Box";
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

    assert.notEqual(proposalId, 0n);
  });

  it("executes full lifecycle: propose, vote, queue, execute", async function () {
    const { publicClient, governor, box, community } = await deployDaoFixture();

    const calldata = encodeFunctionData({
      abi: box.abi,
      functionName: "store",
      args: [42n],
    });

    const description = "Proposal #2: Store value 42 in Box";
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
    it("defeats a proposal when majority votes against", async function () {
    const { publicClient, governor, box, community } = await deployDaoFixture();

    const calldata = encodeFunctionData({
      abi: box.abi,
      functionName: "store",
      args: [99n],
    });

    const description = "Proposal #3: Store value 99 in Box";
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

    await governor.write.castVote([proposalId, 0], {
      account: community.account,
    });

    await mineBlocks(publicClient, VOTING_PERIOD + 1n);

    assert.equal(await governor.read.state([proposalId]), 3);
  });

  it("allows delegatee to vote on behalf of delegator", async function () {
    const { publicClient, governor, box, community, voter, token } =
      await deployDaoFixture();

    await token.write.transfer([voter.account.address, 50000n * 10n ** 18n], {
      account: community.account,
    });

    await token.write.delegate([community.account.address], {
      account: voter.account,
    });

    await mineBlocks(publicClient, 2n);

    const calldata = encodeFunctionData({
      abi: box.abi,
      functionName: "store",
      args: [77n],
    });

    const description = "Proposal #4: Delegatee voting test";
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

    assert.equal(await governor.read.state([proposalId]), 4);
  });
});