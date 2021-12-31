import { logger } from './logger';
import options from './config/options.json';
import * as web3 from './Web3Service';
import { Strategy } from './strategies/Strategy';
import { Scalping } from './strategies/Scalping';
import { GridTrading } from './strategies/GridTrading';

const strategy: Strategy = getStrategy();

let conversion: number;
let lastPrice: number;

main();

async function main() {

  logger.info('Bot started!');

  conversion = await web3.getCurrentPrice();
  lastPrice = conversion;

  await web3.info();

  await strategy.init(conversion);

  run();
}

async function run() {
  const conversion = await web3.getCurrentPrice();
  const priceChange = conversion - lastPrice;

  if (priceChange !== 0) {
    logger.info(`Price: ${conversion}$ / Change: ${priceChange}$`);
    try {
      await strategy.priceUpdate(conversion, priceChange);
    } catch(e) {
      if (e instanceof Error) {
        logger.error(e.message);
      } else {
        logger.error(e);
      }
    }
  }

  lastPrice = conversion;
  setTimeout(run, 1000);
}

function getStrategy(): Strategy {
  switch (options.strategy) {
    case 'scalping':
      return new Scalping(options.strategies.scalping);
    case 'gridTrading':
      return new GridTrading(options.strategies.gridTrading);
    default:
      throw Error(`No strategy ${options.strategy} available`);
  }
}
