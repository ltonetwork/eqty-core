import { ITypedDataDomain, ITypedDataField } from "./signer"

export interface IViemAccount {
  address: string;
}

interface IViemRequest<TAccount extends IViemAccount> {
  account: TAccount,
  address: string,
  abi: any,
  functionName: string,
  args?: any[],
}

export interface IViemWalletClient<TAccount extends IViemAccount> {
  account?: TAccount;

  signTypedData(args: {
    account: TAccount;
    domain: ITypedDataDomain;
    types: Record<string, ITypedDataField[]>;
    primaryType: string;
    message: any;
  }): Promise<string>;

  writeContract(args: IViemRequest<TAccount>): Promise<string>;
}

export interface IViemPublicClient {
  simulateContract<TAccount extends IViemAccount>(
    args: IViemRequest<TAccount>,
  ): Promise<{ result: any, request: IViemRequest<TAccount> }>;

  readContract(args: {
    address: string,
    abi: any,
    functionName: string,
    args?: any[],
  }): Promise<any>;
}
