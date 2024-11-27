# 🚀 **Ethereum Volume Bot v1**  

### 🔥 Overview  
The **Ethereum Volume Bot** is designed to automate token volume trading on Uniswap. It performs buy and sell operations based on specified conditions, leveraging the power of the Ethereum network. This bot also handles scheduled trades, provides status reports, and interacts with the Uniswap protocol. 

---

### ⚙️ **Setup and Installation**  

1. **Clone the Repository**  
   ```bash
   git clone <repository_url>
   cd <project_directory>
   ```

2. **Install Dependencies**  
   Ensure you have [Node.js](https://nodejs.org/en/) installed. Then, run the following command to install the necessary dependencies:  
   ```bash
   npm install
   ```

3. **Configuration**  
   - **RPC URL**: Add your Ethereum RPC URL in `constants.js`.  
   - **Private Key**: Set your private key (use with caution) for your wallet in `constants.js`.  
   - **Wallet Address**: Add your wallet address where the bot will perform trades.  
   - **Uniswap Router Address & ABI**: Add the Uniswap contract details in `constants.js`.

---

### 🏗️ **Running the Bot**  

1. **Start the Bot**  
   To run the bot, use the following command:
   ```bash
   npm start
   ```
   This will launch the bot and initiate the trading process.

2. **How the Bot Works**  
   - The bot alternates between buying and selling tokens every few hours.  
   - It interacts with the **Uniswap Router Contract** to perform token swaps.
   - Reports are generated for each trade and can be sent via email.

---

### 🔄 **Trading Process**

1. **Connect to Ethereum Network**  
   The bot connects to the Ethereum network using an RPC URL and your wallet private key. It will check the current balance of the wallet before initiating any trades.

2. **Volume Trading**  
   The bot buys and sells tokens on **Uniswap** by following these steps:
   - **Buy Tokens**: Executes `swapExactETHForTokens` function.
   - **Sell Tokens**: Executes `swapExactTokensForETH` function.
   - **Slippage**: A 10% slippage is applied to the trades to ensure the transaction goes through smoothly.

3. **Scheduled Trades**  
   - The bot schedules the next trade every 12 hours.
   - The scheduled time is updated after each trade.

4. **Trade Reporting**  
   - The bot generates a **trade report** after each transaction, which is sent to your email.

---

### 📧 **Email Notifications**  

The bot can send trade reports via email. Configure the following environment variables to use this feature:

- `EMAIL_ADDR`: Your email address.
- `EMAIL_PW`: Your email password.
- `RECIPIENT`: The recipient's email address for receiving trade reports.

---

### 🛠️ **Bot Functions Overview**

1. **AMM Trade**  
   The core function that handles the buy and sell operations. It alternates between buying and selling tokens every 12 hours.

2. **Swap Functions**  
   - `swapExactETHForTokens`: Swaps ETH for the desired token (ZYGO).
   - `swapExactTokensForETH`: Sells tokens for ETH.
   
3. **Data Storage**  
   The bot saves its state to a `data.json` file, ensuring it picks up where it left off if stopped or restarted.

4. **Scheduled Jobs**  
   The bot uses `node-schedule` to handle trade scheduling and updates the `nextTrade` field for future trades.

---

### 🔑 **Important Notes**  

- **Min/Max Trade Amounts**: Make sure the `MIN_AMT` is set to an appropriate value to avoid errors during trades.
- **Private Key Security**: Do **not** expose your private key in public repositories.
- **Testnet First**: It is recommended to test the bot on the testnet before using it on the mainnet to avoid potential losses.
- **Error Handling**: If an error occurs during a trade, the bot will automatically retry up to 3 times before failing.

---

### ⚠️ **Risk Disclaimer**  

> **Warning**:  
> You are solely responsible for any capital loss when using this bot. Please proceed with caution, especially when trading on the mainnet. Always test on the testnet first.

---

### 👨‍💻 **Contributing**  
Feel free to contribute to this bot by opening a pull request. Suggestions and improvements are always welcome!

---

Let me know if you'd like any further modifications! 😊

## 📞 Author

Telegram: [@g0drlc](https://t.me/g0drlc)
