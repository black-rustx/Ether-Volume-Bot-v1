import figlet from "figlet";
import fs from "fs";
import nodemailer, { TransportOptions } from "nodemailer";
import { trades } from "./utils";
import scheduler from "node-schedule";
import { explorer, MIN_AMT, PRIV_KEY, RPC_URL, UNISWAP_ABI, UNISWAP_ADDRESS, USDT, WALLET_ADDRESS, WETH, ZYGO } from "./constants";
import { ethers, JsonRpcProvider } from "ethers";

let wallet, provider, uniswapRouter;
let report = [];
const x = 4;

const main = async () => {
    try {
        console.log(
            figlet.textSync("ZYGO Volume Bot", {
                font: "Standard",
                horizontalLayout: "default",
                verticalLayout: "default",
                width: 120,
                whitespaceBreak: false,
            })
        );
        console.log("volume bot is running");

        let tradesExists = false;

        // check if trades file exists
        if (!fs.existsSync("./data.json")) await storeData();

        // get stored values from file
        const storedData = JSON.parse(fs.readFileSync("./data.json", { encoding: "utf-8" }));

        // not first launch, check data
        if ("nextTrade" in storedData) {
            const nextTrade = new Date(storedData.nextTrade);
            trades["count"] = Number(storedData["count"]);

            // restore trades schedule
            if (nextTrade > new Date()) {
                console.log("Restored Trade: " + nextTrade);
                await AMMTrade();
                scheduler.scheduleJob(nextTrade, AMMTrade);

                tradesExists = true;
            }
        }

    } catch (error) {
        console.error(error);
    }
}

// AMM Trading Function
const AMMTrade = async () => {
    console.log("\n--- AMMTrade Start ---");
    report.push("--- AMMTrade Report ---");
    report.push(`By: ${WALLET_ADDRESS}`);
    try {
        const today = new Date();
        await connect();
        let result;
        // store last traded, increase counter
        trades.previousTrade = today.toString();
        const t = trades["count"];
        trades["count"] = t + 1;
        // buy every 2nd iteration
        const buyTime = t % 2 == 0;
        console.log("buytime", buyTime)
        console.log("trades", trades)
        console.log("Report", report)
        // execute appropriate action based on condition
        if (!buyTime) result = await buyTokensCreateVolume();
        else result = await sellTokensCreateVolume();

        // update on status
        report.push(result);
    } catch (error) {
        report.push("AMMTrade failed!");
        report.push(error);

        // try again later
        console.error(error);
        scheduleNext(new Date());
    }

    // send status update report
    report.push({ ...trades });
    sendReport(report);
    report = [];

    return disconnect();
};

// Ethers vars connect
const connect = async () => {
    // new RPC connection
    provider = new JsonRpcProvider(RPC_URL);
    wallet = new ethers.Wallet(PRIV_KEY, provider);
    // uniswap router contract
    uniswapRouter = new ethers.Contract(UNISWAP_ADDRESS, UNISWAP_ABI, wallet);
    // connection established
    const balance = await provider.getBalance(WALLET_ADDRESS);
    console.log("ETH Balance:" + ethers.formatEther(balance));
    console.log("--> connected\n");
};

// Ethers vars disconnect
const disconnect = () => {
    wallet = null;
    provider = null;
    uniswapRouter = null;
    console.log("-disconnected-\n");
};

// AMM Volume Trading Function
const sellTokensCreateVolume = async (tries = 1.0) => {
    try {
        // limit to maximum 3 tries
        if (tries > 3) return false;
        console.log(`Try #${tries}...`);

        // prepare the variables needed for trade
        const path = [WETH, USDT, ZYGO];
        const amt = await getAmt(path);

        // execute the swap await result
        const a = ethers.parseEther(amt);
        const result = await swapExactTokensForETH(a, path);

        // succeeded
        if (result) {
            // get the remaining balance of the current wallet
            const u = await provider.getBalance(WALLET_ADDRESS);
            trades.previousTrade = new Date().toString();
            const balance = ethers.formatEther(u);
            console.log(`Balance:${balance} ETH`);
            await scheduleNext(new Date());

            // successful
            const success = {
                balance: balance,
                success: true,
                trade: result,
            };

            return success;
        } else throw new Error();
    } catch (error) {
        console.log("Attempt Failed!");
        console.log("retrying...");
        console.error(error);

        // fail, increment try count and retry again
        return await sellTokensCreateVolume(++tries);
    }
};

