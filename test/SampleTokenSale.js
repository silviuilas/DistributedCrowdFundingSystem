const { accounts, contract } = require("@openzeppelin/test-environment");
const { expect } = require("chai");
const { BN, expectEvent, expectRevert } = require("@openzeppelin/test-helpers");


const SampleToken = contract.fromArtifact("SampleToken");
const SampleTokenSale = contract.fromArtifact("SampleTokenSale");

describe("SampleTokenSale", function () {
  const [ owner, buyer1, buyer2 ] = accounts;

  beforeEach(async function () {
    this.token = await SampleToken.new(new BN(1000), { from: owner });
    this.crowdsale = await SampleTokenSale.new(this.token.address, new BN(10), { from: owner });
    await this.token.approve(this.crowdsale.address, new BN(1000), { from: owner });
  });

  it("should have correct initial values", async function () {
    expect(await this.crowdsale.tokenContract()).to.equal(this.token.address);
    expect(await this.crowdsale.tokenPrice()).to.be.bignumber.equal(new BN(10));
    expect(await this.crowdsale.owner()).to.be.equal(owner)
  });

  it("should allow buying tokens with exact price", async function () {
    expect(await this.token.balanceOf(buyer1)).to.be.bignumber.equal(new BN(0));
    expect(await this.token.balanceOf(owner)).to.be.bignumber.equal(new BN(1000));
    await this.crowdsale.buyTokens(new BN(10), { from: buyer1, value: new BN(100) });
    expect(await this.token.balanceOf(buyer1)).to.be.bignumber.equal(new BN(10));
    expect(await this.token.balanceOf(owner)).to.be.bignumber.equal(new BN(990));
  });

  it("should allow buying tokens while giving a bigger value and returns the correct excess amount", async function () {
    expect(await this.token.balanceOf(buyer1)).to.be.bignumber.equal(new BN(0));
    expect(await this.token.balanceOf(owner)).to.be.bignumber.equal(new BN(1000));
    const buyTokens = await this.crowdsale.buyTokens(new BN(10), { from: buyer1, value: new BN(1000) });
    expect(await this.token.balanceOf(buyer1)).to.be.bignumber.equal(new BN(10));
    expect(await this.token.balanceOf(owner)).to.be.bignumber.equal(new BN(990));
    expectEvent(buyTokens, "RefundExcess", {
      _buyer: buyer1,
      _amount: new BN(900)
    });
    expectEvent(buyTokens, "Sell", {
      _buyer: buyer1,
      _amount: new BN(10)
    });
  });

  it("should not allow buying tokens with incorrect price", async function () {
    await expectRevert(this.crowdsale.buyTokens(new BN(10), { from: buyer1, value: new BN(50) }), "SampleTokenSale: incorrect price");
  });

  it("should not allow buying tokens when contract has insufficient balance", async function () {
    await expectRevert(this.crowdsale.buyTokens(new BN(2000), { from: buyer1, value: new BN(20000) }), "SampleTokenSale: contract has insufficient balance");
  });

  it("should not allow ending sale by non-owner", async function () {
    await expectRevert(this.crowdsale.endSale({ from: buyer1 }), "SampleTokenSale: caller is not owner");
  });

  it("should allow changing token price", async function () {
    expect(await this.crowdsale.tokenPrice()).to.be.bignumber.equal(new BN(10));
    await this.crowdsale.updatePrice(new BN(200), { from: owner });
    expect(await this.crowdsale.tokenPrice()).to.be.bignumber.equal(new BN(200));
  });

  it("should not allow changing token price by non-owner", async function () {
    await expectRevert(this.crowdsale.updatePrice(new BN(200), { from: buyer1 }), "SampleTokenSale: caller is not owner");
  });
});
