import { Network } from "../utils/wallet/wallet_provider";

export const network =
  (process.env.NEXT_PUBLIC_STAKING_SDK_BABYLON_NETWORK as Network) || Network.MAINNET;

interface NetworkConfig {
  coinName: string;
  coinSymbol: string;
  networkName: string;
  mempoolApiUrl: string;
  babylonApiUrl: string;
  pointsApiUrl: string;
  network: Network;
}

const mainnetConfig: NetworkConfig = {
  coinName: "BTC",
  coinSymbol: "BTC",
  networkName: "BTC",
  mempoolApiUrl: `https://mempool.space`,
  babylonApiUrl: `https://staking-api.babylonlabs.io`,
  pointsApiUrl: `https://points.babylonlabs.io`,
  network: Network.MAINNET,
};

const signetConfig: NetworkConfig = {
  coinName: "Signet BTC",
  coinSymbol: "sBTC",
  networkName: "BTC signet",
  mempoolApiUrl: `https://mempool.space/signet`,
  babylonApiUrl: `https://staking-api.staging.babylonchain.io`,
  pointsApiUrl: `https://points.staging.babylonchain.io`,
  network: Network.SIGNET,
};

const testnetConfig: NetworkConfig = {
  coinName: "Testnet BTC",
  coinSymbol: "tBTC",
  networkName: "BTC testnet",
  mempoolApiUrl: `https://mempool.space/testnet`,
  babylonApiUrl: `https://staking-api.staging.babylonchain.io`,
  pointsApiUrl: `https://points.staging.babylonchain.io`,
  network: Network.TESTNET,
};

const config: Record<string, NetworkConfig> = {
  mainnet: mainnetConfig,
  signet: signetConfig,
  testnet: testnetConfig,
};

export function getNetworkConfig(): NetworkConfig {
  switch (network) {
    case Network.MAINNET:
      return config.mainnet;
    case Network.SIGNET:
      return config.signet;
    case Network.TESTNET:
      return config.testnet;
    default:
      return config.signet;
  }
}

export function validateAddress(network: Network, address: string): void {
  if (network === Network.MAINNET && !address.startsWith("bc1")) {
    throw new Error(
      "Incorrect address prefix for Mainnet. Expected address to start with 'bc1'.",
    );
  } else if (
    [Network.SIGNET, Network.TESTNET].includes(network) &&
    !address.startsWith("tb1")
  ) {
    throw new Error(
      "Incorrect address prefix for Testnet / Signet. Expected address to start with 'tb1'.",
    );
  } else if (
    ![Network.MAINNET, Network.SIGNET, Network.TESTNET].includes(network)
  ) {
    throw new Error(
      `Unsupported network: ${network}. Please provide a valid network.`,
    );
  }
}
