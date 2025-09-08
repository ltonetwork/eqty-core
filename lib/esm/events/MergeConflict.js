export default class MergeConflict extends Error {
    constructor(chain, left, right) {
        super(`Merge conflict: Mismatch after ${left.previous?.base58} between ${left.hash.base58} and ${right.hash.base58}`);
        this.chain = chain;
        this.left = left;
        this.right = right;
    }
}
//# sourceMappingURL=MergeConflict.js.map