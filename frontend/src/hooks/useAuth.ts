import { useState, useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { connectWallet, type AuthResponse } from "@/services/api";
import bs58 from "bs58";

interface AuthState {
  token: string | null;
  wallet: string | null;
  loading: boolean;
  error: string | null;
}

export function useAuth() {
  const { publicKey, signMessage } = useWallet();
  const [state, setState] = useState<AuthState>(() => ({
    token: sessionStorage.getItem("v578_token"),
    wallet: sessionStorage.getItem("v578_wallet"),
    loading: false,
    error: null,
  }));

  const authenticate = useCallback(async () => {
    if (!publicKey || !signMessage) {
      setState((s) => ({ ...s, error: "Wallet not connected" }));
      return null;
    }

    setState((s) => ({ ...s, loading: true, error: null }));

    try {
      const wallet = publicKey.toBase58();
      const timestamp = Math.floor(Date.now() / 1000);
      const message = `saia578:connect:${wallet}:${timestamp}`;
      const msgBytes = new TextEncoder().encode(message);
      const sigBytes = await signMessage(msgBytes);
      const signature = bs58.encode(sigBytes);

      const res: AuthResponse = await connectWallet({ wallet, message, signature });

      sessionStorage.setItem("v578_token", res.token);
      sessionStorage.setItem("v578_wallet", res.wallet);

      setState({
        token: res.token,
        wallet: res.wallet,
        loading: false,
        error: null,
      });

      return res;
    } catch (err: any) {
      const msg = err.message || "Authentication failed";
      setState((s) => ({ ...s, loading: false, error: msg }));
      return null;
    }
  }, [publicKey, signMessage]);

  const logout = useCallback(() => {
    sessionStorage.removeItem("v578_token");
    sessionStorage.removeItem("v578_wallet");
    setState({ token: null, wallet: null, loading: false, error: null });
  }, []);

  return {
    ...state,
    isAuthenticated: !!state.token,
    authenticate,
    logout,
  };
}
