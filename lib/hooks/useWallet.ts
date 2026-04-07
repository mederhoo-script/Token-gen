"use client";

import { useState, useCallback, useEffect } from "react";
import { ethers } from "ethers";
import {
  type ChainConfig,
  SUPPORTED_CHAINS,
  DEFAULT_CHAIN_ID,
} from "@/lib/blockchain/chains";

// Augment Window so TypeScript knows about window.ethereum
declare global {
  interface Window {
    ethereum?: ethers.Eip1193Provider & {
      on(event: string, handler: (...args: unknown[]) => void): void;
      removeListener(event: string, handler: (...args: unknown[]) => void): void;
    };
  }
}

export interface WalletState {
  address: string | null;
  chainId: number | null;
  selectedChain: ChainConfig;
  setSelectedChain: (chain: ChainConfig) => void;
  isCorrectChain: boolean;
  connecting: boolean;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  switchToTargetChain: () => Promise<void>;
}

export function useWallet(): WalletState {
  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [selectedChain, setSelectedChain] = useState<ChainConfig>(
    SUPPORTED_CHAINS[DEFAULT_CHAIN_ID],
  );
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connect = useCallback(async () => {
    if (typeof window === "undefined" || !window.ethereum) {
      setError("MetaMask is not installed. Please install it at metamask.io.");
      return;
    }
    setConnecting(true);
    setError(null);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner();
      const addr = await signer.getAddress();
      const network = await provider.getNetwork();
      setAddress(addr);
      setChainId(Number(network.chainId));
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to connect wallet";
      setError(msg.toLowerCase().includes("rejected") ? "Connection rejected." : msg);
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setAddress(null);
    setChainId(null);
    setError(null);
  }, []);

  const switchToTargetChain = useCallback(async () => {
    if (typeof window === "undefined" || !window.ethereum) return;
    setError(null);
    const hexChainId = `0x${selectedChain.id.toString(16)}`;
    const provider = new ethers.BrowserProvider(window.ethereum);
    try {
      await provider.send("wallet_switchEthereumChain", [{ chainId: hexChainId }]);
    } catch (switchError) {
      // Error 4902: chain has not been added to MetaMask yet — add it first
      const code = (switchError as { code?: number }).code;
      if (code === 4902) {
        try {
          await provider.send("wallet_addEthereumChain", [
            {
              chainId: hexChainId,
              chainName: selectedChain.name,
              nativeCurrency: selectedChain.nativeCurrency,
              rpcUrls: selectedChain.publicRpcUrls,
              blockExplorerUrls: [selectedChain.explorerUrl],
            },
          ]);
        } catch (addError) {
          setError(addError instanceof Error ? addError.message : "Failed to add network");
        }
      } else {
        setError(switchError instanceof Error ? switchError.message : "Failed to switch network");
      }
    }
  }, [selectedChain]);

  // Keep state in sync when user changes account or chain inside MetaMask
  useEffect(() => {
    if (typeof window === "undefined" || !window.ethereum) return;

    const handleAccountsChanged = (accounts: unknown) => {
      const accs = accounts as string[];
      setAddress(accs.length > 0 ? accs[0] : null);
    };

    const handleChainChanged = (chainIdHex: unknown) => {
      setChainId(parseInt(chainIdHex as string, 16));
    };

    window.ethereum.on("accountsChanged", handleAccountsChanged);
    window.ethereum.on("chainChanged", handleChainChanged);

    return () => {
      window.ethereum?.removeListener("accountsChanged", handleAccountsChanged);
      window.ethereum?.removeListener("chainChanged", handleChainChanged);
    };
  }, []);

  return {
    address,
    chainId,
    selectedChain,
    setSelectedChain,
    isCorrectChain: chainId === selectedChain.id,
    connecting,
    error,
    connect,
    disconnect,
    switchToTargetChain,
  };
}

