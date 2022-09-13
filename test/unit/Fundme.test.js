const { assert, expect } = require("chai");
const { deployments, ethers, getNamedAccounts } = require("hardhat");
const { developmentChain } = require("../../helper-hardhat-config");

!developmentChain.includes(network.name)
  ? describe.skip
  : describe("FundMe", async () => {
      let fundMe;
      let deployer;
      let mockV3Aggregator;
      const sendValue = ethers.utils.parseEther("1");
      beforeEach(async () => {
        // const accounts = await ethers.getSigners();
        deployer = (await getNamedAccounts()).deployer;
        await deployments.fixture(["all"]);
        fundMe = await ethers.getContract("FundMe", deployer);
        mockV3Aggregator = await ethers.getContract(
          "MockV3Aggregator",
          deployer
        );
      });
      describe("constructor", async () => {
        it("set the aggregator", async () => {
          const response = await fundMe.getPriceFeed();
          assert.equal(response, mockV3Aggregator.address);
        });
      });
      describe("fund", async () => {
        it("Fails if you dont send enaugh ETH", async () => {
          await expect(fundMe.fund()).to.be.revertedWith(
            "You need to spend more ETH!"
          );

          // assert.equal(response, mockV3Aggregator.address)
        });
        it("updated", async () => {
          await fundMe.fund({
            value: sendValue,
          });
          const accounts = await ethers.getSigners();

          const response = await fundMe.getAddressToAmountFunded(
            accounts[0].address
          );
          assert.equal(response.toString(), sendValue.toString());

          // assert.equal(response, mockV3Aggregator.address)
        });
        it("updated array", async () => {
          await fundMe.fund({
            value: sendValue,
          });
          const accounts = await ethers.getSigners();
          const response = await fundMe.getFunder(0);
          assert.equal(response, deployer);

          // assert.equal(response, mockV3Aggregator.address)
        });
      });
      describe("wthdraw", async () => {
        beforeEach(async () => {
          await fundMe.fund({
            value: sendValue,
          });
        });
        it("withdraw ETH", async () => {
          const startingFundMeBalance = await fundMe.provider.getBalance(
            fundMe.address
          );
          const startingDeloyerBalance = await fundMe.provider.getBalance(
            deployer
          );

          const tx = await fundMe.withdraw();
          const txReceipt = await tx.wait(1);
          const { gasUsed, effectiveGasPrice } = txReceipt;
          const gasCost = gasUsed.mul(effectiveGasPrice);

          const endingFundMeBalance = await fundMe.provider.getBalance(
            fundMe.address
          );
          const endingDeloyerBalance = await fundMe.provider.getBalance(
            deployer
          );
          assert.equal(endingFundMeBalance, 0);
          assert.equal(
            startingFundMeBalance.add(startingDeloyerBalance).toString(),
            endingDeloyerBalance.add(gasCost).toString()
          );
        });
        it("withdraw ETH with multiple", async () => {
          const accounts = await ethers.getSigners();
          for (let i = 0; i < 6; i++) {
            const tx = await fundMe.connect(accounts[i]).fund({
              value: sendValue,
            });
          }
          const startingFundMeBalance = await fundMe.provider.getBalance(
            fundMe.address
          );
          const startingDeloyerBalance = await fundMe.provider.getBalance(
            deployer
          );

          const tx = await fundMe.withdraw();
          const txReceipt = await tx.wait(1);
          const { gasUsed, effectiveGasPrice } = txReceipt;
          const gasCost = gasUsed.mul(effectiveGasPrice);

          const endingFundMeBalance = await fundMe.provider.getBalance(
            fundMe.address
          );
          const endingDeloyerBalance = await fundMe.provider.getBalance(
            deployer
          );
          assert.equal(endingFundMeBalance, 0);
          assert.equal(
            startingFundMeBalance.add(startingDeloyerBalance).toString(),
            endingDeloyerBalance.add(gasCost).toString()
          );
          for (let i = 1; i < 6; i++) {
            assert.equal(
              await fundMe.getAddressToAmountFunded(accounts[i].address),
              0
            );
          }
        });
        it("Only owner", async () => {
          const accounts = await ethers.getSigners();
          const attacker = accounts[1];
          const attackerConnected = await fundMe.connect(attacker);
          await expect(
            attackerConnected.withdraw()
          ).to.be.revertedWithCustomError(
            attackerConnected,
            "FundMe__NotOwner"
          );
        });
      });
    });
