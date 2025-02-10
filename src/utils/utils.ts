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

export function formatPoolDistribution(
  dataForPools: Record<string, any[]>,
  pair: string,
): string {
  let totalTokenA = 0;
  let totalTokenB = 0;
  let totalUSDTokenA = 0;
  let totalUSDTokenB = 0;

  for (const poolData of Object.values(dataForPools)) {
    for (const data of poolData) {
      totalTokenA += data.tokenA.amount;
      totalTokenB += data.tokenB.amount;
      totalUSDTokenA += data.tokenA.usdValue;
      totalUSDTokenB += data.tokenB.usdValue;
    }
  }

  const firstPool = Object.values(dataForPools)[0]?.[0];
  const tokenAName = firstPool ? firstPool.tokenA.mint : 'Token A';
  const tokenBName = firstPool ? firstPool.tokenB.mint : 'Token B';

  let message = `Pair: ${pair}\n`;
  message += `Total:\n  - ${tokenAName}: ${totalTokenA} (~$${totalUSDTokenA.toFixed(2)})\n  - ${tokenBName}: ${totalTokenB} (~$${totalUSDTokenB.toFixed(2)})\n\n`;
  message += `Pools distribution:\n`;

  for (const [poolAddress, poolData] of Object.entries(dataForPools)) {
    for (const data of poolData) {
      const percentA = ((data.tokenA.amount / totalTokenA) * 100).toFixed(2);
      const percentB = ((data.tokenB.amount / totalTokenB) * 100).toFixed(2);
      message += `  Pool type: ${data.type}\n address: ${poolAddress}:\n    - ${tokenAName}: ${percentA}% (~$${data.tokenA.usdValue.toFixed(2)})\n    - ${tokenBName}: ${percentB}% (~$${data.tokenB.usdValue.toFixed(2)})\n\n`;
    }
  }

  return message;
}
