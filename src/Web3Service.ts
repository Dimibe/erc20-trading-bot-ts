import {
  GAS_LIMIT,
  GWEI,
  pairContract,
  provider,
  router,
  routerContract,
  SLIPPAGE,
  stableTokenContract,
  STABLE_TOKEN,
  tradeTokenContract,
  TRADE_TOKEN,
  wallet,
} from './const';
import options from './config/options.json';
import { TransactionResponse } from '@ethersproject/abstract-provider';
import { BigNumber, Contract, utils } from 'ethers';
import { logger, orderBook } from './logger';

export async function swap(
  amountIn: BigNumber,
  amountOutMin: BigNumber,
  pair: string[],
  tokenContract: Contract,
): Promise<string> {
  const options = {
    gasPrice: utils.parseUnits(`${GWEI}`, 'gwei'),
    gasLimit: GAS_LIMIT,
  };

  logger.transaction('Swapping...');

  const approveTx: TransactionResponse = await tokenContract.approve(
    router,
    amountIn,
  );
  logger.transaction(`Approve transaction hash: ${approveTx.hash}`);
  await approveTx.wait();
  logger.transaction(`Swap approved.`);

  const swapTx: TransactionResponse =
    await routerContract.swapExactTokensForTokens(
      amountIn,
      amountOutMin,
      pair,
      wallet.address,
      Date.now() + 1000 * 60 * 10,
      options,
    );
  logger.transaction(`Swap transaction hash: ${swapTx.hash}`);
  await swapTx.wait();
  logger.transaction('Swap done!');

  await info('transaction');
  return swapTx.hash;
}

export async function buy(buyPower: number, conversion?: number): Promise<string> {
  const amountIn: BigNumber = utils.parseUnits(
    buyPower.toFixed(options.stalbeTokenDigits),
    options.stalbeTokenDigits,
  );
  const amounts: BigNumber[] = await routerContract.getAmountsOut(amountIn, [
    STABLE_TOKEN,
    TRADE_TOKEN,
  ]);
  const amountOutMin = amounts[1].sub(amounts[1].div(100 / SLIPPAGE));

  logger.transaction(
    `Buying ${options.tradeTokenName} for ${utils.formatUnits(
      amountIn,
      options.stalbeTokenDigits,
    )} ${options.stalbeTokenName} ...`,
  );

  let hash: string = await swap(
    amountIn,
    amountOutMin,
    [STABLE_TOKEN, TRADE_TOKEN],
    stableTokenContract,
  );

  orderBook.order(
    `Swapped ${buyPower} ${options.stalbeTokenName} for ${utils.formatUnits(
      amounts[1],
      options.tradeTokenDigits,
    )} ${options.tradeTokenName} @${conversion}. Hash: ${hash}`,
  );
  return hash;
}

export async function sell(
  amount: number,
  amounts?: BigNumber[],
  conversion?: number,
): Promise<string> {
  let amountIn = utils.parseUnits(
    amount.toFixed(options.tradeTokenDigits),
    options.tradeTokenDigits,
  );
  logger.transaction(
    `Selling ${amount} ${options.tradeTokenName} for ${options.stalbeTokenName}...`,
  );

  if (amounts === undefined) {
    amounts = await routerContract.getAmountsOut(amountIn, [
      TRADE_TOKEN,
      STABLE_TOKEN,
    ]);
  }
  const amountOutMin = amounts![1].sub(amounts![1].div(100 / SLIPPAGE));

  let hash: string = await swap(
    amountIn,
    amountOutMin,
    [TRADE_TOKEN, STABLE_TOKEN],
    tradeTokenContract,
  );

  orderBook.order(
    `Swapped ${amount} ${options.tradeTokenName} for ${utils.formatUnits(
      amounts![1],
      options.stalbeTokenDigits,
    )} ${options.stalbeTokenName} @${conversion}. Hash: ${hash}`,
  );
  return hash;
}

export async function getCurrentPrice(): Promise<number> {
  const pairData = await pairContract.getReserves();
  const stableTokenReserve = utils.formatUnits(
    pairData[1],
    options.stalbeTokenDigits,
  );
  const tradeTokenReserve = utils.formatUnits(
    pairData[0],
    options.tradeTokenDigits,
  );
  const conversion = Number(stableTokenReserve) / Number(tradeTokenReserve);
  return Number(conversion.toFixed(options.stalbeTokenDigits));
}

export async function getCoinBalance(): Promise<number> {
  let balance = await provider.getBalance(wallet.address);
  return Number(utils.formatUnits(balance, options.coinDigits));
}

export async function getStableTokenBalance(): Promise<number> {
  let balance = await stableTokenContract.balanceOf(wallet.address);
  return Number(utils.formatUnits(balance, options.stalbeTokenDigits));
}

export async function getTradeTokenBalance(): Promise<number> {
  let balance = await tradeTokenContract.balanceOf(wallet.address);
  return Number(utils.formatUnits(balance, options.tradeTokenDigits));
}

export async function info(logLevel: string = 'info'): Promise<void> {
  const coinBalance = await getCoinBalance();
  const stableTokenBalance = await getStableTokenBalance();
  const tradeTokenBalance = await getTradeTokenBalance();

  logger.log(logLevel, `Balance Information:`);
  logger.log(logLevel, `${coinBalance} ${options.coinName}`);
  logger.log(logLevel, `${stableTokenBalance} ${options.stalbeTokenName}`);
  logger.log(logLevel, `${tradeTokenBalance} ${options.tradeTokenName}`);
}
