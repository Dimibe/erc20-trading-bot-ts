import { Order, OrderType } from './Order';
import { web3 } from './Web3Service';
import { orderBook } from './logger';
import { TransactionReceipt } from '@ethersproject/abstract-provider';
import { simulationMode, STABLE_TOKEN } from './const';

let openOrders: Order[] = [];

export function addOrder(order: Order) {
  openOrders.push(order);
}
export async function executeOrder(order: Order): Promise<Order> {
  if (!simulationMode) {
    let txn = await web3.swap(order);
    order.amountOut = getAmountOut(order, txn);
    order.transactionHash = txn.transactionHash;
  }
  printSwap(order);
  return order;
}

export async function liquidateOrders(conversion: number): Promise<Order[]> {
  let orders: Order[] = [];
  for (let order of getLiquidatedOrders(conversion)) {
    await executeOrder(order);
    openOrders = removeOrderFromList(order, openOrders);
    orders.push(order);
  }
  return orders;
}

export function printOrders() {
  console.log(`Orders:`);
  for (let order of openOrders.sort((o1, o2) => o1.limit! - o2.limit!)) {
    console.log(`${order}`);
  }
}

function getLiquidatedOrders(conversion: number) {
  let buyOrders = getOpenBuyOrders(conversion);
  let sellOrders = getOpenSellOrders(conversion);

  return buyOrders.concat(sellOrders);
}

function getOpenBuyOrders(conversion: number): Order[] {
  return openOrders
    .filter((o) => o.orderType === OrderType.BUY)
    .filter((o) => o.limit === undefined || conversion <= o.limit);
}

function getOpenSellOrders(conversion: number): Order[] {
  return openOrders
    .filter((o) => o.orderType === OrderType.SELL)
    .filter((o) => o.limit === undefined || conversion >= o.limit);
}

function removeOrderFromList(order: Order, list: Order[]): Order[] {
  let index = list.findIndex((o) => o === order);
  return list.splice(index, 1);
}

function getAmountOut(order: Order, txn: TransactionReceipt): number | undefined {
  if (order.tokenOut == STABLE_TOKEN) {
    return web3.getStableTokenAmountFromSwap(txn);
  } else {
    return web3.getTradeTokenAmountFromSwap(txn);
  }
}

function printSwap(order: Order): void {
  orderBook.order(
    `Swapped ${order.amountIn} ${web3.getSymbol(order.tokenIn)} for ${order.amountOut} ${web3.getSymbol(
      order.tokenOut,
    )}. Hash: ${order.transactionHash}`,
  );
}
