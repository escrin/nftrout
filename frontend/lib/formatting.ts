import _ from "lodash";
import { BigNumber } from "ethers";

export const getOpenSeaFractionUrl = (
  tokenId: string,
  contractAddress: string,
) => {
  return `https://testnets.opensea.io/assets/goerli/${contractAddress}/${BigNumber.from(
    tokenId,
  ).toNumber()}`;
};

export const formatAddress = (address: string) =>
  `${address.slice(0, 4)}...${address.slice(-4)}`;

/**
 * Prefix cid with `ipfs://` if it's not already
 * @param cid
 * @returns
 */
export const cidToIpfsUri = (cid: string) =>
  cid.startsWith("ipfs://") ? cid : `ipfs://${cid}`;
