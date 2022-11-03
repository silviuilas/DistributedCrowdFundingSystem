contract CrowdFunding {
    uint public state;
    uint public fundingGoalTarget;
    mapping(address => uint) balance;
    address payable private sponsorFundingAddress;
    address payable private distributeFundingAddress;
    address private ownerAddress;

    constructor (uint _fundingGoalTarget, address  payable _sponsorFundingAddress, address payable _distributeFundingAddress) {
        fundingGoalTarget = _fundingGoalTarget;
        sponsorFundingAddress = payable(_sponsorFundingAddress);
        distributeFundingAddress = payable(_distributeFundingAddress);
        ownerAddress = msg.sender;
    }

    modifier onlyByOwner()  {
        require(msg.sender == ownerAddress);
        _;
    }

    function deposit() external payable {
        if (state == 0) {
            balance[msg.sender] += msg.value;
            if (address(this).balance >= fundingGoalTarget) {
                address payable user = payable(msg.sender);
                uint amount = address(this).balance - fundingGoalTarget;
                user.transfer(amount);
                state = 1;
            }
        } else {
            revert("not in non-financed state");
        }
    }

    function withdraw(uint amount) external {
        require(state == 0);
        address payable user = payable(msg.sender);
        require(amount <= balance[user]);
        balance[user] = balance[user] - amount;
        user.transfer(amount);
    }

    receive() external payable {}

    function getBalance() external view returns (uint) {
        return address(this).balance;
    }

    function askForSponsorship() onlyByOwner() public {
        SponsorFunding sponsor = SponsorFunding(sponsorFundingAddress);
        sponsor.sponsorCrowdFunding();
    }

    function sendToDistributeFunding() onlyByOwner() public {
        require(state == 2);
        DistributeFunding distributeFunding = DistributeFunding(distributeFundingAddress);
        payable(distributeFundingAddress).transfer(address(this).balance);
        distributeFunding.deposit();
        state = 3;
    }

    function sponsorDeposit() external {
        if (state == 1) {
            if (sponsorFundingAddress == msg.sender) {
                state = 2;
            } else {
                revert("you are not the sponsor");
            }
        } else {
            revert("not in pre-financed state");
        }
    }
}

contract SponsorFunding {

    address private ownerAddress;
    uint public percent;
    address payable crowdFundingAddress;

    constructor (uint initPercent) payable {
        ownerAddress = msg.sender;
        percent = initPercent;
    }

    modifier onlyByOwner()  {
        require(msg.sender == ownerAddress);
        _;
    }

    function setCrowdFundingAddress(address payable _crowdFundingAddress)  onlyByOwner() public {
        crowdFundingAddress = _crowdFundingAddress;
    }

    function deposit() external payable {
        if (msg.sender != ownerAddress) {
            revert("you are not the owner");
        }
    }

    function withdraw(uint amount) onlyByOwner() external {
        address payable user = payable(msg.sender);
        require(amount <= address(this).balance);
        user.transfer(amount);
    }

    function setPercent(uint newPercent) onlyByOwner() external {
        percent = newPercent;
    }

    function getBalance() external view returns (uint) {
        return address(this).balance;
    }

    function sponsorCrowdFunding() external {
        require(crowdFundingAddress == msg.sender);
        CrowdFunding crowdFunding = CrowdFunding(crowdFundingAddress);
        if (crowdFunding.fundingGoalTarget() == crowdFundingAddress.balance) {
            uint toTransfer = (crowdFunding.fundingGoalTarget() * percent) / 100;
            require(toTransfer <= address(this).balance);
            crowdFundingAddress.transfer(toTransfer);
            crowdFunding.sponsorDeposit();
        }
    }
}

contract DistributeFunding {

    address private ownerAddress;
    address crowdFundingAddr;
    mapping(address => Beneficiary) beneficiaries;
    uint totalPercent = 0;
    uint moneyReceived;

    bool receivedFunding = false;

    event receivedFunds(address, uint);
    event withdrawnFunds(address, uint, uint);

    constructor () payable {
        ownerAddress = msg.sender;
    }

    struct Beneficiary {
        uint percent;
        bool hasWithdrawn;
    }

    receive() payable external {
        emit receivedFunds(msg.sender, msg.value);
    }

    function deposit() public payable {
        require(msg.sender == crowdFundingAddr, "Only CrowdFundingContract can send funded sum.");
        receivedFunding = true;
        moneyReceived = address(this).balance;
    }

    function withdraw() external {
        require(receivedFunding == true, "Funding not received yet");
        require(beneficiaries[msg.sender].percent > 0, "No beneficiary related to this address");
        require(beneficiaries[msg.sender].hasWithdrawn == false, "This beneficiary already withdrew his share");
        uint percent = beneficiaries[msg.sender].percent;
        beneficiaries[msg.sender].hasWithdrawn = true;
        uint transferSum = (moneyReceived * percent) / 100;
        address payable beneficiary = payable(msg.sender);
        beneficiary.transfer(transferSum);
        emit withdrawnFunds(msg.sender, transferSum, percent);
    }

    function setCrowdFundingAddr(address _crowdFundingAddr) onlyByOwner() public {
        crowdFundingAddr = _crowdFundingAddr;
    }

    function getBalance() view public returns (uint) {
        return address(this).balance;
    }

    function getBeneficiaryPercent() view public returns (uint) {
        return beneficiaries[msg.sender].percent;
    }

    modifier onlyByOwner()  {
        require(msg.sender == ownerAddress);
        _;
    }

    function addBeneficiary(uint percent, address beneficiary) onlyByOwner() public {
        require(percent > 0, "0% not accepted");
        require(totalPercent + percent <= 100, "Given percent is higher than the available percentage.");
        totalPercent += percent;
        beneficiaries[beneficiary].percent = percent;
        beneficiaries[beneficiary].hasWithdrawn = false;
    }

}