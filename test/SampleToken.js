const {accounts, contract} = require("@openzeppelin/test-environment");
const {expect} = require("chai");
const {BN, constants, expectEvent, expectRevert} = require("@openzeppelin/test-helpers");
const {ZERO_ADDRESS} = constants;

const SampleToken = contract.fromArtifact("SampleToken");

describe("SampleToken", function () {
    const [owner, recipient, spender] = accounts;

    beforeEach(async function () {
        this.token = await SampleToken.new(new BN(1000), {from: owner});
    });

    it("should have correct initial values", async function () {
        expect(await this.token.name()).to.equal("Sample Token");
        expect(await this.token.symbol()).to.equal("TOK");
        expect(await this.token.decimals()).to.be.bignumber.equal(new BN(18));
        expect(await this.token.totalSupply()).to.be.bignumber.equal(new BN(1000));
        expect(await this.token.balanceOf(owner)).to.be.bignumber.equal(new BN(1000));
    });

    it("should allow safe transfers", async function () {
        expect(await this.token.balanceOf(recipient)).to.be.bignumber.equal(new BN(0));
        await this.token.transfer(recipient, new BN(100), {from: owner});
        expect(await this.token.balanceOf(recipient)).to.be.bignumber.equal(new BN(100));
    });

    it("should disallow transfers to the zero address", async function () {
        await expectRevert(this.token.transfer(ZERO_ADDRESS, new BN(100), {from: owner}), "transfer to the zero address");
    });

    it("should allow transfers from after approval", async function () {
        await this.token.approve(spender, new BN(100), {from: owner});
        expect(await this.token.allowance(owner, spender)).to.be.bignumber.equal(new BN(100));
        await this.token.transferFrom(owner, recipient, new BN(100), {from: spender});
        expect(await this.token.allowance(owner, spender)).to.be.bignumber.equal(new BN(0));
        expect(await this.token.balanceOf(recipient)).to.be.bignumber.equal(new BN(100));
    });

    it("should disallow transfers from without approval", async function () {
        await expectRevert(this.token.transferFrom(owner, recipient, new BN(100), {from: spender}), "transfer amount exceeds allowance");
    });

    it("should allow increasing and decreasing allowances", async function () {
        await this.token.approve(spender, new BN(100), {from: owner});
        expect(await this.token.allowance(owner, spender)).to.be.bignumber.equal(new BN(100));
        await this.token.increaseAllowance(spender, new BN(100), {from: owner});
        expect(await this.token.allowance(owner, spender)).to.be.bignumber.equal(new BN(200));
        await this.token.decreaseAllowance(spender, new BN(100), {from: owner});
        expect(await this.token.allowance(owner, spender)).to.be.bignumber.equal(new BN(100));
    });

    it("should emit events on safe transfer, approval, and allowance change", async function () {
        const transferReceipt = await this.token.transfer(recipient, new BN(100), {from: owner});
        expectEvent(transferReceipt, "Transfer", {
            _from: owner,
            _to: recipient,
            _value: new BN(100)
        });

        const approvalReceipt = await this.token.approve(spender, new BN(100), {from: owner});
        expectEvent(approvalReceipt, "Approval", {
            _owner: owner,
            _spender: spender,
            _value: new BN(100)
        });

        const increaseAllowanceReceipt = await this.token.increaseAllowance(spender, new BN(100), {from: owner});
        expectEvent(increaseAllowanceReceipt, "Approval", {
            _owner: owner,
            _spender: spender,
            _value: new BN(200)
        });

        const decreaseAllowanceReceipt = await this.token.decreaseAllowance(spender, new BN(100), {from: owner});
        expectEvent(decreaseAllowanceReceipt, "Approval", {
            _owner: owner,
            _spender: spender,
            _value: new BN(100)
        });
    });

    it("should allow the owner to mint new coins", async function () {
        expect(await this.token.totalSupply()).to.be.bignumber.equal(new BN(1000));
        await this.token.mint(new BN(1000), {from: owner})
        expect(await this.token.totalSupply()).to.be.bignumber.equal(new BN(2000));
    });
});
