import { BigNumber, utils } from 'ethers';
import { logger } from '../logger';
import options from '../config/options.json';
import {
  routerContract,
  SLIPPAGE,
  STABLE_TOKEN,
  tradeTokenContract,
  TRADE_TOKEN,
  wallet,
} from '../const';
import * as web3 from '../Web3Service';
import { Strategy } from './Strategy';

const MAX_TRADES = options.strategies.scalping.maxTrades;
const BUY_POWER = options.strategies.scalping.buyPower;
const DROP_BEFORE_BUY = options.strategies.scalping.dropBeforeBuy;

export class Scalping implements Strategy {
  trades = 0;
  tradeOngoing = false;
  high: number | undefined;
  low: number | undefined;
  buyPrice: number | undefined;
  currentState = BotState.BUY;

  async init(conversion: number): Promise<void> {
    this.high = conversion;
    this.low = conversion;
  }

  async priceUpdate(conversion: number, priceChange: number) {
    if (this.tradeOngoing) return;

    if (conversion > this.high!) {
      this.high = conversion;
      logger.info(
        `New high reached, low is ${this.low}$ which is a difference of ${
          (this.high - this.low!) / (this.high / 100)
        }%`,
      );
    } else if (conversion < this.low!) {
      this.low = conversion;
      logger.info(
        `New low reached, high is ${this.high}$ which is a difference of ${
          (this.high! - this.low) / (this.high! / 100)
        }%`,
      );
    }

    switch (this.currentState) {
      case BotState.BUY:
        let priceTaget = this.high! - (this.high! / 100) * DROP_BEFORE_BUY;
        let priceTargetMatched = conversion < priceTaget;
        logger.info(
          `Current price is ${
            conversion - priceTaget
          }$ away from price taget ${priceTaget}$`,
        );
        if (priceTargetMatched && this.trades < MAX_TRADES) {
          this.tradeOngoing = true;
          this.trades++;
          this.buyPrice = conversion;
          logger.info(`Buy price is ${this.buyPrice}$`);
          try {
            await web3.buy(BUY_POWER);
            this.currentState = BotState.SELL;
          } catch (e) {
            if (e instanceof Error) {
              logger.error(e.message);
            } else {
              logger.error(e);
            }
          }
          this.tradeOngoing = false;
        }
        break;
      case BotState.SELL:
        const amountIn: BigNumber = await tradeTokenContract.balanceOf(
          wallet.address,
        );

        const amounts: BigNumber[] = await routerContract.getAmountsOut(
          amountIn,
          [TRADE_TOKEN, STABLE_TOKEN],
        );
        const amountOutMin = amounts[1].sub(amounts[1].div(100 / SLIPPAGE));
        let outMinNumber = Number(
          utils.formatUnits(amountOutMin, options.stalbeTokenDigits),
        );
        logger.info(
          `Min Out would be ${outMinNumber} which is ${
            BUY_POWER - outMinNumber
          } away from buy price`,
        );
        if (outMinNumber > BUY_POWER && !this.tradeOngoing) {
          this.tradeOngoing = true;
          try {
            await web3.sell(amountIn, amountOutMin);
            this.currentState = BotState.BUY;
          } catch (e) {
            if (e instanceof Error) {
              logger.error(e.message);
            } else {
              logger.error(e);
            }
          }
          this.tradeOngoing = false;
        }
        break;
    }
  }
}

const enum BotState {
  BUY = 1,
  SELL = 2,
}
