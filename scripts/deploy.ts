import { network } from "hardhat";

const MIN_DELAY = 2n * 24n * 60n * 60n;

async function main() {
  const { viem } = await network.connect();
  const [deployer, team, treasuryWallet, community, liquidity] =
    await viem.getWalletClients();

  console.log("Deploying with:", deployer.account.address);

  const timelock = await viem.deployContract("MyTimelock", [
    MIN_DELAY,
    [],
    [],
    deployer.account.address,
  ]);
  console.log("MyTimelock:", timelock.address);

  const token = await viem.deployContract("GovernanceToken", [
    team.account.address,
    treasuryWallet.account.address,
    community.account.address,
    liquidity.account.address,
  ]);
  console.log("GovernanceToken:", token.address);

  const governor = await viem.deployContract("MyGovernor", [
    token.address,
    timelock.address,
  ]);
  console.log("MyGovernor:", governor.address);

  const treasury = await viem.deployContract("Treasury", [timelock.address]);
  console.log("Treasury:", treasury.address);

  const box = await viem.deployContract("Box", [timelock.address]);
  console.log("Box:", box.address);

  const proposerRole = await timelock.read.PROPOSER_ROLE();
  const executorRole = await timelock.read.EXECUTOR_ROLE();
  const adminRole = await timelock.read.DEFAULT_ADMIN_ROLE();

  await timelock.write.grantRole([proposerRole, governor.address]);
  console.log("Granted proposer role to Governor");

  await timelock.write.grantRole([
    executorRole,
    "0x0000000000000000000000000000000000000000",
  ]);
  console.log("Granted executor role to everyone");

  await timelock.write.renounceRole([adminRole, deployer.account.address]);
  console.log("Deployer renounced admin role");

  console.log("\nDeployment complete.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});