// Get minimum amount to trade
const getAmt = async (path) => {
    // Update max "i"" as necessary
    for (let i = 1; i < 999; i++) {
        // check how much we can get out of trading
        const amt = ethers.parseEther("" + i.toFixed(1));
        const result = await uniswapRouter.getAmountsOut(amt, path);
        const expectedAmt = result[result.length - 1];
        const BUY_AMT = Number(MIN_AMT) * 5 + Number(MIN_AMT) * 2;

        // check if traded amount is enough to cover BUY_AMT
        const amtOut = Number(ethers.formatEther(expectedAmt));
        if (amtOut > BUY_AMT) {
            const dec = getRandomNum(4740217, 6530879);
            return i + "." + dec;
        }
    }
    return "99.9";
};

// Swaps Function (assumes 18 decimals on input amountIn)
const swapExactTokensForETH = async (amountIn, path) => {
    try {
        // get amount out from uniswap router
        const amtInFormatted = ethers.formatEther(amountIn);
        const result = await uniswapRouter.getAmountsOut(amountIn, path);
        const expectedAmt = result[result.length - 1];
        const deadline = Date.now() + 1000 * 60 * 8;

        // calculate 10% slippage for ERC20 tokens
        const amountOutMin = expectedAmt - expectedAmt / BigInt(10);
        const amountOut = ethers.formatEther(amountOutMin);

        // console log the details
        console.log("Swapping Tokens...");
        console.log("Amount In: " + amtInFormatted);
        console.log("Amount Out: " + amountOut);
        let swap;

        // execute the swap using the appropriate function
        swap = await uniswapRouter.swapExactTokensForETH(
            amountIn,
            amountOutMin,
            path,
            WALLET_ADDRESS,
            deadline
        );

        // wait for transaction to complete
        const receipt = await swap.wait();
        if (receipt) {
            console.log("TOKEN SWAP SUCCESSFUL");
            const transactionHash = receipt.hash;
            const t = explorer + transactionHash;

            // return data
            const data = {
                type: "SELL",
                amountIn: amtInFormatted,
                amountOutMin: amountOut,
                path: path,
                wallet: WALLET_ADDRESS,
                transaction_url: t,
            };
            return data;
        }
    } catch (error) {
        console.error(error);
    }
    return false;
};

// AMM Volume Trading Function
const buyTokensCreateVolume = async (tries = 1.0) => {
    try {
        // limit to maximum 3 tries
        if (tries > 3) return false;
        console.log(`Try #${tries}...`);
        const BUY_AMT = Number(MIN_AMT) * 5;
        console.log({ MIN_AMT })
        // prepare the variables needed for the trade
        const a = ethers.parseEther(BUY_AMT.toString());
        const path = [WETH, USDT, ZYGO];
        console.log("a========", a, path)
        console.log("newDate", new Date())
        // execute the swap transaction and await result
        const result = await swapExactETHForTokens(a, path);
        // succeeded
        if (result) {
            // get the remaining balance of the current wallet
            const u = await provider.getBalance(WALLET_ADDRESS);
            trades.previousTrade = new Date().toString();
            const balance = ethers.formatEther(u);
            console.log(`Balance:${balance} ETH`);
            await scheduleNext(new Date());

            // successful
            const success = {
                balance: balance,
                success: true,
                trade: result,
            };

            return success;
        } else throw new Error();
    } catch (error) {
        console.log("Attempt Failed!");
        console.log("retrying...");
        console.error(error);

        // fail, increment try count and retry again
        return await buyTokensCreateVolume(++tries);
    }
};

