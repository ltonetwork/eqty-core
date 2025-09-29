import type {
  Account,
  Chain,
  PublicClient,
  Transport,
  WalletClient,
} from "viem";

export type IViemAccount = Account;

export type IViemPublicClient<
  TTransport extends Transport = Transport,
  TChain extends Chain | undefined = Chain | undefined,
> = Pick<PublicClient<TTransport, TChain>, "simulateContract" | "readContract">;

export type IViemWalletClient<
  TAccount extends IViemAccount | undefined = IViemAccount | undefined,
  TTransport extends Transport = Transport,
  TChain extends Chain | undefined = Chain | undefined,
> = Pick<WalletClient<TTransport, TChain, TAccount>, "account" | "signTypedData" | "writeContract">;
