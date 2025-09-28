import { ISigner, ITypedDataDomain, ITypedDataField, IViemAccount, IViemWalletClient } from "../types";

export default class ViemSigner<T extends IViemAccount> implements ISigner {
  constructor(private client: IViemWalletClient<T>) {}

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
