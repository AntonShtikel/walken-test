import { Connection, PublicKey } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';

import {
  calculateTokenUSD,
  formatTransactionData,
  formatTransactionResult,
  sendMessage,
  withRetry,
} from '../utils';
import { pushToWSocket } from '../websockets';

const connection = new Connection(
  'https://api.mainnet-beta.solana.com',
  'confirmed',
);
const transactions: Record<string, any[]> = {};

export const transactionStatus = {
  total: 0,
  success: 0,
  failure: 0,
};
export const previousTransactionStatus = {
  total: 0,
  success: 0,
  failure: 0,
};
let lastScreen = new Date();
let lastProcessedTime = 0;

const allowedTokens = new Set(['WSOL', 'SOL', 'USDT', 'USDC', 'jailstool']);

export function handleData(data: Record<string, any>) {
  if (lastScreen.getTime() < new Date().getTime() - 60 * 60 * 1000) {
    console.log('Resetting the lastScreen...');
    console.log(transactionStatus);
    const message = formatTransactionResult(
      transactionStatus,
      previousTransactionStatus,
    );
    sendMessage(message);
    Object.assign(previousTransactionStatus, transactionStatus);
    Object.assign(transactionStatus, { success: 0, failure: 0, total: 0 });

    lastScreen = new Date();
  }

  try {
    const currentTime = Date.now();

    const isAllowedToken =
      allowedTokens.has(data.buy_symbol) && allowedTokens.has(data.sell_symbol);

    if (isAllowedToken && currentTime - lastProcessedTime >= 10000) {
      transactionStatus.total++;
      lastProcessedTime = currentTime;
      handleTransaction(data);
    }
  } catch (e) {
    transactionStatus.failure++;
    throw e;
  }
}

export async function handleTransaction(transaction: Record<string, any>) {
  try {
    const marketAddress = new PublicKey(transaction.market_address);
    const buyMint = new PublicKey(transaction.buy_mint_address);
    const sellMint = new PublicKey(transaction.sell_mint_address);

    const poolAccounts = await withRetry(() =>
      connection.getParsedTokenAccountsByOwner(marketAddress, {
        programId: TOKEN_PROGRAM_ID,
      }),
    );

    if (!poolAccounts.value.length) {
      transactionStatus.failure++;
      return;
    }

    const poolTokens = poolAccounts.value
      .map((acc) => ({
        mint: new PublicKey(acc.account.data.parsed.info.mint),
        amount: acc.account.data.parsed.info.tokenAmount.uiAmount || 0,
      }))
      .filter(
        (token) => token.mint.equals(buyMint) || token.mint.equals(sellMint),
      );

    if (poolTokens.length < 2) {
      transactionStatus.failure++;
      return;
    }

    const tokenA = poolTokens.find((token) => token.mint.equals(buyMint))!;
    const tokenB = poolTokens.find((token) => token.mint.equals(sellMint))!;

    const solPriceUSD = transaction.solana_price;

    const tokenAUSD = calculateTokenUSD(
      transaction.buy_symbol,
      tokenA.amount,
      transaction.price_usd,
      solPriceUSD,
    );
    const tokenBUSD = calculateTokenUSD(
      transaction.sell_symbol,
      tokenB.amount,
      transaction.price_usd,
      solPriceUSD,
    );

    const data: Record<string, any> = {
      pair: `${transaction.buy_symbol}/${transaction.sell_symbol}`,
      protocol: transaction.dex_protocol_name,
      address: transaction.market_address,
      tokenA: {
        mint: transaction.buy_mint_address,
        amount: tokenA.amount,
        usdValue: tokenAUSD,
      },
      tokenB: {
        mint: transaction.sell_mint_address,
        amount: tokenB.amount,
        usdValue: tokenBUSD,
      },
      blockTimestamp: new Date(transaction.block_timestamp * 1000),
    };

    if (!transactions[data.address]) {
      transactions[data.address] = [];
    }
    transactionStatus.success++;
    transactions[data.address].push(data);
    const message = formatTransactionData(data);
    sendMessage(message);
    pushToWSocket(data);
  } catch (e) {
    console.error('Error handling transaction:', e);
  }
}
