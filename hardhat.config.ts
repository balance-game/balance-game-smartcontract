import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";
import "hardhat-gas-reporter"
import "solidity-coverage"

dotenv.config({ quiet: true });

const config: HardhatUserConfig = {
  solidity: "0.8.28",
  networks: {
    hardhat: {},
    localhost: {
      url: "http://127.0.0.1:8545"
    },
    sepolia: {
      url: process.env.SEPOLIA_URL,
      accounts: [process.env.PRIVATE_KEY!]
    },
    amoy: {
      url: process.env.AMOY_URL,
      accounts: [process.env.PRIVATE_KEY!],
      gasPrice: 35e9,
      gas: 25e6,
    }
  },
  gasReporter: {
    enabled: true,
    currency: "KRW"
  }
};

export default config;
