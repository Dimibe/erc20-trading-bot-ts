import { Order } from "../Order";

export interface Strategy {
  init(conversion: number): Promise<void>;
  priceUpdate(conversion: number, priceChange: number): Promise<void>;
  orderLiquidated(order:Order): Promise<void>;
}
