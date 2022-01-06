## Trading Bot

Crypto trading bot which trades erc20 token pairs. 

### Prerequisites

- A websocket (wss) url to a provider is needed. Either register online for one or host a local node. 
- A polygon wallet is needed with matic for the fees and the configured stable token (usdc as default). 

### Getting started

- Open the secrets.json in the src/config folder and fill in the provider url and your private key. 
- Run `yarn start` to run the bot.

### Options

Configurations can be made in the file `src/config/options.json`. 

Following options are available: 
 |Name|Function|Default|
 |----|----|----|
 |strategy|The strategy which the bot should use|Grid Trading|
 |simulationMode|If true no swapps will be actually made|true|
 |slippage|Change from price in % to buy token|0.1%|
 |maxGwei|The max gwei used for a transaction|80 gwei|
 |gasLimit|Gas limit|250000|
 |coinName|Name of the network coin|Matic|
 |coinDigits|Digits of the network coin|18|
 |stableToken|Address of the stable token|USD Coin address|
 |tradeToken|Address of the traded token|Wrapped Matic address|
 |pairAddress|Address of the stable/traded token pair|USDC/WMATIC pair address|
 |routerAddress|Address of the router/DEX|Quickswap address|
 |refreshTime|Time in milliseconds the price is refreshed|1000|
 |logLevel|Can be either 'info' or 'debug'|debug|
 |strategies|Options for the different strategies|-|

### Strategies

#### Grid Trading

##### Options
 |Name|Function|Default|
 |----|----|----|
 |range|min and max price in which the bot trades|2.05 - 2.65|
 |totalBuyPower|Total amount to invest|1000$|
 |gridMargin|Size of grids in percent|0.5%|
 |rebalance|_Currently not implemented_|true|

##### How it works

- The bot calculates number of grids in the range.
- The bot calculates the initial grid and buys initial tokens.
- Whenever the price falls one grid the bot buys and when the price goes up one grid the bot sells. 
- Note: The total buy power is divided by the number of grids. 
 - So if the gridMargin is to small the trade amount will be very small. 
 - If the grid margin is in contrast to big, the bot can't gain profit from small fluctuations.

#### Scalping

##### Options
 |Name|Function|Default|
 |----|----|----|
 |maxTrades|maximum number of trades the bot executes|50 trades|
 |buyPower|Buy power in $ per trade|10$|
 |dropBeforeBuy|Price drop required before buy|0.1%|

##### How it works

- The bot observes the quickswap swaps of the usdc/wmatic pair.
- If wmatic price goes down, the bot buys wmatic for a defined buying power. 
- The bot caluculates a wmatic price which will lead to a (minimal) gain.
- If the calculated sell price is reached, the bot swaps back the wmatic for usdc. 
- Then the steps are repeated. 


### Implement your own strategy

Crteating a strategy is very simple. Just follow these steps: 

- Create a class for your strategy 
- Add options for your strategy if needed
- Add your strategy to the bot so it can be used

#### Create a strategy class

- First go in the `src/strategies` folder an create a class for your strategy. 
- Implement the `Strategy` interface. It will provide 3 functions.
- The `init(conversion: number)` function is called once at startup.
- The `priceUpdate(conversion: number, priceChange: number)` function is called whenever the price of your trade pair changes. 
- The `orderLiquidated(order: Order)` function is called when one order is executed. 

#### Make a trade

If you want to make a trade in your strategy you first need to create a `Order`. 
A order can be created like this: 
```ts
let order = new Order(OrderType.BUY, buyPower, limit);
```

After that you can either execute the order directly with

```ts
orderBook.executeOrder(order);
```

or add it to the order book in case you've added an limit to your order.

```ts
orderBook.addOrder(buyOrder);
```

In case the order is added to the order book, after the order is executed the `orderLiquidated(order)` function in your strategy is called.

In both cases the order will be edited after execution and the `amountOut` and `transactionHash` fields will be filled. 

A complete example: 

```ts
let sellOrder = new Order(OrderType.SELL, tradeTokenBalance);
orderBook.executeOrder(sellOrder).then((order: Order) => {
    console.log(`Order executed, got ${order.amountOut} out`);
});
```

#### Add the class to the bot
All you need to do is to extend the `getStrategy()` function and add your strategy. 
```ts
function getStrategy(): Strategy {
  switch (options.strategy) {
    case 'gridTrading':
      return new GridTrading(options.strategies.gridTrading);
  }
}
```

The final step is to add strategy options to the options.json file and change the `stategy` option to your strategies name. 

