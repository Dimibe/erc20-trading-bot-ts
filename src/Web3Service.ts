import {
  GAS_LIMIT,
  MAX_GWEI,
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
import { TransactionReceipt, TransactionResponse } from '@ethersproject/abstract-provider';
import { BigNumber, Contract, utils } from 'ethers';
import { logger } from './logger';
import axios from 'axios';
import { Order } from './Order';

class Web3Service {
  static tradeTokenDecimals: number;
  static tradeTokenSymbol: string;
  static stableTokenDecimals: number;
  static stableTokenSymbol: string;

  static async init() {
    this.tradeTokenDecimals = await this.getTradeTokenDecimals();
    this.tradeTokenSymbol = await this.getTradeTokenSymbol();
    this.stableTokenDecimals = await this.getStableTokenDecimals();
    this.stableTokenSymbol = await this.getStableTokenSymbol();
  }

  private static async executeSwap(
    amountIn: BigNumber,
    amountOutMin: BigNumber,
    pair: string[],
    tokenContract: Contract,
  ): Promise<TransactionReceipt> {
    let currentGas = await this.getGasPrice();
    let gas = Math.min(MAX_GWEI, currentGas);
    const options = {
      gasPrice: utils.parseUnits(`${gas}`, 'gwei'),
      gasLimit: GAS_LIMIT,
    };

    logger.transaction('Swapping...');

    const approveTx: TransactionResponse = await tokenContract.approve(router, amountIn, options);
    logger.transaction(`Approve transaction hash: ${approveTx.hash}`);
    await approveTx.wait();
    logger.transaction(`Swap approved.`);

    const swapTx: TransactionResponse = await routerContract.swapExactTokensForTokens(
      amountIn,
      amountOutMin,
      pair,
      wallet.address,
      Date.now() + 1000 * 60 * 10,
      options,
    );
    logger.transaction(`Swap transaction hash: ${swapTx.hash}`);
    let tx = await swapTx.wait();
    logger.transaction('Swap done!');

    await this.info('transaction');
    return tx;
  }

  static async swap(order: Order): Promise<TransactionReceipt> {
    const decimals = this.getDecimals(order.tokenIn);
    const contract = this.getContract(order.tokenIn);

    const amountIn: BigNumber = utils.parseUnits(order.amountIn.toFixed(decimals), decimals);
    const amounts: BigNumber[] = await routerContract.getAmountsOut(amountIn, [order.tokenIn, order.tokenOut]);
    const amountOutMin = amounts[1].sub(amounts[1].div(100 / SLIPPAGE));

    logger.transaction(
      `Swapping  %s %s for %s...`,
      utils.formatUnits(amountIn, decimals),
      this.getSymbol(order.tokenIn),
      this.getSymbol(order.tokenOut),
    );

    let txn = await this.executeSwap(amountIn, amountOutMin, [order.tokenIn, order.tokenOut], contract);

    return txn;
  }

  static getDecimals(token: string): number {
    return token == STABLE_TOKEN ? this.stableTokenDecimals : this.tradeTokenDecimals;
  }

  static getSymbol(token: string): string {
    return token == STABLE_TOKEN ? this.stableTokenSymbol : this.tradeTokenSymbol;
  }

  static getContract(token: string): Contract {
    return token == STABLE_TOKEN ? stableTokenContract : tradeTokenContract;
  }

  static async getCurrentPrice(): Promise<number> {
    const pairData = await pairContract.getReserves();
    const stableTokenReserve = utils.formatUnits(pairData[1], this.stableTokenDecimals);
    const tradeTokenReserve = utils.formatUnits(pairData[0], this.tradeTokenDecimals);
    const conversion = Number(stableTokenReserve) / Number(tradeTokenReserve);
    return Number(conversion.toFixed(this.stableTokenDecimals));
  }

  static async getCoinBalance(): Promise<number> {
    let balance = await provider.getBalance(wallet.address);
    return Number(utils.formatUnits(balance, options.coinDigits));
  }

  static async getGasPrice(): Promise<number> {
    let gasPrice = await provider.getGasPrice();
    return Number(utils.formatUnits(gasPrice, 'gwei'));
  }

  static getTokenBalance(token: string): Promise<number> {
    if (token === STABLE_TOKEN) {
      return Web3Service.getStableTokenBalance();
    } else {
      return Web3Service.getTradeTokenBalance();
    }
  }

  static async getStableTokenBalance(): Promise<number> {
    let balance = await stableTokenContract.balanceOf(wallet.address);
    return Number(utils.formatUnits(balance, this.stableTokenDecimals));
  }

  static async getTradeTokenBalance(): Promise<number> {
    let balance = await tradeTokenContract.balanceOf(wallet.address);
    return Number(utils.formatUnits(balance, this.tradeTokenDecimals));
  }

  static async getTradeTokenDecimals(): Promise<number> {
    let decimals = await tradeTokenContract.decimals();
    return decimals;
  }

  static async getTradeTokenSymbol(): Promise<string> {
    let symbol = await tradeTokenContract.symbol();
    return symbol;
  }

  static async getStableTokenDecimals(): Promise<number> {
    let decimals = await stableTokenContract.decimals();
    return decimals;
  }

  static async getStableTokenSymbol(): Promise<string> {
    let symbol = await stableTokenContract.symbol();
    return symbol;
  }

  static async getEstimatedGwei() {
    let res = await axios.get('https://gpoly.blockscan.com/gasapi.ashx?apikey=key&method=gasoracle');
    return res.data.result.ProposeGasPrice;
  }

  static getStableTokenAmountFromSwap(transaction: TransactionReceipt): number | undefined {
    return this.getTokenAmountFromSwap(transaction, STABLE_TOKEN, this.stableTokenDecimals);
  }
  static getTradeTokenAmountFromSwap(transaction: TransactionReceipt): number | undefined {
    return this.getTokenAmountFromSwap(transaction, TRADE_TOKEN, this.tradeTokenDecimals);
  }

  static getTokenAmountFromSwap(transaction: TransactionReceipt, token: string, decimals: number): number | undefined {
    let stableValue = transaction?.logs?.find((log) => log.address === token);
    if (stableValue !== undefined) {
      let bn = BigNumber.from(stableValue!.data);
      return Number(utils.formatUnits(bn, decimals));
    }
    return undefined;
  }

  static async info(logLevel: string = 'info'): Promise<void> {
    const coinBalance = await this.getCoinBalance();
    const stableTokenBalance = await this.getStableTokenBalance();
    const tradeTokenBalance = await this.getTradeTokenBalance();

    logger.log(logLevel, `Balance Information:`);
    logger.log(logLevel, `${coinBalance} ${options.coinName}`);
    logger.log(logLevel, `${stableTokenBalance} ${this.stableTokenSymbol}`);
    logger.log(logLevel, `${tradeTokenBalance} ${this.tradeTokenSymbol}`);
  }
}

export const web3 = Web3Service;
