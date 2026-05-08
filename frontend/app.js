let provider;
let signer;
let account;

const TOKEN_ADDRESS = "PASTE_GOVERNANCE_TOKEN_ADDRESS";
const GOVERNOR_ADDRESS = "PASTE_GOVERNOR_ADDRESS";

const tokenAbi = [
  "function balanceOf(address account) view returns (uint256)",
  "function getVotes(address account) view returns (uint256)",
  "function delegates(address account) view returns (address)",
  "function delegate(address delegatee)"
];

const governorAbi = [
  "function state(uint256 proposalId) view returns (uint8)",
  "function castVote(uint256 proposalId, uint8 support) returns (uint256)"
];

document.getElementById("connectBtn").onclick = connectWallet;
document.getElementById("delegateBtn").onclick = delegateVotes;
document.getElementById("proposalStateBtn").onclick = checkProposalState;

async function connectWallet() {
  provider = new ethers.BrowserProvider(window.ethereum);
  signer = await provider.getSigner();
  account = await signer.getAddress();

  document.getElementById("account").innerText = account;
  await loadTokenInfo();
}

async function loadTokenInfo() {
  const token = new ethers.Contract(TOKEN_ADDRESS, tokenAbi, signer);

  const balance = await token.balanceOf(account);
  const votes = await token.getVotes(account);
  const delegate = await token.delegates(account);

  document.getElementById("balance").innerText = ethers.formatEther(balance);
  document.getElementById("votes").innerText = ethers.formatEther(votes);
  document.getElementById("delegate").innerText = delegate;
}

async function delegateVotes() {
  const delegateAddress = document.getElementById("delegateInput").value;
  const token = new ethers.Contract(TOKEN_ADDRESS, tokenAbi, signer);

  const tx = await token.delegate(delegateAddress);
  await tx.wait();

  alert("Delegation successful!");
  await loadTokenInfo();
}

async function checkProposalState() {
  const proposalId = document.getElementById("proposalIdInput").value;
  const governor = new ethers.Contract(GOVERNOR_ADDRESS, governorAbi, signer);

  const state = await governor.state(proposalId);

  const states = [
    "Pending",
    "Active",
    "Canceled",
    "Defeated",
    "Succeeded",
    "Queued",
    "Expired",
    "Executed"
  ];

  document.getElementById("proposalState").innerText = states[Number(state)];
}

async function castVote(support) {
  const proposalId = document.getElementById("proposalIdInput").value;
  const governor = new ethers.Contract(GOVERNOR_ADDRESS, governorAbi, signer);

  const tx = await governor.castVote(proposalId, support);
  await tx.wait();

  alert("Vote transaction successful!");
  await checkProposalState();
}