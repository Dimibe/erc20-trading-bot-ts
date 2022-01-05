import { logger } from './logger';
import { web3 } from './Web3Service';
import { Strategy } from './strategies/Strategy';
import { Scalping } from './strategies/Scalping';
import { GridTrading } from './strategies/GridTrading';
import options from './config/options.json';
import { simulationMode } from './const';
import { GridTradingPro } from './strategies/GridTradingPro';
import * as orderBook from './OrderBook';

const strategy: Strategy = getStrategy();
let conversion: number;
let lastPrice: number;

main();

async function main(): Promise<void> {
  logger.info('Bot started!');
  // init
  await web3.init();

  checkMode();
  checkGwei();

  conversion = await web3.getCurrentPrice();
  lastPrice = conversion;

  await web3.info();

  await strategy.init(conversion);

  run();
}

async function run(): Promise<void> {
  const conversion = await web3.getCurrentPrice();
  const priceChange = conversion - lastPrice;

  if (priceChange !== 0) {
    logger.info(
      `Price: ${conversion} ${web3.stableTokenSymbol} / Change: ${priceChange.toFixed(web3.stableTokenDecimals)} ${
        web3.stableTokenSymbol
      }`,
    );
    try {
      let orders = await orderBook.liquidateOrders(conversion);
      for (let order of orders) {
        await strategy.orderLiquidated(order);
      }
      await strategy.priceUpdate(conversion, priceChange);
    } catch (e) {
      if (e instanceof Error) {
        logger.error(e.message);
      } else {
        logger.error(e);
      }
    }
  }

  lastPrice = conversion;
  setTimeout(run, options.refreshTime);
}

function getStrategy(): Strategy {
  switch (options.strategy) {
    case 'scalping':
      return new Scalping(options.strategies.scalping);
    case 'gridTrading':
      return new GridTrading(options.strategies.gridTrading);
    case 'gridTradingPro':
      return new GridTradingPro(options.strategies.gridTrading);
    default:
      throw Error(`No strategy ${options.strategy} available`);
  }
}

async function checkGwei(): Promise<void> {
  let configuredGwei = options.maxGwei;
  let gasPrice = await web3.getGasPrice();
  if (configuredGwei < gasPrice) {
    logger.warn(`Configured max gwei (${configuredGwei}) is below estimated gwei (${gasPrice})`);
  }
}

function checkMode(): void {
  if (simulationMode) {
    logger.warn(`Bot is running in simulation mode. No swapps will be made!`);
  }
}
