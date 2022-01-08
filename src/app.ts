import { logger } from './logger';
import { web3 } from './Web3Service';
import { Strategy } from './strategies/Strategy';
import { Scalping } from './strategies/Scalping';
import { GridTradingOld } from './strategies/GridTradingOld';
import options from './config/options.json';
import { simulationMode, wallet } from './const';
import { GridTrading } from './strategies/GridTrading';
import { orderBook } from './OrderBook';
import express from 'express';
import { readFileSync } from 'fs';

const app = express();
const port = options.serverPort;
const strategy: Strategy = getStrategy();

let conversion: number;
let lastPrice: number;
let botRunning: boolean = true;

app.get('/info', async (req, res) => {
  const coinBalance = await web3.getCoinBalance();
  const stableTokenBalance = await web3.getStableTokenBalance();
  const tradeTokenBalance = await web3.getTradeTokenBalance();

  let info = `
  ***************************
  Info: 
  Address: ${await wallet.getAddress()}
  ${options.coinName}: ${coinBalance}
  ${web3.stableTokenSymbol}: ${stableTokenBalance}
  ${web3.tradeTokenSymbol}: ${tradeTokenBalance}
  ***************************
  `;
  res.send(info.replace(new RegExp('\n', 'g'), '<br />'));
});

app.get('/logs/:filename', (req, res) => {
  let fileName = req.params.filename;
  try {
    let file = readFileSync(`logs/${fileName}.log`, 'utf-8');
    file = file.replace(new RegExp('\n', 'g'), '<br />');
    res.send(file);
  } catch (e) {
    res.status(500).send('The specified log file does not exist.');
  }
});

app.listen(port, () => {
  return logger.info(`⚡️Server is running at http://localhost:${port}`);
});

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
  while (botRunning) {
    try {
      const conversion = await web3.getCurrentPrice();
      const priceChange = conversion - lastPrice;
      if (priceChange !== 0) {
        logger.debug(
          `Price: ${conversion} ${web3.stableTokenSymbol} / Change: ${priceChange.toFixed(web3.stableTokenDecimals)} ${
            web3.stableTokenSymbol
          }`,
        );
        let orders = await orderBook.liquidateOrders(conversion);
        for (let order of orders) {
          await strategy.orderLiquidated(order);
        }
        await strategy.priceUpdate(conversion, priceChange);
      }
      lastPrice = conversion;
    } catch (e) {
      if (e instanceof Error) {
        logger.error(e.message);
      } else {
        logger.error(e);
      }
    }
    await new Promise((f) => setTimeout(f, options.refreshTime));
  }
}

function getStrategy(): Strategy {
  switch (options.strategy) {
    case 'scalping':
      return new Scalping(options.strategies.scalping);
    case 'gridTrading':
      return new GridTrading(options.strategies.gridTrading);
    case 'gridTradingOld':
      return new GridTradingOld(options.strategies.gridTrading);
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
