const { ethers } = require("hardhat");

async function main() {
    // Get the deployer account of contracts
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with the account:", deployer.address);

    // Deploy Funders Ring Contract
    const WatchersRingContract = await ethers.getContractFactory("WatchersRing");
    const watchersRingContract = await WatchersRingContract.deploy("http://d9grnqbmunyb9.cloudfront.net/GetRingId?RingId=");
    console.log("Funders Ring Contract Address:", watchersRingContract.address);

    // Deploy Funders Ring Minter Contract
    const WatchersRingMinterContract = await ethers.getContractFactory("WatchersRingMinter");
    const watchersRingMinterContract = await WatchersRingMinterContract.deploy(watchersRingContract.address);
    console.log("Watcher's Ring Minter Address:", watchersRingMinterContract.address);

    // Set primary minter
    let tx = await watchersRingContract.setMinter(watchersRingMinterContract.address);
    console.log(tx);
    let re = await tx.wait();
    console.log(re);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });