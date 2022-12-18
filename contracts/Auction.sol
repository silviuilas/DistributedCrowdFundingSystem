// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "./SampleToken.sol";

contract Auction {

    address internal auction_owner;
    uint256 public auction_start;
    uint256 public auction_end;
    uint256 public highestBid;
    address public highestBidder;

    enum auction_state{
        CANCELLED, STARTED
    }

    struct car {
        string Brand;
        string Rnumber;
    }

    car public Mycar;
    address[] bidders;

    mapping(address => uint) public bids;

    auction_state public STATE;

    SampleToken public token;

    modifier an_ongoing_auction() {
        require(block.timestamp <= auction_end && STATE == auction_state.STARTED, "Auction has finished");
        _;
    }

    modifier only_owner() {
        require(msg.sender == auction_owner, "MyAuction: caller is not owner");
        _;
    }

    function bid() public virtual payable returns (bool) {}

    function withdraw() public virtual returns (bool) {}

    function cancel_auction() external virtual returns (bool) {}

    event BidEvent(address indexed highestBidder, uint256 highestBid);
    event WithdrawalEvent(address withdrawer, uint256 amount);
    event CanceledEvent(string message, uint256 time);
    event WinningEvent(address indexed winningBidder, uint256 winningBid);
}
