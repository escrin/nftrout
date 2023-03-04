import React from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { formatAddress } from "../lib/formatting";
import { useAccountLowerCase } from "../hooks/account";

export const ConnectWallet = () => {
  const { address, isConnected } = useAccountLowerCase();
  return (
    <ConnectButton
      showBalance={false}
      chainStatus="none"
      label={
        isConnected
          ? "Connected"
          : address
          ? `Disconnect ${formatAddress(address)}`
          : "Connect Wallet"
      }
    />
  );
};

export default ConnectWallet;
