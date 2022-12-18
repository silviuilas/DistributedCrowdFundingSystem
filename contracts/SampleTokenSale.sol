pragma solidity ^0.8.17;

import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "./SampleToken.sol";

contract SampleTokenSale {
    using SafeMath for uint256;

    SampleToken public tokenContract;
    uint256 public tokenPrice;
    address public owner;

    uint256 public tokensSold;

    event Sell(address indexed _buyer, uint256 indexed _amount);
    event RefundExcess(address indexed _buyer, uint256 _amount);

    constructor(SampleToken _tokenContract, uint256 _tokenPrice) {
        owner = msg.sender;
        tokenContract = _tokenContract;
        tokenPrice = _tokenPrice;
    }

    function buyTokens(uint256 _numberOfTokens) public payable {
        require(_numberOfTokens * tokenPrice <= msg.value, "SampleTokenSale: incorrect price");
        require(tokenContract.allowance(owner, address(this)) >= _numberOfTokens, "SampleTokenSale: contract has insufficient balance");

        tokenContract.transferFrom(owner, msg.sender, _numberOfTokens);

        uint256 excess = msg.value.sub(_numberOfTokens.mul(tokenPrice));
        if (excess > 0) {
            payable(msg.sender).transfer(excess);
            emit RefundExcess(msg.sender, excess);
        }

        emit Sell(msg.sender, _numberOfTokens);
        tokensSold += _numberOfTokens;
    }

    function updatePrice(uint256 _newPrice) public {
        require(msg.sender == owner, "SampleTokenSale: caller is not owner");
        tokenPrice = _newPrice;
    }

    function endSale() public {
        require(msg.sender == owner, "SampleTokenSale: caller is not owner");
        payable(owner).transfer(address(this).balance);
    }
}
