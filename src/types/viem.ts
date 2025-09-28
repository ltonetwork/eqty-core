import { ITypedDataDomain, ITypedDataField } from "./signer"

export interface IViemAccount {
  address: `0x${string}`;
}

interface IViemRequest<TAccount extends IViemAccount> {
  account: TAccount,
  address: `0x${string}`,
  abi: any,
  functionName: string,
  args?: any[],
}

export interface IViemWalletClient<TAccount extends IViemAccount> {
  account?: TAccount;

  signTypedData(args: {
    account: TAccount;
    domain: ITypedDataDomain;
    types: Record<string, readonly ITypedDataField[]>;
    primaryType: string;
    message: any;
  }): Promise<`0x${string}`>;

  writeContract(args: IViemRequest<TAccount>): Promise<`0x${string}`>;
}

export interface IViemPublicClient {
  simulateContract<TAccount extends IViemAccount>(
    args: IViemRequest<TAccount>,
  ): Promise<{ result: any, request: IViemRequest<TAccount> }>;

  readContract(args: {
    address: `0x${string}`,
    abi: any,
    functionName: string,
    args?: any[],
  }): Promise<any>;
}
