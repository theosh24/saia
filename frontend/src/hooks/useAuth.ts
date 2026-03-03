import { useState, useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { verifyOwnership, type AuthResponse } from "@/services/api";
import bs58 from "bs58";

interface AuthState {
  token: string | null;
  agentMint: string | null;
  loading: boolean;
  error: string | null;
}

export function useAuth() {
  const { publicKey, signMessage } = useWallet();
  const [state, setState] = useState<AuthState>(() => ({
    token: sessionStorage.getItem("v578_token"),
    agentMint: sessionStorage.getItem("v578_agent_mint"),
    loading: false,
    error: null,
  }));

  const authenticate = useCallback(
    async (mint: string) => {
      if (!publicKey || !signMessage) {
        setState((s) => ({ ...s, error: "Wallet not connected" }));
        return null;
      }

      setState((s) => ({ ...s, loading: true, error: null }));

      try {
        const wallet = publicKey.toBase58();
        const timestamp = Math.floor(Date.now() / 1000);
        const message = `vector578:verify:${wallet}:${mint}:${timestamp}`;
        const msgBytes = new TextEncoder().encode(message);
        const sigBytes = await signMessage(msgBytes);
        const signature = bs58.encode(sigBytes);

        const res: AuthResponse = await verifyOwnership({
          wallet,
          mint,
          message,
          signature,
        });

        sessionStorage.setItem("v578_token", res.token);
        sessionStorage.setItem("v578_agent_mint", res.agentMint);

        setState({
          token: res.token,
          agentMint: res.agentMint,
          loading: false,
          error: null,
        });

        return res;
      } catch (err: any) {
        const msg = err.message || "Authentication failed";
        setState((s) => ({ ...s, loading: false, error: msg }));
        return null;
      }
    },
    [publicKey, signMessage]
  );

  const logout = useCallback(() => {
    sessionStorage.removeItem("v578_token");
    sessionStorage.removeItem("v578_agent_mint");
    setState({ token: null, agentMint: null, loading: false, error: null });
  }, []);

  return {
    ...state,
    isAuthenticated: !!state.token,
    authenticate,
    logout,
  };
}
