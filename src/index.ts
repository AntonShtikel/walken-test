import express from 'express';
import { createServer } from 'http';
import {
  previousTransactionStatus,
  transactionStatus,
} from './services/handler';
import { port } from './config';
import { connectToSocket, setupWebSocketServer } from './websockets';

const app = express();

app.use(express.json());

const httpServer = createServer(app);
setupWebSocketServer();

httpServer.listen(port, () => {
  console.log(`Listening on port ${port}`);
  connectToSocket();
});

app.get('/statistics', async (req, res) => {
  const currentSuccessPercentage =
    (transactionStatus.success / transactionStatus.total) * 100;
  const previousSuccessPercentage = previousTransactionStatus.success
    ? (previousTransactionStatus.success / previousTransactionStatus.total) *
      100
    : '-';
  const result = {
    currentState: transactionStatus,
    previousState: previousTransactionStatus,
    successPercentages: {
      current: `${currentSuccessPercentage}%`,
      previous: `${previousSuccessPercentage}%`,
    },
    difference: {
      success: transactionStatus.success - previousTransactionStatus.success,
      failure: transactionStatus.failure - previousTransactionStatus.failure,
      total: transactionStatus.total - previousTransactionStatus.total,
    },
  };
  res.json(result);
});
