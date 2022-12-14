// contract test code will go here
const assert = require('assert');
const ganache = require('ganache-cli');
const truffleAssert = require('truffle-assertions');
const Web3 = require('web3');
const web3 = new Web3(ganache.provider())
const contracts = require('../compile')
let accounts;

let crowdfunding;
let sponsorFunding;
let distributeFunding;
let sponsorFundingInitialValue = 10000;
let sponsorFundingInitPercent = 20;

let crowdFundingGoal = 2000;


beforeEach(async () => {
    accounts = await web3.eth.getAccounts();

    // Deploy SponsorFunding
    let sponsorFundingAbi = contracts.SponsorFunding.abi;
    let sponsorFundingBytecode = contracts.SponsorFunding.evm.bytecode.object;
    sponsorFunding = await new web3.eth
        .Contract(sponsorFundingAbi)
        .deploy({
            data: sponsorFundingBytecode,
            arguments: [sponsorFundingInitPercent],
        })
        .send({from: accounts[0], gas: "1000000", value: sponsorFundingInitialValue})

    // Deploy DistributeFunding
    let distributeFundingAbi = contracts.DistributeFunding.abi;
    let distributeFundingBytecode = contracts.DistributeFunding.evm.bytecode.object;
    distributeFunding = await new web3.eth
        .Contract(distributeFundingAbi)
        .deploy({
            data: distributeFundingBytecode,
            arguments: []
        })
        .send({from: accounts[0], gas: "1000000"})

    // Deploy CrowdFunding
    let crowdfundingAbi = contracts.CrowdFunding.abi;
    let crowdfundingBytecode = contracts.CrowdFunding.evm.bytecode.object;
    let sponsorFundingAddress = sponsorFunding.options.address;
    let distributeFundingAddress = distributeFunding.options.address;
    crowdfunding = await new web3.eth
        .Contract(crowdfundingAbi)
        .deploy({
            data: crowdfundingBytecode,
            arguments: [crowdFundingGoal, sponsorFundingAddress, distributeFundingAddress]
        })
        .send({from: accounts[0], gas: "1000000"})

    distributeFunding.methods.setCrowdFundingAddr(crowdfunding.options.address).send({
        from: accounts[0],
        gas: "1000000",
    })

    sponsorFunding.methods.setCrowdFundingAddress(crowdfunding.options.address).send({
        from: accounts[0],
        gas: "1000000",
    })

    distributeFunding.methods.addBeneficiary(10, accounts[2]).send({
        from: accounts[0],
        gas: "1000000"
    })

    distributeFunding.methods.addBeneficiary(50, accounts[3]).send({
        from: accounts[0],
        gas: "1000000"
    })
})

