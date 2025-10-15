import { AnchorClient } from "../anchor";

export default class ViemAnchorContract {
  constructor(
    private readonly client: any,
    private readonly wallet: any,
    private readonly address: `0x${string}`
  ) {}

  async anchor(
    anchors: Array<{ key: `0x${string}`; value: `0x${string}` }>
  ): Promise<string> {
    const { request } = await this.client.simulateContract({
      address: this.address,
      abi: AnchorClient.ABI,
      functionName: "anchor",
      args: [anchors],
      account: this.wallet.account!,
    });

    const result = await this.wallet.writeContract(request);

    // Handle different response formats
    if (typeof result === "string") {
      return result;
    } else if (result && typeof result === "object") {
      if ("hash" in result) {
        return result.hash;
      } else if ("transactionHash" in result) {
        return result.transactionHash;
      } else if ("txHash" in result) {
        return result.txHash;
      } else {
        throw new Error(
          `Unexpected writeContract result format: ${JSON.stringify(result)}`
        );
      }
    } else {
      throw new Error(`Unexpected writeContract result type: ${typeof result}`);
    }
  }

  async maxAnchors(): Promise<number> {
    return await this.client.readContract({
      address: this.address,
      abi: AnchorClient.ABI,
      functionName: "maxAnchors",
    });
  }
}
