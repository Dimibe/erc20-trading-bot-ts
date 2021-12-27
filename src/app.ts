import { TransactionResponse } from '@ethersproject/abstract-provider';
import { WebSocketProvider } from '@ethersproject/providers';
import { BigNumber, Contract, utils, Wallet } from 'ethers';
import secrets from './secrets.json';
import options from './config/options.json';
import winston, { format } from 'winston';
import { lchown } from 'fs';

const winstonConfig = {
  levels: {
    error: 0,
    transaction: 1,
    info: 2,
    debug: 3,
  },
  colors: {
    error: 'red',
    transaction: 'yellow',
    info: 'yellow',
    debug: 'grey',
  },
};

const logger: any = winston.createLogger({
  levels: winstonConfig.levels,
  format: format.combine(
    winston.format.splat(),
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.printf((info) => {
      return `${info.timestamp} [${info.level.toUpperCase()}]: ${info.message}`;
    }),
    //   format.colorize({ all: true, colors: winstonConfig.colors }),
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/server.log' }),
    new winston.transports.File({
      level: 'transaction',
      filename: 'logs/transaction.log',
    }),
    new winston.transports.File({
      level: 'error',
      filename: 'logs/error.log',
    }),
  ],
});

const MAX_TRADES = options.MAX_TRADES; // Max numbers of trades the bot executes (swap and swap back counts as one trade).
const BUY_POWER = options.BUY_POWER; // Dollar value to buy.
const DROP_BEFORE_BUY = options.DROP_BEFORE_BUY; // Drop in % the price needs to fall before the bot starts a trade.

const SLIPPAGE = options.SLIPPAGE;
const GWEI = options.GWEI;
const GAS_LIMIT = options.GAS_LIMIT;

const STABLE_TOKEN = options.STABLE_TOKEN;
const TRADE_TOKEN = options.TRADE_TOKEN;
const pair = options.PAIR_ADDRESS;
const router = options.ROUTER_ADDRESS;

const provider = new WebSocketProvider(secrets.wss);
const wallet = new Wallet(secrets.privateKey);
const signer = wallet.connect(provider);

const pairContract = new Contract(
  pair,
  [
    'event Swap(address indexed sender, uint amount0In, uint amount1In, uint amount0Out,uint amount1Out,address indexed to)',
    'function getReserves() public view returns (uint112 _reserve0, uint112 _reserve1, uint32 _blockTimestampLast)',
  ],
  signer,
);

const routerContract = new Contract(
  router,
  [
    'function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts)',
    'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)',
  ],
  signer,
);

const stableTokenContract = new Contract(
  STABLE_TOKEN,
  [
    'function approve(address spender, uint256 amount) external returns (bool)',
    'function balanceOf(address) view returns (uint)',
  ],
  signer,
);

const tradeTokenContract = new Contract(
  TRADE_TOKEN,
  [
    'function approve(address spender, uint256 amount) external returns (bool)',
    'function balanceOf(address) view returns (uint)',
  ],
  signer,
);

const enum BotState {
  BUY = 1,
  SELL = 2,
}

// Start bot
main();