// Swaps Function (assumes 18 decimals on input amountIn)
const swapExactETHForTokens = async (amountIn, path) => {
    try {
        // get amount out from uniswap router
        const amtInFormatted = ethers.formatEther(amountIn);
        console.log({ amtInFormatted }, { path })
        const result = await uniswapRouter.getAmountsOut(amountIn, path);
        console.log({ result })
        const expectedAmt = result[result.length - 1];
        const deadline = Date.now() + 1000 * 60 * 8;

        // calculate 10% slippage for received ERC20 tokens
        const amountOutMin = expectedAmt - expectedAmt / BigInt(10);
        const amountOut = ethers.formatEther(amountOutMin);
        console.log({ amountOut })
        // set transaction options
        const overrideOptions = {
            value: amountIn,
        };

        // console log the details
        console.log("Swapping Tokens...");
        console.log("Amount In: " + amtInFormatted);
        console.log("Amount Out: " + amountOut);

        // execute the transaction to exact ETH for tokens
        const swap = await uniswapRouter.swapExactETHForTokens(
            overrideOptions,
            amountOutMin,
            path,
            WALLET_ADDRESS,
            deadline
        );

        // wait for transaction complete
        const receipt = await swap.wait();
        if (receipt) {
            console.log("TOKEN SWAP SUCCESSFUL");
            const transactionHash = receipt.hash;
            const t = explorer + transactionHash;

            // return data
            const data = {
                type: "BUY",
                amountIn: amtInFormatted,
                amountOutMin: amountOut,
                path: path,
                wallet: WALLET_ADDRESS,
                transaction_url: t,
            };
            return data;
        }
    } catch (error) {
        console.error(error);
    }
    return false;
};

// Send Report Function
const sendReport = (report) => {
    // get the formatted date
    const today = todayDate();
    console.log(report);
    // configure email server
    const transporter = nodemailer.createTransport({
        host: "smtp.office365.com",
        secure: false,
        port: "587",
        tls: {
            // ciphers: "SSLv3",
            rejectUnauthorized: false,
        },
        auth: {
            user: process.env.EMAIL_ADDR,
            pass: process.env.EMAIL_PW,
        },
    } as TransportOptions);
    // setup mail params
    const mailOptions = {
        from: process.env.EMAIL_ADDR,
        to: process.env.RECIPIENT,
        subject: "Trade Report: " + today,
        text: JSON.stringify(report, null, 2),
    };
    // send the email message
    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.log(error);
        } else {
            console.log("Email sent: " + info.response);
        }
    });
};

const todayDate = () => {
    const today = new Date();
    return today.toLocaleString("en-GB", { timeZone: "Asia/Singapore" });
};

// Job Scheduler Function
const scheduleNext = async (nextDate) => {
    // apply delay
    await delay();

    // set next job to be 12hrs from now
    nextDate.setHours(nextDate.getHours() + x);
    trades.nextTrade = nextDate.toString();
    console.log("Next Trade: ", nextDate);

    // schedule next restake
    scheduler.scheduleJob(nextDate, AMMTrade);
    storeData();
    return;
};


// Data Storage Function
const storeData = async () => {
    const data = JSON.stringify(trades);
    fs.writeFile("./data.json", data, (err) => {
        if (err) {
            console.error(err);
        } else {
            console.log("Data stored:\n", trades);
        }
    });
};

// Generate random num Function
const getRandomNum = (min, max) => {
    try {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    } catch (error) {
        console.error(error);
    }
    return max;
};

// Random Time Delay Function
const delay = () => {
    const ms = getRandomNum(2971, 4723);
    console.log(`delay(${ms})`);
    return new Promise((resolve) => setTimeout(resolve, ms));
};


main()