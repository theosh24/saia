import { useQuery } from "@tanstack/react-query";
import { getAgents, getAgent, type Agent, type AgentsResponse } from "@/services/api";

export function useAgents(page = 0, limit = 100) {
  return useQuery<AgentsResponse>({
    queryKey: ["agents", page, limit],
    queryFn: () => getAgents(page, limit),
    staleTime: 30_000,
  });
}

export function useAgent(slugOrMint: string | undefined) {
  return useQuery<Agent>({
    queryKey: ["agent", slugOrMint],
    queryFn: () => getAgent(slugOrMint!),
    enabled: !!slugOrMint,
    staleTime: 30_000,
  });
}
