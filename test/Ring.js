const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("🔥 Contract deployment", function () {
    it("Deployment should verify name and symbol", async function () {
        const FundersRing = await ethers.getContractFactory("FundersRing");
        const contract = await FundersRing.deploy("http://d9grnqbmunyb9.cloudfront.net/GetPlotId?PlotId=");

        expect(await contract.name()).to.equal("FundersRing");
        expect(await contract.symbol()).to.equal("FR");
    });
});