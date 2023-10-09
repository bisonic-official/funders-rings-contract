# WatchersRing Contracts 📃

This repository contains some explorations of the RuniverseItem contract deployed to the Ethereum Network.

## Setup

1. Clone this repository
2. Install dependencies:
    - NPM Dependencies: `npm install`
    - Python dependencies: `pip install -r requirements.txt`

### Deploying the WatchersRing and WatchersRingMinter Contracts to Goerli

1. Add your `GOERLI_PRIVATE_KEY` in `hardhat.config.js`.
2. Run `npx hardhat compile` to compile the contracts.
3. Run `npx hardhat run scripts/deploy.js --network goerli` to deploy the contract to Goerli.
4. Once the contract is deployed, copy the address of the contract and paste it in the ´[contract]´ section of the `config.ini` file.

### Running the Python Scripts

#### Run Contract setup

1. Add your `api_key` in the `config.ini` file. Fill missing fields with the information of your choice.
2. Set the values in the `contract_setup.py` script in order to specify the vault address as well as the ring price.
2. Run `python contract_setup.py` to run the script and set the watcher's ring contracts.