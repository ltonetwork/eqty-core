/**
 * ABI for the Base anchor contract
 * Matches the deployed contract at 0x7607af0cea78815c71bbea90110b2c218879354b
 */
export declare const ANCHOR_ABI: readonly [{
    readonly inputs: readonly [{
        readonly components: readonly [{
            readonly name: "key";
            readonly type: "bytes32";
        }, {
            readonly name: "value";
            readonly type: "bytes32";
        }];
        readonly name: "anchors";
        readonly type: "tuple[]";
    }];
    readonly name: "anchor";
    readonly outputs: readonly [];
    readonly stateMutability: "nonpayable";
    readonly type: "function";
}, {
    readonly anonymous: false;
    readonly inputs: readonly [{
        readonly indexed: true;
        readonly name: "key";
        readonly type: "bytes32";
    }, {
        readonly indexed: false;
        readonly name: "value";
        readonly type: "bytes32";
    }, {
        readonly indexed: true;
        readonly name: "sender";
        readonly type: "address";
    }, {
        readonly indexed: false;
        readonly name: "timestamp";
        readonly type: "uint64";
    }];
    readonly name: "Anchored";
    readonly type: "event";
}];
//# sourceMappingURL=AnchorABI.d.ts.map