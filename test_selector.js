import { keccak256, toHex, stringToBytes } from 'viem';
const errors = [
  "Unauthorized(bytes32,address)",
  "ZeroAddress()",
  "InvalidMerchant()",
  "InvalidMerchantProfile()",
  "MerchantAlreadyExists(bytes32)",
  "InvalidSettlementAddress()",
  "InvalidIntent()",
  "IntentAlreadyExists(bytes32)",
  "InvalidFiatAmount()",
  "InvalidItem(bytes32)",
  "InvalidItemDetails()",
  "InvalidQuantity()",
  "EmptyCart()",
  "DuplicateCartItem(bytes32)",
  "ItemAlreadyExists(bytes32)",
  "AssetAlreadyExists(address)",
  "EmptyAssetBatch()",
  "UnsupportedAsset(address)",
  "InvalidDecimals()",
  "InvalidQuoteExpiry()",
  "InvalidOraclePrice()",
  "OracleDecimalsMismatch(uint8,int8)",
  "StaleOraclePrice(uint64,uint64)",
  "IntentNotPayable(bytes32,uint8)",
  "IntentExpired(bytes32)",
  "IncorrectNativeAmount(uint256,uint256)",
  "NativeTransferFailed()",
  "TokenTransferFailed()",
  "ContractPaused()",
  "ReentrantCall()"
];
for (let err of errors) {
  const hash = keccak256(stringToBytes(err));
  if (hash.startsWith("0x33add252")) {
    console.log("MATCH:", err);
  }
}
