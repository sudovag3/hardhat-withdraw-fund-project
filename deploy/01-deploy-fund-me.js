// function deloyFunc() {
//     console.log(`hi`);
// }

const { network } = require("hardhat");
const { networkConfig, developmentChain } = require("../helper-hardhat-config");
const { verify } = require("../uitils/verify");

module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();
  const chainId = network.config.chainId;
  let ethUsdPriceAddress;
  if (developmentChain.includes(network.name)) {
    const ethUsdtAggregator = await deployments.get("MockV3Aggregator");
    ethUsdPriceAddress = ethUsdtAggregator.address;
  } else {
    ethUsdPriceAddress = networkConfig[chainId]["ethUsdPriceFeedAddress"];
  }
  const args = [ethUsdPriceAddress];
  console.log(args);
  const fundMe = await deploy("FundMe", {
    from: deployer,
    args: args, // pricefeed,
    log: true,
    waitConfirmations: network.config.blockConfirmations || 1,
  });
  if (
    !developmentChain.includes(network.name) &&
    process.env.ETHERSCAN_API_KEY
  ) {
    await verify(fundMe.address, args);
  }
  log("---------------------------------------");
};
module.exports.tags = ["all", "fundme"];
