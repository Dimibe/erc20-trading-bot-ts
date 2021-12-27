import { TransactionResponse } from '@ethersproject/abstract-provider';
import { BigNumber, BigNumberish, Contract, ethers, Transaction } from 'ethers';
import secrets from './secrets.json';

const WMATIC = '0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270';
//const USDT = '0xc2132d05d31c914a87c6611c10748aeb04b58e8f';
const USDC = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174';

//const pair_usdt = '0x604229c960e5CACF2aaEAc8Be68Ac07BA9dF81c3';
const pair = '0x6e7a5FAFcec6BB1e78bAE2A1F0B612012BF14827';
const router = '0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff';

const provider = new ethers.providers.WebSocketProvider(secrets.wss);
const wallet = new ethers.Wallet(secrets.privateKey);
const signer = wallet.connect(provider);

const pairContract = new ethers.Contract(
  pair,
  [
    'event Swap(address indexed sender, uint amount0In, uint amount1In, uint amount0Out,uint amount1Out,address indexed to)',
    'function getReserves() public view returns (uint112 _reserve0, uint112 _reserve1, uint32 _blockTimestampLast)',
  ],
  signer,
);

const routerContract = new ethers.Contract(
  router,
  [
    'function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts)',
    'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)',
  ],
  signer,
);

const usdcContract = new ethers.Contract(
  USDC,
  [
    'function approve(address spender, uint256 amount) external returns (bool)',
    'function balanceOf(address) view returns (uint)',
  ],
  signer,
);

const wmaticContract = new ethers.Contract(
  WMATIC,
  [
    'function approve(address spender, uint256 amount) external returns (bool)',
    'function balanceOf(address) view returns (uint)',
  ],
  signer,
);

enum BotState {
  BUY = 1,
  SELL = 2,
};
const MAX_TRADES = 5;
const BUY_POWER = '1'; // USDC value to buy.

let trades = 0;
let tradeOngoing = false;
let lastPrice: number;
let buyPrice: number;
let currentState = BotState.BUY;

console.log('Bot started!');
pairContract.on('Swap', async () => {
  if (tradeOngoing) return;
  const pairData = await pairContract.getReserves();
  const maticReserve = ethers.utils.formatUnits(pairData[0], 18);
  const usdcReserve = ethers.utils.formatUnits(pairData[1], 6);
  const conversion = Number(usdcReserve) / Number(maticReserve);

  console.log('Swap happend.');
  console.log(`Time: ${new Date(pairData[2] * 1000)}`);
  console.log(
    `Price: ${conversion} $ / ${lastPrice ? conversion - lastPrice : 0} $ `,
  );

  switch (currentState) {
    case BotState.BUY:
      const priceDown: boolean = lastPrice != undefined && conversion < lastPrice;
      if (priceDown && trades < MAX_TRADES) {
        tradeOngoing = true;
        trades++;
        buyPrice = conversion;
        console.log(`Buy price is ${buyPrice}`);
        await buy();
        currentState = BotState.SELL;
        tradeOngoing = false;
      }
      break;
    case BotState.SELL:
      const sellPrice = conversion - conversion / 200;
      console.log(
        `Evaluating sell for price ${sellPrice} wich is ${
          sellPrice - buyPrice
        } away from ${buyPrice}`,
      );
      if (sellPrice > buyPrice && !tradeOngoing) {
        tradeOngoing = true;
        await sell();
        currentState = BotState.BUY;
        tradeOngoing = false;
      }
      break;
  }
  lastPrice = conversion;
});

async function swap(
  amountIn: BigNumber,
  pair: string[],
  tokenContract: Contract,
): Promise<any> {
  const amounts: BigNumber[] = await routerContract.getAmountsOut(
    amountIn,
    pair,
  );
  const amountOutMin = amounts[1].sub(amounts[1].div(200));
  const options = {
    gasPrice: ethers.utils.parseUnits('35', 'gwei'),
    gasLimit: 200000,
  };

  console.log(`
  ******************
  Amounts: ${amounts}
  USDC In: ${amountIn}
  WMATIC Out Min: ${amountOutMin}
  ******************
  `);

  console.log('Swapping...');

  const approveTx: TransactionResponse = await tokenContract.approve(
    router,
    amountIn,
  );
  await approveTx.wait();
  console.log(`Swap approved. Hash: ${approveTx.hash}`);

  const swapTx: TransactionResponse = await routerContract.swapExactTokensForTokens(
    amountIn,
    amountOutMin,
    pair,
    wallet.address,
    Date.now() + 1000 * 60 * 10,
    options,
  );
  console.log(`Swap transaction hash: ${swapTx.hash}`);
  await swapTx.wait();
  console.log('Swap done!');
}

async function buy() {
  const amountIn: BigNumber = ethers.utils.parseUnits(BUY_POWER, 6);
  console.log(
    `Buying wmatic for ${ethers.utils.formatUnits(amountIn, 6)} usdc...`,
  );
  await swap(amountIn, [USDC, WMATIC], usdcContract);
}

async function sell() {
  const amountIn: BigNumber = await wmaticContract.balanceOf(wallet.address);
  console.log(
    `Selling ${ethers.utils.formatUnits(amountIn, 18)} wmatic for usdt...`,
  );
  await swap(amountIn, [WMATIC, USDC], wmaticContract);
}

async function info() {
  const matic_balance = await provider.getBalance(wallet.address);
  const block = await provider.getBlockNumber();

  const usdc_balance = await usdcContract.balanceOf(wallet.address);

  const wmatic_balance = await wmaticContract.balanceOf(wallet.address);

  console.log(ethers.utils.formatUnits(usdc_balance, 6));

  console.log(`
    BlockNumber: ${block}
    MATIC Balance: ${matic_balance}
    USDC Balance: ${usdc_balance}
    WMATIC Balance: ${wmatic_balance}
  `);
}
