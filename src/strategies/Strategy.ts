import { Order } from "../Order";

export interface Strategy {
  get name(): string;
  init(conversion: number): Promise<void>;
  priceUpdate(conversion: number, priceChange: number): Promise<void>;
  orderLiquidated(order:Order): Promise<void>;
}
