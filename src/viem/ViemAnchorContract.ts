import { AnchorClient } from "../anchor"

export default class ViemAnchorContract {
  constructor(
    private readonly client: any,
    private readonly wallet: any,
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
    return await this.client.readContract({
      address: this.address,
      abi: AnchorClient.ABI,
      functionName: "maxAnchors",
    });
  }
}
