const path = require('path');
const fs = require('fs');
const solc = require('solc');

const homeworkPath = path.resolve(__dirname, 'contracts', 'Tema.sol');
const source = fs.readFileSync(homeworkPath, 'utf8');

const input = {
    language: 'Solidity',
    sources: {
        'Tema.sol': {
            content: source,
        },
    },
    settings: {
        outputSelection: {
            '*': {
                '*': ['*'],
            },
        },
    },
};

// console.log(JSON.parse(solc.compile(JSON.stringify(input))).contracts["Tema.sol"])
module.exports = JSON.parse(solc.compile(JSON.stringify(input))).contracts["Tema.sol"] ;
