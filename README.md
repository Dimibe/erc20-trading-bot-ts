## Trading Bot

Crypto trading bot which currently trades usdc/wmatic. 

### Getting started

- Open the secrets.json in the src folder and fill in the needed information. 
- Run `yarn start` to run the bot.

### Prequisits

- A wss url to a provider is needed. Either register online for one or host your local polygon node. 
- A matic wallet is needed with matic for the fees and usdc for the trades. 


### Strategy of the bot

- The bot observes the quickswap swaps of the usdc/wmatic pair.
- If wmatic price goes down, the bot buys wmatic for a defined buying power. 
- The bot caluculates a wmatic price which will lead to a (minimal) gain.
- If the calculated sell price is reached, the bot swaps back the wmatic for usdc. 
- Then the steps are repeated. 