async function main() {
  let trades = 0;
  let tradeOngoing = false;
  let lastPrice: number;
  let high: number;
  let low: number;
  let buyPrice: number;
  let currentState = BotState.BUY;

  logger.info('Bot started!');
  logger.info(
    `Max trades set to ${MAX_TRADES} and Buy Power per trade is set to ${BUY_POWER}$`,
  );
  await info();
  pairContract.on('Swap', async () => {
    if (tradeOngoing) return;
    const pairData = await pairContract.getReserves();
    const stableTokenReserve = utils.formatUnits(
      pairData[1],
      options.STABLE_TOKEN_DIGITS,
    );
    const tradeTokenReserve = utils.formatUnits(
      pairData[0],
      options.TRADE_TOKEN_DIGITS,
    );
    const conversion = Number(stableTokenReserve) / Number(tradeTokenReserve);
    const priceChange = lastPrice ? conversion - lastPrice : 0;

    if (lastPrice == undefined) {
      lastPrice = conversion;
      high = conversion;
      low = conversion;
    }

    logger.info(
      `Price: ${conversion}$ / Change: ${priceChange}$ / Low: ${low}$ / High: ${high}$`,
    );

    if (priceChange === 0) return;

    if (conversion > high) {
      high = conversion;
      logger.info(
        `New high reached, low is ${low}$ which is a difference of ${
          (high - low) / (high / 100)
        }%`,
      );
    } else if (conversion < low) {
      low = conversion;
      logger.info(
        `New low reached, high is ${high}$ which is a difference of ${
          (high - low) / (high / 100)
        }%`,
      );
    }

    switch (currentState) {
      case BotState.BUY:
        let priceTaget = high - (high / 100) * DROP_BEFORE_BUY;
        let priceTargetMatched = conversion < priceTaget;
        logger.info(
          `Current price is ${
            conversion - priceTaget
          }$ away from price taget ${priceTaget}$`,
        );
        if (priceTargetMatched && trades < MAX_TRADES) {
          tradeOngoing = true;
          trades++;
          buyPrice = conversion;
          logger.info(`Buy price is ${buyPrice}$`);
          await buy();
          currentState = BotState.SELL;
          tradeOngoing = false;
        }
        break;
      case BotState.SELL:
        const sellPrice = conversion - (conversion / 100) * SLIPPAGE;
        logger.info(
          `Sell price ${sellPrice}$ is ${
            sellPrice - buyPrice
          }$ away from buy price ${buyPrice}$`,
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
}

async function swap(
  amountIn: BigNumber,
  pair: string[],
  tokenContract: Contract,
): Promise<any> {
  const amounts: BigNumber[] = await routerContract.getAmountsOut(
    amountIn,
    pair,
  );
  const amountOutMin = amounts[1].sub(amounts[1].div(100 / SLIPPAGE));

  const options = {
    gasPrice: utils.parseUnits(GWEI, 'gwei'),
    gasLimit: GAS_LIMIT,
  };

  logger.transaction('Swapping...');

  const approveTx: TransactionResponse = await tokenContract.approve(
    router,
    amountIn,
  );
  await approveTx.wait();
  logger.transaction(`Swap approved. Hash: ${approveTx.hash}`);

  const swapTx: TransactionResponse =
    await routerContract.swapExactTokensForTokens(
      amountIn,
      amountOutMin,
      pair,
      wallet.address,
      Date.now() + 1000 * 60 * 10,
      options,
    );
  logger.transaction(`Swap transaction hash: ${swapTx.hash}`);
  await swapTx.wait();
  logger.transaction('Swap done!');
  await info('transaction');
}

async function buy() {
  const amountIn: BigNumber = utils.parseUnits(
    BUY_POWER,
    options.STABLE_TOKEN_DIGITS,
  );
  logger.transaction(
    `Buying ${options.TRADE_TOKEN_NAME} for ${utils.formatUnits(
      amountIn,
      options.STABLE_TOKEN_DIGITS,
    )} ${options.STABLE_TOKEN_NAME} ...`,
  );
  try {
    await swap(amountIn, [STABLE_TOKEN, TRADE_TOKEN], stableTokenContract);
  } catch (e) {
    logger.error(e);
  }
}

async function sell() {
  const amountIn: BigNumber = await tradeTokenContract.balanceOf(
    wallet.address,
  );
  logger.transaction(
    `Selling ${utils.formatUnits(amountIn, options.TRADE_TOKEN_DIGITS)} ${
      options.TRADE_TOKEN_NAME
    } for ${options.STABLE_TOKEN_NAME}...`,
  );
  try {
    await swap(amountIn, [TRADE_TOKEN, STABLE_TOKEN], tradeTokenContract);
  } catch (e) {
    logger.error(e);
  }
}

async function info(logLevel: string = 'info') {
  const coinBalance = await provider.getBalance(wallet.address);
  const stableTokenBalance = await stableTokenContract.balanceOf(
    wallet.address,
  );
  const tradeTokenBalance = await tradeTokenContract.balanceOf(wallet.address);

  logger.log(logLevel, `Balance Information:`);
  logger.log(
    logLevel,
    `${utils.formatUnits(coinBalance, options.TRADE_TOKEN_DIGITS)} ${
      options.COIN_NAME
    }`,
  );
  logger.log(
    logLevel,
    `${utils.formatUnits(stableTokenBalance, options.STABLE_TOKEN_DIGITS)} ${
      options.STABLE_TOKEN_NAME
    }`,
  );
  logger.log(
    logLevel,
    `${utils.formatUnits(tradeTokenBalance, options.TRADE_TOKEN_DIGITS)} ${
      options.TRADE_TOKEN_NAME
    }`,
  );
}
