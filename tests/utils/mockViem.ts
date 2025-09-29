import type { Account, PublicClient, WalletClient } from "viem";

type AnyPublicClient = PublicClient<any, any>;
type AnyWalletClient<TAccount extends Account | undefined> = WalletClient<any, any, TAccount>;

export function makeMockPublicClient(overrides: Partial<AnyPublicClient> = {}): AnyPublicClient {
  const base = {
    async simulateContract(_args: unknown) {
      throw new Error("mock simulateContract not implemented");
    },
    async readContract(_args: unknown) {
      throw new Error("mock readContract not implemented");
    },
    async getChainId() {
      return 1;
    },
    async getBlockNumber() {
      return 123n;
    },
    async getBalance(_address: string) {
      return 0n;
    },
    async request(_args: unknown) {
      throw new Error("mock request not implemented");
    },
    chain: { id: 1 } as any,
    transport: {} as any,
  } as unknown as AnyPublicClient;

  return Object.assign(base, overrides) as AnyPublicClient;
}

export function makeMockWalletClient<
  TAccount extends Account | undefined = Account | undefined,
>(overrides: Partial<AnyWalletClient<TAccount>> = {}): AnyWalletClient<TAccount> {
  const base = {
    account: undefined,
    async signMessage(_args: { account: TAccount; message: string | Uint8Array }) {
      return "0xsigned-mock";
    },
    async signTypedData(_args: unknown) {
      return "0xsig-typed-mock";
    },
    async request(_args: unknown) {
      throw new Error("mock wallet request not implemented");
    },
    async sendTransaction(_args: unknown) {
      return { hash: "0xmockhash" } as any;
    },
    async writeContract(_args: unknown) {
      return "0xmockhash" as any;
    },
  } as unknown as AnyWalletClient<TAccount>;

  return Object.assign(base, overrides) as AnyWalletClient<TAccount>;
}
