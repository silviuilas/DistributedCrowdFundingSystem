const {accounts, contract} = require("@openzeppelin/test-environment");
const {expect} = require("chai");
const {BN, expectEvent, expectRevert, time} = require("@openzeppelin/test-helpers");

const Auction = contract.fromArtifact("MyAuction");
const SampleToken = contract.fromArtifact("SampleToken");

describe("MyAuction", function () {
    const [owner, bidder1, bidder2, tokenOwner] = accounts;
    const auction_state = Object.freeze({
        CANCELLED: 0,
        STARTED: 1,
    });

    beforeEach(async function () {
        this.token = await SampleToken.new(new BN(100000), {from: tokenOwner});
        this.auction = await Auction.new(2, "Mercedes", "123", this.token.address, {from: owner});
        this.block_timestamp = await time.latest();
        await this.token.transfer(bidder1, 1000, {from: tokenOwner});
        await this.token.transfer(bidder2, 2000, {from: tokenOwner});
        await this.token.approve(this.auction.address, new BN(9999999999), {from: bidder1});
        await this.token.approve(this.auction.address, new BN(9999999999), {from: bidder2});
    });

    it("should have correct initial values", async function () {
        expect(await this.auction.get_owner()).to.equal(owner);
        expect(await this.auction.auction_start()).to.be.bignumber.equal(this.block_timestamp);
        expect(await this.auction.auction_end()).to.be.bignumber.equal(this.block_timestamp.add(new BN(2 * 3600)));
        expect(await this.auction.STATE()).to.be.bignumber.equal(new BN(auction_state.STARTED));
    });

    it("should not allow non-owners to cancel the auction", async function () {
        await expectRevert(this.auction.cancel_auction({from: bidder1}), "MyAuction: caller is not owner");
    });

    it("should allow owners to cancel the auction", async function () {
        const cancelResult = await this.auction.cancel_auction({from: owner});
        expect(await this.auction.STATE()).to.be.bignumber.equal(new BN(auction_state.CANCELLED));
        expectEvent(cancelResult, "CanceledEvent", {
            message: "Auction Cancelled",
            time: new BN(this.block_timestamp)
        });
    });

    it("should allow bidders to place bids", async function () {
            expect(await this.auction.highestBid()).to.be.bignumber.equal(new BN(0));
            expect(await this.auction.bids(bidder1)).to.be.bignumber.equal(new BN(0));
            const bidResult = await this.auction.bid({from: bidder1, value: new BN(100)});
            expect(await this.auction.highestBid()).to.be.bignumber.equal(new BN(100));
            expect(await this.auction.bids(bidder1)).to.be.bignumber.equal(new BN(100));
            expectEvent(bidResult, "BidEvent", {
                highestBidder: bidder1,
                highestBid: new BN(100)
            });
        }
    );

    it("should not allow bidders to place multiple bids", async function () {
        await this.auction.bid({from: bidder1, value: new BN(100)});
        await expectRevert(this.auction.bid({
            from: bidder1,
            value: new BN(200)
        }), "You can't bid, you have already placed a bid");
    });

    it("should not allow bidders to place bids without enough tokens", async function () {
        await expectRevert(this.auction.bid({
            from: bidder1,
            value: new BN(10000)
        }), "transfer amount exceeds balance");
    });

    it("should not allow bidders to withdraw before the auction ends or if they haven't placed a bid", async function () {
        await expectRevert(this.auction.withdraw({from: bidder1}), "You can't withdraw, the auction is still open");
        await time.increase(3 * 3600)
        await expectRevert(this.auction.withdraw({from: bidder1}), "You can't withdraw, you haven't placed a bid");
    });

    it("should allow bidders to withdraw after the auction ends", async function () {
        await this.auction.bid({from: bidder1, value: new BN(100)});
        await this.auction.bid({from: bidder2, value: new BN(200)});
        await time.increase(3 * 3600)
        const withdrawResult = await this.auction.withdraw({from: bidder1});
        expect(await this.auction.bids(bidder1)).to.be.bignumber.equal(new BN(0));
        expectEvent(withdrawResult, "WithdrawalEvent", {
            withdrawer: bidder1,
            amount: new BN(100)
        });
    });

    it("should not allow owners to destruct the contract while the auction is still open", async function () {
        await expectRevert(this.auction.destruct_auction({from: owner}), "You can't destruct the contract, The auction is still open");
    });

    it("should allow owners to destruct the contract after the auction ends", async function () {
        await this.auction.bid({from: bidder1, value: new BN(100)});
        await this.auction.bid({from: bidder2, value: new BN(200)});
        await time.increase(3 * 3600)
        await this.auction.destruct_auction({from: owner});
        expect(await this.auction.bids(bidder1)).to.be.bignumber.equal(new BN(0));
    });

    it("should allow owners to withdraw winning bid after the auction ends", async function () {
        await this.auction.bid({from: bidder1, value: new BN(100)});
        await this.auction.bid({from: bidder2, value: new BN(200)});
        await time.increase(3 * 3600)
        expect(await this.auction.highestBid()).to.be.bignumber.equal(new BN(200));
        const ownerWithdrawResult = await this.auction.ownerWithdraw({from: owner});
        expectEvent(ownerWithdrawResult, "WinningEvent", {
            winningBidder: bidder2,
            winningBid: new BN(200)
        });
    });

    it("should not allow owners to withdraw winning bid if there is no winning bid", async function () {
        await time.increase(3 * 3600)
        await expectRevert(this.auction.ownerWithdraw({from: owner}), "There is no winning bid to withdraw");
    });
});

