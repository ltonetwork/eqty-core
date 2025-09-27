import { TypedDataDomain, TypedDataField } from "ethers";

export interface ISignData {
  domain: TypedDataDomain;
  types: Record<string, Array<TypedDataField>>;
  value: Record<string, any>;
}
