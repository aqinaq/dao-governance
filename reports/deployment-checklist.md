# DAO Deployment Checklist

## Deployment Order
1. Deploy MyTimelock with 2-day minimum delay.
2. Deploy GovernanceToken with initial distribution:
   - 40% Team vesting allocation
   - 30% Treasury
   - 20% Community
   - 10% Liquidity
3. Deploy MyGovernor using GovernanceToken and MyTimelock.
4. Deploy Treasury owned by MyTimelock.
5. Deploy Box owned by MyTimelock.
6. Grant PROPOSER_ROLE to MyGovernor.
7. Grant EXECUTOR_ROLE to address(0), allowing public execution.
8. Renounce deployer DEFAULT_ADMIN_ROLE.

## Post-Deployment Verification
- Check Timelock minimum delay is 2 days.
- Check Governor voting delay is 7200 blocks.
- Check Governor voting period is 50400 blocks.
- Check proposal threshold is 10,000 DGT.
- Check quorum is 4%.
- Check Treasury owner is Timelock.
- Check Box owner is Timelock.
- Check Governor has proposer role.
- Check deployer no longer has admin role.

## Monitoring Plan
Monitor:
- ProposalCreated events
- VoteCast events
- ProposalQueued events
- ProposalExecuted events
- Timelock role changes
- Treasury token transfers
- Treasury ETH transfers

## Gas Cost Summary
Include gas values from deployment and proposal transactions after testnet deployment.