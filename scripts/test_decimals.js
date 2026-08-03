import { createPublicClient, http } from 'viem';
import { flareTestnet } from 'viem/chains';

const client = createPublicClient({
  chain: flareTestnet,
  transport: http('https://coston2-api.flare.network/ext/C/rpc')
});

const ABI = [{"type":"function","name":"getFeedById","inputs":[{"name":"_feedId","type":"bytes21"}],"outputs":[{"name":"","type":"uint256"},{"name":"","type":"int8"},{"name":"","type":"uint64"}],"stateMutability":"payable"}];
const ftsoRegistryAddress = "0x0000000000000000000000000000000000000000"; // Wait, I need the FTSO address
