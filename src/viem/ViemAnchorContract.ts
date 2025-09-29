import { IViemAccount, IViemPublicClient, IViemWalletClient } from "../types";
import { AnchorClient } from "../anchor";

export default class ViemAnchorContract<TAccount extends IViemAccount> {
  constructor(
    private readonly client: IViemPublicClient,
    private readonly wallet: IViemWalletClient<TAccount>,
    private readonly address: `0x${string}`,
  ) {}

  async anchor(anchors: Array<{ key: `0x${string}`; value: `0x${string}` }>): Promise<void> {
    const { request } = await this.client.simulateContract({
      address: this.address,
      abi: AnchorClient.ABI,
      functionName: "anchor",
      args: [anchors],
      account: this.wallet.account!,
    });

    await this.wallet.writeContract(request);
  }

  async maxAnchors(): Promise<number> {
    const result = await this.client.readContract({
      address: this.address,
      abi: AnchorClient.ABI,
      functionName: "maxAnchors",
    });
    return Number(result);
  }
}
