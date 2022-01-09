import { STABLE_TOKEN, TRADE_TOKEN } from './const';
import LogFactory from './logger';
import { web3 } from './Web3Service';

const logger = LogFactory.createLogger('OrderBook');

export class Order {
  private static nrCount = 0;
  private _nr: number;
  private _description: string;
  private _orderType: OrderType;
  private _tokenIn: string;
  private _amountIn: number;
  private _tokenOut: string;
  private _amountOut?: number;
  private _transactionHash?: string;
  private _referenceOrder?: Order;
  private _limit?: number;

  constructor(orderType: OrderType, amountIn: number, limit?: number, referenceOrder?: Order) {
    this._nr = Order.nrCount++;
    this._orderType = orderType;
    if (orderType === OrderType.BUY) {
      this._tokenIn = STABLE_TOKEN;
      this._tokenOut = TRADE_TOKEN;
    } else {
      this._tokenIn = TRADE_TOKEN;
      this._tokenOut = STABLE_TOKEN;
    }
    this._amountIn = amountIn;
    this._limit = limit;
    this._referenceOrder = referenceOrder;
    this._description = this.buildDescription();
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
    return this._description;
  }

  public get nr() {
    return this._nr;
  }

  public get orderType() {
    return this._orderType;
  }

  public get amountIn() {
    return this._amountIn;
  }

  public get amountOut() {
    return this._amountOut;
  }

  public get limit() {
    return this._limit;
  }

  public get description() {
    return this._description;
  }

  public get transactionHash() {
    return this._transactionHash;
  }

  public get referenceOrder() {
    return this._referenceOrder;
  }

  public get tokenIn() {
    return this._tokenIn;
  }

  public get tokenOut() {
    return this._tokenOut;
  }

  public set amountOut(amountOut) {
    this._amountOut = amountOut;
  }

  public set transactionHash(hash) {
    this._transactionHash = hash;
  }
}

export enum OrderType {
  BUY,
  SELL,
}
