## Trading Bot

Crypto trading bot which trades erc20 token pairs. 

### Getting started

- Open the secrets.json in the src/config folder and fill in the provider url and your private key. 
- Run `yarn start` to run the bot.

### Prerequisites

- A websocket (wss) url to a provider is needed. Either register online for one or host a local node. 
- A polygon wallet is needed with matic for the fees and the configured stable token (usdc as default). 

### Options

Configurations can be made in the file `src/config/options.json`. 

Following options are available: 
 |Name|Function|Default|
 |----|----|----|
 |strategy|The strategy which the bot should use|Grid Trading|
 |simulationMode|If true no swapps will be actually made|false|
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
 |strategies|Options for the different strategies|-|

### Strategies

#### Grid Trading

##### Options
 |Name|Function|Default|
 |----|----|----|
 |range|min and max price in which the bot trades|2.35 - 2.65|
 |totalBuyPower|Total amount to invest|10|
 |gridMargin|Size of grids in percent|0.5%|
 |rebalance|If true the initial tradeToken balance will be taken into account. Otherwise the total buy power needs to be in stable token|true|

##### How it works

- The bot calculates number of grids in the range.
- The bot calculates the initial grid and buys initial tokens.
- Whenever the price falls one grid the bot buys and when the price goes up one grid the bot sells. 


#### Scalping

##### Options
 |Name|Function|Default|
 |----|----|----|
 |maxTrades|maximum number of trades the bot executes|5 trades|
 |buyPower|Buy power in $ per trade|1$|
 |dropBeforeBuy|Price drop required before buy|0.1%|

##### How it works

- The bot observes the quickswap swaps of the usdc/wmatic pair.
- If wmatic price goes down, the bot buys wmatic for a defined buying power. 
- The bot caluculates a wmatic price which will lead to a (minimal) gain.
- If the calculated sell price is reached, the bot swaps back the wmatic for usdc. 
- Then the steps are repeated. 

