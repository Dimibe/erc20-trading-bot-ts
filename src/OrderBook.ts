import { Order, OrderType } from './Order';
import { web3 } from './Web3Service';
import { orderBook as orderLogger, logger } from './logger';
import { TransactionReceipt } from '@ethersproject/abstract-provider';
import { simulationMode, STABLE_TOKEN, TRADE_TOKEN } from './const';

class OrderBook {
  openOrders: Order[] = [];

  addOrder(order: Order) {
    this.openOrders.push(order);
  }

  public async executeOrder(order: Order, conversion: number): Promise<Order> {
    if (!simulationMode && this.checkTokenBalance(order)) {
      let txn = await web3.swap(order);
      order.amountOut = OrderBook.getAmountOut(order, txn);
      order.transactionHash = txn.transactionHash;
    } else {
      order.amountOut = order.tokenOut == TRADE_TOKEN ? order.amountIn / conversion : order.amountIn * conversion;
    }
    OrderBook.printSwap(order);
    return order;
  }

  public async liquidateOrders(conversion: number): Promise<Order[]> {
    let orders: Order[] = [];
    for (let order of this.getLiquidatedOrders(conversion)) {
      await this.executeOrder(order, conversion);
      OrderBook.removeOrderFromList(order, this.openOrders);
      orders.push(order);
    }
    return orders;
  }

  private async checkTokenBalance(order: Order) {
    if ((await web3.getTokenBalance(order.tokenIn)) < order.amountIn) {
      logger.warn(`Insufficient token amount for execution of order ${order.nr}`);
      return false;
    }
    return true;
  }

  private getLiquidatedOrders(conversion: number) {
    let buyOrders = this.getOpenBuyOrders(conversion);
    let sellOrders = this.getOpenSellOrders(conversion);

    return buyOrders.concat(sellOrders);
  }

  private getOpenBuyOrders(conversion: number): Order[] {
    return this.openOrders
      .filter((o) => o.orderType === OrderType.BUY)
      .filter((o) => o.limit === undefined || conversion <= o.limit);
  }

  private getOpenSellOrders(conversion: number): Order[] {
    return this.openOrders
      .filter((o) => o.orderType === OrderType.SELL)
      .filter((o) => o.limit === undefined || conversion >= o.limit);
  }

  private static removeOrderFromList(order: Order, list: Order[]) {
    let index = list.findIndex((o) => o.nr === order.nr);
    list.splice(index, 1);
  }

  private static getAmountOut(order: Order, txn: TransactionReceipt): number | undefined {
    if (order.tokenOut == STABLE_TOKEN) {
      return web3.getStableTokenAmountFromSwap(txn);
    } else {
      return web3.getTradeTokenAmountFromSwap(txn);
    }
  }

  private static printSwap(order: Order): void {
    let txnInfo = order.transactionHash === undefined ? '(Simulation)' : `Hash: ${order.transactionHash}`;
    orderLogger.order(
      'Nr. %d: Swapped %d %s for %d %s. %s',
      order.nr,
      order.amountIn,
      web3.getSymbol(order.tokenIn),
      order.amountOut,
      web3.getSymbol(order.tokenOut),
      txnInfo,
    );
  }
}

export const orderBook = new OrderBook();
