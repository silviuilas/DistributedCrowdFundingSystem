import "./Auction.sol";
pragma solidity ^0.8.0;

contract MyAuction is Auction {

    constructor (uint _biddingTime, string memory _brand, string memory _Rnumber, address _tokenAddress) {
        token = SampleToken(_tokenAddress);
        auction_owner = msg.sender;
        auction_start = block.timestamp;
        auction_end = auction_start + _biddingTime * 1 hours;
        STATE = auction_state.STARTED;
        Mycar.Brand = _brand;
        Mycar.Rnumber = _Rnumber;
    }

    function get_owner() public view returns (address) {
        return auction_owner;
    }

    fallback() external payable {
        require(msg.value == 0, "You can't send 0 ether to this contract");
        require(token.transferFrom(msg.sender, address(this), msg.value), "You can't bid, you don't have enough tokens");
    }

    receive() external payable {
        require(msg.value == 0, "You can't send 0 ether to this contract");
        require(token.transferFrom(msg.sender, address(this), msg.value), "You can't bid, you don't have enough tokens");
    }

    function bid() public payable an_ongoing_auction override returns (bool) {

        require(bids[msg.sender] == 0, "You can't bid, you have already placed a bid");
        require(token.transferFrom(msg.sender, address(this), msg.value), "You can't bid, you don't have enough tokens");

        highestBidder = msg.sender;
        highestBid = msg.value;
        bidders.push(msg.sender);
        bids[msg.sender] = highestBid;
        emit BidEvent(highestBidder, highestBid);

        return true;
    }

    function cancel_auction() external only_owner an_ongoing_auction override returns (bool) {

        STATE = auction_state.CANCELLED;
        emit CanceledEvent("Auction Cancelled", block.timestamp);
        return true;
    }


    function destruct_auction() external only_owner returns (bool) {
        require(block.timestamp > auction_end || STATE == auction_state.CANCELLED, "You can't destruct the contract, The auction is still open");
        for (uint i = 0; i < bidders.length; i++) {
            if (bids[bidders[i]] > 0 && bidders[i] != highestBidder) {
                require(token.transfer(bidders[i], bids[bidders[i]]), "You can't destruct the contract, there was a problem transferring the tokens");
                emit WithdrawalEvent(bidders[i], bids[bidders[i]]);
                bids[bidders[i]] = 0;
            }
        }
        return true;
    }

    function withdraw() public override returns (bool) {

        require(block.timestamp > auction_end || STATE == auction_state.CANCELLED, "You can't withdraw, the auction is still open");
        require(bids[msg.sender] > 0, "You can't withdraw, you haven't placed a bid");

        token.transfer(msg.sender, bids[msg.sender]);
        emit WithdrawalEvent(msg.sender, bids[msg.sender]);
        bids[msg.sender] = 0;
        return true;
    }

    function ownerWithdraw() external only_owner returns (bool) {
        require(block.timestamp > auction_end, "You can't withdraw, the auction is still open");
        require(highestBid > 0, "There is no winning bid to withdraw");

        token.transfer(auction_owner, highestBid);
        emit WinningEvent(highestBidder, highestBid);
        return true;
    }
}
