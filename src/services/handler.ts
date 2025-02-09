import { Connection, PublicKey } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import {
  calculateTokenUSD,
  formatTransactionDataForPools,
  formatTransactionResult,
  sendMessage,
  withRetry,
} from '../utils';
import { pushToWSocket } from '../websockets';
import axios from 'axios';

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

const allowedTokens = new Set(['WSOL', 'USDT', 'jailstool']);

export async function handleData(data: Record<string, any>) {
  if (lastScreen.getTime() < new Date().getTime() - 30 * 60 * 1000) {
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

    if (isAllowedToken && currentTime - lastProcessedTime >= 100000) {
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
    const buyMint = new PublicKey(transaction.buy_mint_address);
    const sellMint = new PublicKey(transaction.sell_mint_address);

    const pools = await getRaydiumLiquidityPoolAddress(
      transaction.buy_mint_address,
      transaction.sell_mint_address,
      transaction.market_address,
    );

    if (!pools || pools.length === 0) {
      transactionStatus.failure++;
      return;
    }

    const dataForPools: Record<string, any[]> = {};
    let hasSuccess = false;

    for (let poolAddress of pools) {
      poolAddress = new PublicKey(poolAddress);

      await delay(10000);

      const poolAccounts = await withRetry(() =>
        connection.getParsedTokenAccountsByOwner(poolAddress, {
          programId: TOKEN_PROGRAM_ID,
        }),
      );

      if (!poolAccounts.value.length) {
        continue;
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
        continue;
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
        address: poolAddress.toBase58(),
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

      if (!dataForPools[poolAddress.toBase58()]) {
        dataForPools[poolAddress.toBase58()] = [];
      }
      dataForPools[poolAddress.toBase58()].push(data);
      hasSuccess = true;
    }

    if (hasSuccess) {
      transactionStatus.success++;
    } else {
      transactionStatus.failure++;
    }

    const message = formatTransactionDataForPools(
      dataForPools,
      `${transaction.buy_symbol}/${transaction.sell_symbol}`,
    );
    if (!message) {
      transactionStatus.failure++;
    }
    sendMessage(message);
    pushToWSocket(dataForPools);
  } catch (e) {
    console.error('Error handling transaction:', e);
    transactionStatus.failure++;
  }
}

async function getRaydiumLiquidityPoolAddress(
  tokenA: string,
  tokenB: string,
  marketAddress: string,
) {
  try {
    const response = await axios.get(
      `https://api-v3.raydium.io/pools/info/mint?mint1=${tokenA}&mint2=${tokenB}&poolType=all&poolSortField=default&sortType=desc&pageSize=3&page=1`,
    );

    const poolsData = response.data.data.data;
    const pools = poolsData.map((pool: { id: string }) => pool.id);

    if (!pools.includes(marketAddress)) {
      pools.push(marketAddress);
    }

    return pools;
  } catch (error) {
    console.error('Error fetching liquidity pool address:', error);
    return [];
  }
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
