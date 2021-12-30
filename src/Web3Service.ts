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
import { logger } from './logger';

export async function swap(
  amountIn: BigNumber,
  amountOutMin: BigNumber,
  pair: string[],
  tokenContract: Contract,
): Promise<any> {
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
}

export async function buy(buyPower: number) {
  const amountIn: BigNumber = utils.parseUnits(
    `${buyPower}`,
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

  await swap(
    amountIn,
    amountOutMin,
    [STABLE_TOKEN, TRADE_TOKEN],
    stableTokenContract,
  );
}

export async function sell(amountIn: BigNumber, amountOutMin?: BigNumber) {
  logger.transaction(
    `Selling ${utils.formatUnits(amountIn, options.tradeTokenDigits)} ${
      options.tradeTokenName
    } for ${options.stalbeTokenName}...`,
  );

  if (amountOutMin === undefined) {
    const amounts: BigNumber[] = await routerContract.getAmountsOut(amountIn, [
      TRADE_TOKEN,
      STABLE_TOKEN,
    ]);
    amountOutMin = amounts[1].sub(amounts[1].div(100 / SLIPPAGE));
  }

  await swap(
    amountIn,
    amountOutMin,
    [TRADE_TOKEN, STABLE_TOKEN],
    tradeTokenContract,
  );
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
  return conversion;
}

export async function info(logLevel: string = 'info') {
  const coinBalance = await provider.getBalance(wallet.address);
  const stableTokenBalance = await stableTokenContract.balanceOf(
    wallet.address,
  );
  const tradeTokenBalance = await tradeTokenContract.balanceOf(wallet.address);

  logger.log(logLevel, `Balance Information:`);
  logger.log(
    logLevel,
    `${utils.formatUnits(coinBalance, options.coinDigits)} ${options.coinName}`,
  );
  logger.log(
    logLevel,
    `${utils.formatUnits(stableTokenBalance, options.stalbeTokenDigits)} ${
      options.stalbeTokenName
    }`,
  );
  logger.log(
    logLevel,
    `${utils.formatUnits(tradeTokenBalance, options.tradeTokenDigits)} ${
      options.tradeTokenName
    }`,
  );
}
