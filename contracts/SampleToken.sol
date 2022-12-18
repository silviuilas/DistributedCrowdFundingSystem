pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/math/SafeMath.sol";

contract SampleToken {
    using SafeMath for uint256;

    string public name = "Sample Token";
    string public symbol = "TOK";
    uint8 public decimals = 18;
    uint256 public totalSupply;
    address public owner;


    event Transfer(address indexed _from, address indexed _to, uint256 _value);
    event Approval(address indexed _owner, address indexed _spender, uint256 _value);

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    constructor (uint256 _initialSupply) {
        owner = msg.sender;
        balanceOf[msg.sender] = _initialSupply;
        totalSupply = _initialSupply;
        emit Transfer(address(0), msg.sender, totalSupply);
    }

    function transfer(address _to, uint256 _value) public returns (bool success){
        require(_to != address(0), "transfer to the zero address");
        require(balanceOf[msg.sender] >= _value);

        emit Transfer(msg.sender, _to, _value);
        balanceOf[msg.sender] -= _value;
        balanceOf[_to] += _value;
        return true;
    }

    function transferFrom(address _from, address _to, uint256 _value) public returns (bool success) {
        require(_value <= balanceOf[_from], "transfer amount exceeds balance");
        require(_value <= allowance[_from][msg.sender], "transfer amount exceeds allowance");

        emit Transfer(_from, _to, _value);
        balanceOf[_from] -= _value;
        balanceOf[_to] += _value;
        allowance[_from][msg.sender] -= _value;
        return true;
    }

    function approve(address _spender, uint256 _value) public returns (bool success) {
        emit Approval(msg.sender, _spender, _value);
        allowance[msg.sender][_spender] = _value;
        return true;
    }

    function decreaseAllowance(address _spender, uint256 _value) public {
        require(_value <= allowance[msg.sender][_spender]);

        emit Approval(msg.sender, _spender, allowance[msg.sender][_spender].sub(_value));
        allowance[msg.sender][_spender] -= _value;
    }

    function increaseAllowance(address _spender, uint256 _value) public {
        emit Approval(msg.sender, _spender, allowance[msg.sender][_spender].add(_value));
        allowance[msg.sender][_spender] += _value;
    }

    function mint(uint256 _value) public {
        require(msg.sender == owner, "SampleTokenSale: caller is not owner");

        totalSupply = totalSupply.add(_value);
        balanceOf[owner] = balanceOf[owner].add(_value);
        allowance[owner][address(this)] = allowance[owner][address(this)].add(_value); //TODO check it out
    }
}

