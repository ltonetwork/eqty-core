export interface ITypedDataDomain {
  name?: string;
  version?: string;
  chainId?: number;
}

export interface ITypedDataField {
  name: string;
  type: string;
}

export interface ISignData {
  domain: ITypedDataDomain;
  types: Record<string, Array<ITypedDataField>>;
  value: Record<string, any>;
}

export interface ISigner {
  getAddress(): Promise<string>;
  signTypedData(domain: ITypedDataDomain, types: Record<string, ITypedDataField[]>, value: any): Promise<string>;
}

export type VerifyFn = (
  address: string,
  domain: ITypedDataDomain,
  types: Record<string, Array<ITypedDataField>>,
  value: Record<string, any>,
  signature: string,
) => Promise<boolean>;
