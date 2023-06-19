const { ethers } = require("hardhat");

async function main() {
    // Get the deployer account of contracts
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with the account:", deployer.address);

    // Deploy Funders Ring Contract
    const FundersRingContract = await ethers.getContractFactory("FundersRing");
    const fundersRingContract = await FundersRingContract.deploy("http://d9grnqbmunyb9.cloudfront.net/GetPlotId?PlotId=");
    console.log('Funders Ring Contract Address:', fundersRingContract.address);

    // Deploy Funders Ring Minter Contract
    const FundersRingMinterContract = await ethers.getContractFactory("RingMinter");
    const fundersRingMinterContract = await FundersRingMinterContract.deploy(fundersRingContract.address);
    console.log('Funders Ring Minter Address:', fundersRingMinterContract.address);

    // Set primary minter
    let tx = await fundersRingContract.setPrimaryMinter(fundersRingMinterContract.address);
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