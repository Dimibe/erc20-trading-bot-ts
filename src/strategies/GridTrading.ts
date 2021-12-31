import { logger } from '../logger';
import options from '../config/options.json';
import * as web3 from '../Web3Service';
import { Strategy } from './Strategy';

export class GridTrading implements Strategy {
  rebalance: boolean;
  min: number;
  max: number;
  gridMargin: number;
  totalBuyPower: number;
  buyPowerPerGrid: number;
  gridCount: number;
  gridSize: number;
  nextSell!: number;
  nextBuy!: number;

  constructor(strategyOptions: any) {
    this.rebalance = strategyOptions.rebalance;
    this.min = strategyOptions.range.min;
    this.max = strategyOptions.range.max;
    this.gridMargin = strategyOptions.gridMargin;
    this.totalBuyPower = strategyOptions.totalBuyPower;
    let range = this.max - this.min;
    let middle = range / 2 + this.min;
    this.gridSize = middle * (this.gridMargin / 100);
    this.gridCount = Math.ceil(range / this.gridSize);
    this.gridSize = range / this.gridCount;
    this.buyPowerPerGrid = this.totalBuyPower / this.gridCount;
  }

  async init(conversion: number): Promise<void> {
    logger.info(`Init with ${this.gridCount} grids of size ${this.gridSize}`);

    let currentGrid = this.calculateGrid(conversion);
    let buyPower = (this.gridCount - currentGrid) * this.buyPowerPerGrid;

    if (this.rebalance) {
      let currentValue = (await web3.getTradeTokenBalance()) * conversion;
      buyPower = Math.max(buyPower - currentValue, 0);
    }
    if (buyPower > 0) {
      await web3.buy(buyPower, conversion);
    }
    this.nextSell = currentGrid + 2;
    this.nextBuy = currentGrid - 1;
  }

  async priceUpdate(conversion: number): Promise<void> {
    let currentGrid = this.calculateGrid(conversion);
    let sellPrice = this.min + this.gridSize * this.nextSell;
    let buyPrice = this.min + this.gridSize * this.nextBuy;
    logger.info(
      `Grid ${currentGrid} : Buy: ${this.nextBuy} (${buyPrice}$) Sell: ${this.nextSell} (${sellPrice}$)`,
    );

    if (currentGrid >= this.nextSell) {
      await this.executeSell(currentGrid, conversion);
    } else if (currentGrid <= this.nextBuy) {
      await this.executeBuy(currentGrid, conversion);
    }
  }

  async executeSell(currentGrid: number, conversion: number): Promise<void> {
    let amount =
      (currentGrid - this.nextSell + 1) * (this.buyPowerPerGrid / conversion);
    await web3.sell(amount, undefined, conversion);
    this.nextSell = currentGrid + 1;
    this.nextBuy = currentGrid - 2;
  }

  async executeBuy(currentGrid: number, conversion: number): Promise<void> {
    let buyPower = (this.nextBuy - currentGrid + 1) * this.buyPowerPerGrid;
    await web3.buy(buyPower, conversion);
    this.nextSell = currentGrid + 2;
    this.nextBuy = currentGrid - 1;
  }

  calculateGrid(conversion: number): number {
    let grid = Math.floor((conversion - this.min) / this.gridSize);
    if (grid < 0) {
      return 0;
    }
    if (grid > this.gridCount) {
      return this.gridCount;
    }
    return grid;
  }
}
