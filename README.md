# Liquidity Pool Fetcher

## Overview
Liquidity Pool Fetcher is a Node.js service that aggregates transactions from a data source (WebSocket), formats liquidity pool distribution using the Raydium API, and sends formatted messages to both Telegram and WebSocket clients.

## Features
- **WebSocket Integration**: Listens to real-time transaction data.
- **Raydium API Fetching**: Retrieves liquidity pool distribution.
- **Data Formatting**: Processes and structures the data for better readability.
- **Telegram Bot Notification**: Sends updates to a Telegram chat.
- **WebSocket Broadcasting**: Sends formatted data to WebSocket clients.

## Technologies Used
- **Node.js**
- **TypeScript**
- **WebSocket**
- **Telegram API**
- **Solana**
- **Raydium API**

## Installation
1. Clone the repository:
   ```sh
   git clone <repository_url>
   cd <project_folder>
   ```
2. Install dependencies:
   ```sh
   npm install
   ```
3. Create a `.env` file with the following variables:
   ```sh
   TELEGRAM_BOT_TOKEN=<your_telegram_bot_token>
   TELEGRAM_CHAT_ID=<your_telegram_chat_id>
   SOLANA_RPC_URL=<your_solana_rpc_url>
   ```

## Usage
Start the service:
```sh
npm run start
```

## License
This project is licensed under the MIT License.

