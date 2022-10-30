const HDWalletProvider = require('@truffle/hdwallet-provider')
const Web3 = require('web3');
const {interface, bytecode} = require('./compile')

const provider = new HDWalletProvider(
    'insect anxiety razor rain coin essay actor snake dutch pet copper clinic',
    'https://goerli.infura.io/v3/d47f2a6bf6ef483b8e2fc6e7319a293e'
)

const web3 = new Web3(provider)

const deploy = async () => {
    const accounts = await web3.eth.getAccounts();
    console.log('Attempting to deploy from account', accounts[0]);

    const result = await new web3.eth
        .Contract(JSON.parse(interface))
        .deploy({data: bytecode, arguments: ['Hi there!']})
        .send({gas: '1000000', from: accounts[0]})

    console.log('Contract deployed to', result.options.address)
    provider.engine.stop()
}

deploy();
