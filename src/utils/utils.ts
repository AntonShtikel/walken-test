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

export function formatTransactionDataForPools(
  dataForPools: Record<string, any[]>,
  pair: string,
) {
  const round = (num: number) => Number(num.toFixed(2));

  const formatTokenData = (token: {
    mint: string;
    amount: number;
    usdValue: number;
  }) => {
    return `  - Mint: <code>${token.mint}</code>\n    - Amount: ${round(token.amount)}\n    - USD Value: $${round(token.usdValue)}`;
  };

  let resultMessage = `<b>Data of pools ⚡️:</b>\n<b>Pair:</b> ${pair}⚖️`;

  for (const poolAddress in dataForPools) {
    const poolData = dataForPools[poolAddress];

    for (const data of poolData) {
      resultMessage += `
\n<b>Market Address:</b> <code>${data.address}</code>
<b>Token A:</b>\n${formatTokenData(data.tokenA)}
<b>Token B:</b>\n${formatTokenData(data.tokenB)}`;
    }
  }

  return resultMessage;
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
