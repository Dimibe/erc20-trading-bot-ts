import { BigNumber, utils } from 'ethers';
import { logger } from '../logger';
import { routerContract, SLIPPAGE, STABLE_TOKEN, tradeTokenContract, TRADE_TOKEN, wallet } from '../const';
import { web3 } from '../Web3Service';
import { Strategy } from './Strategy';
import { Order, OrderType } from '../Order';
import * as orderBook from '../OrderBook';

export class Scalping implements Strategy {
  MAX_TRADES: number;
  BUY_POWER: number;
  DROP_BEFORE_BUY: number;
  trades = 0;
  high!: number;
  low!: number;
  buyPrice?: number;
  currentState = BotState.BUY;

  constructor(strategyOptions: any) {
    this.MAX_TRADES = strategyOptions.maxTrades;
    this.BUY_POWER = strategyOptions.buyPower;
    this.DROP_BEFORE_BUY = strategyOptions.dropBeforeBuy;
  }

  async init(conversion: number): Promise<void> {
    this.high = conversion;
    this.low = conversion;
  }

  async priceUpdate(conversion: number) {
    let volatility = (this.high - this.low) / (this.high / 100);
    if (conversion > this.high) {
      this.high = conversion;
      logger.debug(`New high reached, low is %d$ which is a difference of %d%`, this.low, volatility);
    } else if (conversion < this.low) {
      this.low = conversion;
      logger.debug(`New low reached, high is %d$ which is a difference of %d%`, this.high, volatility);
    }

    switch (this.currentState) {
      case BotState.BUY:
        let priceTaget = this.high! - (this.high / 100) * this.DROP_BEFORE_BUY;
        let priceTargetMatched = conversion < priceTaget;
        logger.debug(`Current price is ${conversion - priceTaget}$ away from price taget ${priceTaget}$`);
        if (priceTargetMatched && this.trades < this.MAX_TRADES) {
          this.trades++;
          this.buyPrice = conversion;
          logger.debug(`Buy price is ${this.buyPrice}$`);
          let order = new Order(OrderType.BUY, this.BUY_POWER);
          await orderBook.executeOrder(order, conversion);
          this.currentState = BotState.SELL;
        }
        break;
      case BotState.SELL:
        const amountIn: BigNumber = await tradeTokenContract.balanceOf(wallet.address);
        const amounts: BigNumber[] = await routerContract.getAmountsOut(amountIn, [TRADE_TOKEN, STABLE_TOKEN]);
        const amountOutMin = amounts[1].sub(amounts[1].div(100 / SLIPPAGE));
        let outMinNumber = Number(utils.formatUnits(amountOutMin, web3.stableTokenDecimals));
        logger.debug(`Min Out would be ${outMinNumber} which is ${this.BUY_POWER - outMinNumber} away from buy price`);
        if (outMinNumber > this.BUY_POWER) {
          let amount = Number(utils.formatUnits(amountIn, web3.tradeTokenDecimals));
          let order = new Order(OrderType.SELL, amount);
          await orderBook.executeOrder(order, conversion);
          this.currentState = BotState.BUY;
        }
        break;
    }
  }

  async orderLiquidated(): Promise<void> {}
}

const enum BotState {
  BUY = 1,
  SELL = 2,
}
