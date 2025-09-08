import { Signer } from "ethers";
import { ISigner } from "../signer";
/**
 * Ethereum account wrapper that implements the ISigner interface
 * This provides a clean abstraction for Ethereum accounts in the EQTY ecosystem
 */
export default class EthereumAccount implements ISigner {
    private signer;
    constructor(signer: Signer);
    /**
     * Get the Ethereum address of this account
     */
    getAddress(): Promise<string>;
    /**
     * Sign arbitrary data with this account
     */
    sign(data: Uint8Array): Promise<Uint8Array>;
    /**
     * Sign a message string
     */
    signMessage(message: string | Uint8Array): Promise<string>;
    /**
     * Get the underlying ethers Signer
     */
    getSigner(): Signer;
    /**
     * Create an Ethereum account from a connected wallet Signer
     * This is the primary method for Base/Ethereum integration
     */
    static fromSigner(signer: Signer): EthereumAccount;
}
//# sourceMappingURL=EthereumAccount.d.ts.map