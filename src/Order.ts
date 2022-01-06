import { STABLE_TOKEN, TRADE_TOKEN } from './const';
import { logger } from './logger';
import { web3 } from './Web3Service';

export class Order {
  static nrCount = 0;
  nr: number;
  orderType: OrderType;
  tokenIn: string;
  amountIn: number;
  tokenOut: string;
  amountOut?: number;
  transactionHash?: string;
  referenceOrder?: Order;
  limit?: number;
  description: string;

  constructor(orderType: OrderType, amountIn: number, limit?: number, referenceOrder?: Order) {
    this.nr = Order.nrCount++;
    this.orderType = orderType;
    if (orderType === OrderType.BUY) {
      this.tokenIn = STABLE_TOKEN;
      this.tokenOut = TRADE_TOKEN;
    } else {
      this.tokenIn = TRADE_TOKEN;
      this.tokenOut = STABLE_TOKEN;
    }
    this.amountIn = amountIn;
    this.limit = limit;
    this.referenceOrder = referenceOrder;
    this.description = this.buildDescription();
    logger.info(`Created order ${this}`);
  }

  private buildDescription(): string {
    let limit = this.limit?.toFixed(web3.stableTokenDecimals);
    let ref = this.referenceOrder !== undefined ? `Ref Order: ${this.referenceOrder.nr}` : '';
    let aIn = `${this.amountIn.toFixed(web3.getDecimals(this.tokenIn))} ${web3.getSymbol(this.tokenIn)}`;
    let action = this.orderType === OrderType.SELL ? `Sell ${aIn}` : `Buy ${web3.getSymbol(this.tokenOut)} for ${aIn}`;
    let type = this.limit === undefined ? `market` : `limit: ${limit} ${web3.stableTokenSymbol}`;
    return `Nr ${this.nr}: ${action} @${type}. ${ref}`;
  }

  public toString(): string {
    return this.description;
  }
}

export enum OrderType {
  BUY,
  SELL,
}
