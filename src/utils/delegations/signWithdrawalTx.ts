import { Psbt, Transaction, networks } from "bitcoinjs-lib";

export interface PsbtTransactionResult {
  psbt: Psbt;
  fee: number;
}

import { getGlobalParams } from "../../app/api/getGlobalParams";
import { SignPsbtTransaction } from "../../app/common/utils/psbt";
import { Delegation as DelegationInterface } from "../../app/types/delegations";
import { apiDataToStakingScripts } from "../../utils/apiDataToStakingScripts";
import { getCurrentGlobalParamsVersion } from "../../utils/globalParams";

import { txFeeSafetyCheck } from "./fee";
import { emitEventFunc, noopFunc } from './events'


// Create a withdrawal transaction
// Returns:
// - withdrawalTx: the unsigned withdrawal transaction
// - fee: estimated transaction fee
export const createWithdrawalTx = async (
    id: string,
    delegationsAPI: DelegationInterface[],
    publicKeyNoCoord: string,
    btcWalletNetwork: networks.Network,
    address: string,
    feeRate: number,
) => {
  // Check if the data is available
  if (!delegationsAPI) {
    throw new Error("No back-end API data available");
  }

  // Find the delegation in the delegations retrieved from the API
  const delegation = delegationsAPI.find(
      (delegation) => delegation.stakingTxHashHex === id,
  );
  if (!delegation) {
    throw new Error("Delegation not found");
  }

  // Get the required data
  const paramVersions = await getGlobalParams();

  // State of global params when the staking transaction was submitted
  const { currentVersion: globalParamsWhenStaking } =
      getCurrentGlobalParamsVersion(
          delegation.stakingTx.startHeight,
          paramVersions,
      );

  if (!globalParamsWhenStaking) {
    throw new Error("Current version not found");
  }

  // Recreate the staking scripts
  const {
    timelockScript,
    slashingScript,
    unbondingScript,
    unbondingTimelockScript,
  } = await apiDataToStakingScripts(
      delegation.finalityProviderPkHex,
      delegation.stakingTx.timelock,
      globalParamsWhenStaking,
      publicKeyNoCoord,
  );

  const  {
    withdrawEarlyUnbondedTransaction,
    withdrawTimelockUnbondedTransaction,
  } = await import ("btc-staking-ts");


  // Create the withdrawal transaction
  let unsignedWithdrawPsbt: PsbtTransactionResult;

  try {
    if (delegation?.unbondingTx) {
      // Withdraw funds from an unbonding transaction that was submitted for early unbonding and the unbonding period has passed
      unsignedWithdrawPsbt = withdrawEarlyUnbondedTransaction(
          {
            unbondingTimelockScript,
            slashingScript,
          },
          Transaction.fromHex(delegation.unbondingTx.txHex),
          address,
          btcWalletNetwork,
          feeRate,
          0,
      );

    } else {
      // Withdraw funds from a staking transaction in which the timelock naturally expired
      unsignedWithdrawPsbt = withdrawTimelockUnbondedTransaction(
          {
            timelockScript,
            slashingScript,
            unbondingScript,
          },
          Transaction.fromHex(delegation.stakingTx.txHex),
          address,
          btcWalletNetwork,
          feeRate,
          delegation.stakingTx.outputIndex,
      );
    }
  } catch (error: Error | any) {
    throw new Error(
        error?.message || "Cannot build unsigned withdrawal transaction",
    );
  }

  return unsignedWithdrawPsbt;
};

// Sign a withdrawal transaction
// Returns:
// - withdrawalTx: the signed withdrawal transaction
export const signWithdrawalTx = async (
  id: string,
  delegationsAPI: DelegationInterface[],
  publicKeyNoCoord: string,
  btcWalletNetwork: networks.Network,
  signPsbtTx: SignPsbtTransaction,
  address: string,
  feeRate: number,
  pushTx: (txHex: string) => Promise<string>,
  emitWaitForSignatureEvent: emitEventFunc = noopFunc,
  emitBroadcastEvent: emitEventFunc = noopFunc,
): Promise<{
  withdrawalTxHex: string;
}> => {

  const { psbt, fee } = await createWithdrawalTx(
      id,
      delegationsAPI,
      publicKeyNoCoord,
      btcWalletNetwork,
      address,
      feeRate
  )

  emitWaitForSignatureEvent();

  // Sign the withdrawal transaction
  let withdrawalTx: Transaction;
  try {
    withdrawalTx = await signPsbtTx(psbt.toHex());
  } catch (error) {
    throw new Error("Failed to sign PSBT for the withdrawal transaction");
  }

  // Get the withdrawal transaction hex
  const withdrawalTxHex = withdrawalTx.toHex();
  // Perform a safety check on the estimated transaction fee
  txFeeSafetyCheck(
    withdrawalTx,
    feeRate,
    fee,
  );

  emitBroadcastEvent();

  // Broadcast withdrawal transaction
  await pushTx(withdrawalTxHex);

  return { withdrawalTxHex };
};
