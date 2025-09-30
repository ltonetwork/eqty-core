import { ISigner, ITypedDataDomain, ITypedDataField } from "../types";

export default class ViemSigner implements ISigner {
  constructor(private client: any) {}

  async getAddress(): Promise<string> {
    if (!this.client.account) throw new Error("No account set on wallet client");
    return this.client.account.address;
  }

  async signTypedData(
    domain: ITypedDataDomain,
    types: Record<string, ITypedDataField[]>,
    value: Record<string, any>,
  ): Promise<string> {
    if (!this.client.account) throw new Error("No account set on wallet client");

    return this.client.signTypedData({
      account: this.client.account,
      domain,
      types,
      primaryType: Object.keys(types)[0],
      message: value,
    });
  }
}
