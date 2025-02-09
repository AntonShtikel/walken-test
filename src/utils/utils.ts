export async function withRetry<T>(
  fn: () => Promise<T>,
  retries = 5,
  delay = 1000,
): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      if (error?.message?.includes('429') && i < retries - 1) {
        console.warn(`Rate limit hit. Retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= 2;
      } else {
        throw error;
      }
    }
  }
  throw new Error('Exceeded retry limit');
}

export const calculateTokenUSD = (
  symbol: string,
  amount: number,
  priceUSD: number,
  solPriceUSD: number,
) => {
  if (symbol === 'USDC' || symbol === 'USDT') {
    return amount;
  } else if (symbol === 'SOL' || symbol === 'WSOL') {
    return amount * solPriceUSD;
  } else {
    return amount * priceUSD;
  }
};

export function formatTransactionData(data: Record<string, any>) {
  const round = (num: number) => Number(num.toFixed(2));

  return `
<b>Pair:</b> ${data.pair}⚖️
<b>Protocol:</b> ${data.protocol}
<b>Market Address:</b> <code>${data.address}</code>

<b>Token A:</b>
  - Mint: <code>${data.tokenA.mint}</code>
  - Amount: ${round(data.tokenA.amount)}
  - USD Value: $${round(data.tokenA.usdValue)}

<b>Token B:</b>
  - Mint: <code>${data.tokenB.mint}</code>
  - Amount: ${round(data.tokenB.amount)}
  - USD Value: $${round(data.tokenB.usdValue)}

<b>Block Timestamp:</b> ${data.blockTimestamp.toISOString()}
`;
}

export function formatTransactionResult(
  transactionStatus: Record<string, any>,
  previousTransactionStatus: Record<string, any>,
) {
  const currentSuccessPercentage =
    (transactionStatus.success / transactionStatus.total) * 100;
  const previousSuccessPercentage = previousTransactionStatus.success
    ? (previousTransactionStatus.success / previousTransactionStatus.total) *
      100
    : 0;

  return `
<b>Transaction Status📊:</b>
  - Current State: ${JSON.stringify(transactionStatus, null, 2)}
  - Previous State: ${JSON.stringify(previousTransactionStatus, null, 2)}

<b>Success Rate:</b>
  - Current: ${Math.round(currentSuccessPercentage)}%
  - Previous: ${Math.round(previousSuccessPercentage)}%

<b>Differences:</b>
  - Success: ${transactionStatus.success - previousTransactionStatus.success}
  - Failure: ${transactionStatus.failure - previousTransactionStatus.failure}
  - Total: ${transactionStatus.total - previousTransactionStatus.total}
`;
}
