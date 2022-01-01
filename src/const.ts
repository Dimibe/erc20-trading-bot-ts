import { WebSocketProvider } from '@ethersproject/providers';
import { Contract, Wallet } from 'ethers';
import secrets from './config/secrets.json';
import options from './config/options.json';

export const SLIPPAGE = options.slippage;
export const MAX_GWEI = options.maxGwei;
export const GAS_LIMIT = options.gasLimit;

export const simulationMode: boolean = options.simulationMode ?? false;

export const STABLE_TOKEN = options.stalbeToken;
export const TRADE_TOKEN = options.tradeToken;
export const pair = options.pairAddress;
export const router = options.routerAddress;

export const provider = new WebSocketProvider(secrets.wss);
export const wallet = new Wallet(secrets.privateKey);
export const signer = wallet.connect(provider);

export const pairContract = new Contract(
  pair,
  [
    'event Swap(address indexed sender, uint amount0In, uint amount1In, uint amount0Out,uint amount1Out,address indexed to)',
    'function getReserves() public view returns (uint112 _reserve0, uint112 _reserve1, uint32 _blockTimestampLast)',
  ],
  signer,
);

export const routerContract = new Contract(
  router,
  [
    'function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts)',
    'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)',
  ],
  signer,
);

export const stableTokenContract = new Contract(
  STABLE_TOKEN,
  [
    'function approve(address spender, uint256 amount) external returns (bool)',
    'function balanceOf(address) view returns (uint)',
    'function decimals() external view returns (uint8)',
    'function symbol() external view returns (string memory)',
  ],
  signer,
);

export const tradeTokenContract = new Contract(
  TRADE_TOKEN,
  [
    'function approve(address spender, uint256 amount) external returns (bool)',
    'function balanceOf(address) view returns (uint)',
    'function decimals() external view returns (uint8)',
    'function symbol() external view returns (string memory)',
  ],
  signer,
);
