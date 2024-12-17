import { Psbt, Transaction } from 'bitcoinjs-lib'

import { WalletProvider } from '../../../utils/wallet/wallet_provider'

export type SignPsbtTransaction = (psbtHex: string) => Promise<Transaction>;

// This method is created to accommodate backward compatibility with the
// old implementation of signPsbt where the wallet.signPsbt method returns
// the signed transaction in hex
export const signPsbtTransaction = (wallet: WalletProvider) => {
  return async (psbtHex: string) => {

    let signedHex: string

    // @ts-ignore
    if (('connector' in wallet) && (wallet.connector?.name == 'OneKey')) {
      const provider = window['$onekey'].btcwallet
      signedHex = await provider.signPsbt(psbtHex)
    } else {
      signedHex = await wallet.signPsbt(psbtHex)
    }

    try {
      // Try to parse the signedHex as PSBT to see if it follows the new implementation
      return Psbt.fromHex(signedHex).extractTransaction()
    } catch (error) {
      console.log('failed to sign:', error)

      // If parsing fails, it's the old version implementation
      return Transaction.fromHex(signedHex)
    }
  }
}
