const BalanceGame = artifacts.require("BalanceGame");

module.exports = function(deployer) {
  deployer.deploy(BalanceGame, 1);
};
