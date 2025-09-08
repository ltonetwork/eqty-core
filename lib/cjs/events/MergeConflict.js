"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class MergeConflict extends Error {
    constructor(chain, left, right) {
        super(`Merge conflict: Mismatch after ${left.previous?.base58} between ${left.hash.base58} and ${right.hash.base58}`);
        this.chain = chain;
        this.left = left;
        this.right = right;
    }
}
exports.default = MergeConflict;
//# sourceMappingURL=MergeConflict.js.map