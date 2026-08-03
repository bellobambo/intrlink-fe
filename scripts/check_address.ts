import { getAddress, isAddress } from 'viem';

const addrs = [
  "0x8c0803566113b246aBe776a31c5ee2cE61d1F222",
  "0xDF64D7bFedf0100177D9276f83cF279093077B29",
  "0x742E38637aD924117e39D6354C1ec81CED5872a6",
  "0x0b847167664c3917F44738734262b8813C9A3dc7"
];

for (const a of addrs) {
  try {
    const valid = isAddress(a);
    const checksummed = getAddress(a.toLowerCase());
    console.log(a, "-> valid:", valid, "-> checksummed:", checksummed);
  } catch (e) {
    console.log(a, "-> ERROR:", (e as Error).message);
  }
}
