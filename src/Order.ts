import { STABLE_TOKEN, TRADE_TOKEN } from './const';
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
  }

  public toString(): string {
    return `Order ${this.nr}: In: ${this.amountIn}, Limit: ${this.limit?.toFixed(web3.stableTokenDecimals)}, Ref Order: ${
      this.referenceOrder?.nr
    }`;
  }
}

export enum OrderType {
  BUY,
  SELL,
}
