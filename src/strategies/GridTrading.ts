import { utils } from 'ethers';
import { logger } from '../logger';
import options from '../config/options.json';
import * as web3 from '../Web3Service';
import { Strategy } from './Strategy';

export class GridTrading implements Strategy {
  min: number = options.strategies.gridTrading.range.min;
  max: number = options.strategies.gridTrading.range.max;
  gridMargin: number = options.strategies.gridTrading.gridMargin;
  totalBuyPower: number = options.strategies.gridTrading.totalBuyPower;
  buyPowerPerGrid!: number;
  gridCount!: number;
  gridSize!: number;
  lastGrid!: number;

  async init(conversion: number): Promise<void> {
    let range = this.max - this.min;
    let middle = range / 2 + this.min;
    this.gridSize = middle * (this.gridMargin / 100);
    this.gridCount = Math.ceil(range / this.gridSize);
    this.gridSize = range / this.gridCount;
    this.buyPowerPerGrid = this.totalBuyPower / this.gridCount;

    logger.info(
      `Grid init with ${this.gridCount} grids of size ${this.gridSize}`,
    );

    let stableValue = (conversion - this.min) / range;
    let amountIn = (1 - stableValue) * this.totalBuyPower;
    logger.info(`Buying ${options.tradeTokenName} for ${amountIn.toFixed(6)}$`);
    await web3.buy(Number(amountIn.toFixed(6)));

    this.lastGrid = this.calculateGrid(conversion);
  }

  async priceUpdate(conversion: number): Promise<void> {
    let currentGrid = this.calculateGrid(conversion);
    logger.info(
      `Grid ${currentGrid}: ${this.min + this.gridSize * currentGrid} - ${
        this.min + this.gridSize * (currentGrid + 1)
      }`,
    );

    let change = currentGrid - this.lastGrid;

    if (change > 0) {
      let amount = this.buyPowerPerGrid / conversion;
      let amountIn = utils.parseUnits(`${amount}`, options.tradeTokenDigits);
      await web3.sell(amountIn);
    } else if (change < 0) {
      let buyPower = -change * this.buyPowerPerGrid;
      await web3.buy(Number(buyPower.toFixed(6)));
    }

    this.lastGrid = currentGrid;
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
