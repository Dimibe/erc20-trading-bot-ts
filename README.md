## Trading Bot

Crypto trading bot which trades erc20 token pairs. 

### Getting started

- Open the secrets.json in the src/config folder and fill in the needed information. 
- Run `yarn start` to run the bot.

### Prerequisites

- A wss url to a provider is needed. Either register online for one or host a local node. 
- A matic wallet is needed with matic for the fees and usdc for the trades. 

### Options

Configurations can be made in the file `src/config/options.json`. 

Following options are available: 
 |Name|Function|Default|
 |----|----|----|
 |MAX_TRADES|maximum number of trades the bot executes|5|
 |BUY_POWER|Buy power in $ per trade|1$|
 |DROP_BEFORE_BUY|Price drop required before buy||
 |SLIPPAGE|Change from price in % to buy token|0.5%|
 |GWEI|change from price in % to buy token|30|
 |GAS_LIMIT|change from price in % to buy token|200000|
 |COIN_NAME|Name of the network coin|Matic|
 |STABLE_TOKEN|Address of the stable token|USDC address|
 |STABLE_TOKEN_NAME|Name of the stable token|USDC|
 |STABLE_TOKEN_DIGITS|Digits of the stable token|6|
 |TRADE_TOKEN|Address of the traded token|Wrapped Matic address|
 |TRADE_TOKEN_NAME|Name of the traded token|wmatic|
 |TRADE_TOKEN_DIGITS|Digits of the traded token|18|
 |PAIR_ADDRESS|Address of the stable/traded token pair|usdc/wmatic pair address|
 |ROUTER_ADDRESS|Address of the router/DEX|Quickswap address|


### Strategy of the bot

- The bot observes the quickswap swaps of the usdc/wmatic pair.
- If wmatic price goes down, the bot buys wmatic for a defined buying power. 
- The bot caluculates a wmatic price which will lead to a (minimal) gain.
- If the calculated sell price is reached, the bot swaps back the wmatic for usdc. 
- Then the steps are repeated. 