describe('Tema', function () {
    it('should deploy the contracts', function () {
        assert.ok(crowdfunding.options.address)
        assert.ok(sponsorFunding.options.address)
        assert.ok(distributeFunding.options.address)
    });

    describe('SponsorFunding', function () {
        it('should have the correct balance', async function () {
            const balance = await sponsorFunding.methods.getBalance().call();
            assert.equal(balance, sponsorFundingInitialValue)
        });

        it('should let the owner deposit money', async function () {
            let addedValue = 1000;
            await sponsorFunding.methods.deposit().send({
                    from: accounts[0],
                    gas: "1000000",
                    value: addedValue
                }
            );
            const balance = await sponsorFunding.methods.getBalance().call();
            assert.equal(balance, sponsorFundingInitialValue + addedValue)
        });

        it('should not let the other person  deposit money', async function () {
            let addedValue = 1000;
            await truffleAssert.reverts(
                sponsorFunding.methods.deposit().send({
                    from: accounts[1],
                    gas: "1000000",
                    value: addedValue
                }), "you are not the owner");
        });

        it('should let the owner set a new percent', async function () {
            let desiredPercent = 30;
            await sponsorFunding.methods.setPercent(desiredPercent).send({
                    from: accounts[0],
                    gas: "1000000",
                }
            );
            const actualPercent = await sponsorFunding.methods.percent().call();
            assert.equal(actualPercent, desiredPercent)
        });

        it('should not let the other person a new  set percent', async function () {
            let desiredPercent = 30;
            await truffleAssert.reverts(
                sponsorFunding.methods.setPercent(desiredPercent).send({
                    from: accounts[1],
                    gas: "1000000",
                }), "revert");
        });
    })
    describe("End To End", async function () {
        it('should reach the target of crowd funding , get the money from the sponsor and transfer the money to DistributeFunding', async function () {
            let percent = await sponsorFunding.methods.percent().call();

            await crowdfunding.methods.deposit().send({
                from: accounts[1],
                gas: "1000000",
                value: crowdFundingGoal + 100
            })
            let state = await crowdfunding.methods.state().call();
            let crowdFundingBalance = await crowdfunding.methods.getBalance().call()
            assert(1, state)
            assert(crowdFundingGoal, crowdFundingBalance)
            await crowdfunding.methods.askForSponsorship().send({
                from: accounts[0],
                gas: "1000000",
            })
            let stateAfterSponsorship = await crowdfunding.methods.state().call();
            let crowdFundingBalanceAfterSponsorship = await crowdfunding.methods.getBalance().call()
            let toTransfer = (crowdFundingGoal * percent) / 100;
            assert(2, stateAfterSponsorship)
            assert(crowdFundingGoal + toTransfer, crowdFundingBalanceAfterSponsorship)


            await crowdfunding.methods.sendToDistributeFunding().send({
                from: accounts[0],
                gas: "1000000",
            })
            let stateFinal = await crowdfunding.methods.state().call();
            let crowdFundingFinal = await crowdfunding.methods.getBalance().call()
            assert(3, stateFinal)
            assert("0", crowdFundingFinal)

            let distributeFundingBalance = await distributeFunding.methods.getBalance().call();
            assert.equal(distributeFundingBalance, crowdFundingGoal + toTransfer)


            await distributeFunding.methods.withdraw().send({
                from: accounts[2],
                gas: "1000000"
            })
            let accountBalance2 = await web3.eth.getBalance(accounts[2]);
            assert.equal(accountBalance2.substring(accountBalance2.length - 3, accountBalance2.length), 240)


            await distributeFunding.methods.withdraw().send({
                from: accounts[3],
                gas: "1000000"
            })
            let accountBalance3 = await web3.eth.getBalance(accounts[3]);
            assert.equal(accountBalance3.substring(accountBalance3.length - 4, accountBalance3.length), 1200)
        });

        it('should reach the target of crowd funding and transfer the money to DistributeFunding', async function () {
            sponsorFunding.methods.withdraw(sponsorFundingInitialValue).send({
                from: accounts[0],
                gas: "1000000",
            })
            await crowdfunding.methods.deposit().send({
                from: accounts[1],
                gas: "1000000",
                value: crowdFundingGoal + 100
            })
            let state = await crowdfunding.methods.state().call();
            let crowdFundingBalance = await crowdfunding.methods.getBalance().call()
            assert(1, state)
            assert(crowdFundingGoal, crowdFundingBalance)
            await crowdfunding.methods.askForSponsorship().send({
                from: accounts[0],
                gas: "1000000",
            })
            let stateAfterSponsorship = await crowdfunding.methods.state().call();
            let crowdFundingBalanceAfterSponsorship = await crowdfunding.methods.getBalance().call()
            let toTransfer = 0;
            assert(2, stateAfterSponsorship)
            assert(crowdFundingGoal + toTransfer, crowdFundingBalanceAfterSponsorship);


            await crowdfunding.methods.sendToDistributeFunding().send({
                from: accounts[0],
                gas: "1000000",
            })
            let stateFinal = await crowdfunding.methods.state().call();
            let crowdFundingFinal = await crowdfunding.methods.getBalance().call()
            assert(3, stateFinal)
            assert("0", crowdFundingFinal)

            let distributeFundingBalance = await distributeFunding.methods.getBalance().call();
            assert.equal(distributeFundingBalance, crowdFundingGoal + toTransfer);
        })
    })
})