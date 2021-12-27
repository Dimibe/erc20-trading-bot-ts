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
 |Name|Function|
 |----|----|
 |MAX_TRADES|maximum number of trades the bot executes|
 |BUY_POWER|Buy power in $ per trade|
 |DROP_BEFORE_BUY|Price drop required before buy|
 |SLIPPAGE|change from price in % to buy token|


### Strategy of the bot

- The bot observes the quickswap swaps of the usdc/wmatic pair.
- If wmatic price goes down, the bot buys wmatic for a defined buying power. 
- The bot caluculates a wmatic price which will lead to a (minimal) gain.
- If the calculated sell price is reached, the bot swaps back the wmatic for usdc. 
- Then the steps are repeated. 

