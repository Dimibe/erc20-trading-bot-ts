import LogFactory from '../logger';
import { Order, OrderType } from '../Order';
import { web3 } from '../Web3Service';
import { Strategy } from './Strategy';
import { orderBook } from '../OrderBook';

const logger = LogFactory.createLogger('GridTradingOld');

export class GridTradingOld implements Strategy {
  rebalance: boolean;
  min: number;
  max: number;
  totalBuyPower: number;
  buyPowerPerGrid: number;
  gridCount: number;
  gridSize: number;
  nextSell!: number;
  nextBuy!: number;

  public constructor(strategyOptions: any) {
    this.rebalance = strategyOptions.rebalance;
    this.min = strategyOptions.range.min;
    this.max = strategyOptions.range.max;
    this.gridCount = strategyOptions.gridCount;
    this.totalBuyPower = strategyOptions.totalBuyPower;
    this.gridSize = (this.max - this.min) / this.gridCount;
    this.buyPowerPerGrid = this.totalBuyPower / this.gridCount;
  }

  public get name() {
    return 'Grid Trading Old';
  }

  public async init(conversion: number): Promise<void> {
    logger.info(`Grids: ${this.gridCount} Size: ${this.gridSize} Buy power per grid: ${this.buyPowerPerGrid}`);

    let currentGrid = this.calculateGrid(conversion);
    let buyPower = (this.gridCount - currentGrid) * this.buyPowerPerGrid;

    if (this.rebalance) {
      let currentValue = (await web3.getTradeTokenBalance()) * conversion;
      buyPower = buyPower - currentValue;
    }
    if (buyPower > 0) {
      await this.executeBuy(buyPower, currentGrid, conversion);
    } else {
      await this.executeSell(-buyPower / conversion, currentGrid, conversion);
    }
  }

  public async priceUpdate(conversion: number): Promise<void> {
    let currentGrid = this.calculateGrid(conversion);
    let sellPrice = this.min + this.gridSize * this.nextSell;
    let buyPrice = this.min + this.gridSize * (this.nextBuy + 1);
    logger.info(`Grid ${currentGrid} : Buy: ${this.nextBuy} (${buyPrice}$) Sell: ${this.nextSell} (${sellPrice}$)`);

    if (currentGrid >= this.nextSell) {
      let amount = (currentGrid - this.nextSell + 1) * (this.buyPowerPerGrid / conversion);
      await this.executeSell(amount, currentGrid, conversion);
    } else if (currentGrid <= this.nextBuy) {
      let amount = (this.nextBuy - currentGrid + 1) * this.buyPowerPerGrid;
      await this.executeBuy(amount, currentGrid, conversion);
    }
  }

  public async orderLiquidated(order: Order): Promise<void> {}

  private async executeSell(amount: number, currentGrid: number, conversion: number): Promise<void> {
    let order = new Order(OrderType.SELL, amount);
    await orderBook.executeOrder(order, conversion);
    this.nextSell = currentGrid + 1;
    this.nextBuy = currentGrid - 2;
  }

  private async executeBuy(amount: number, currentGrid: number, conversion: number): Promise<void> {
    let order = new Order(OrderType.BUY, amount);
    await orderBook.executeOrder(order, conversion);
    this.nextSell = currentGrid + 2;
    this.nextBuy = currentGrid - 1;
  }

  private calculateGrid(conversion: number): number {
    let grid = Math.floor((conversion - this.min) / this.gridSize);
    if (grid < 0) {
      logger.warn('Price is below the first grid');
      return 0;
    }
    if (grid > this.gridCount) {
      logger.warn('Price is above the last grid');
      return this.gridCount;
    }
    return grid;
  }
}
