const { expect } = require("chai");
const { ethers } = require("hardhat");


describe("🔥 Contract deployment test", function () {
    it("Deployment should verify name and symbol", async function () {
        const FundersRing = await ethers.getContractFactory("FundersRing");
        const contract = await FundersRing.deploy("http://d9grnqbmunyb9.cloudfront.net/GetPlotId?PlotId=");

        expect(await contract.name()).to.equal("FundersRing");
        expect(await contract.symbol()).to.equal("FR");
    });

    it("Deployment should work for contract and minter", async function () {
        const [owner] = await ethers.getSigners();

        const FundersRing = await ethers.getContractFactory("FundersRing");
        const fundersRing = await FundersRing.deploy("http://d9grnqbmunyb9.cloudfront.net/GetPlotId?PlotId=");

        const FundersRingMinter = await ethers.getContractFactory("FundersRingMinter");
        const fundersRingMinter = await FundersRingMinter.deploy(fundersRing.address);
        fundersRing.setMinter(fundersRingMinter.address);

    });
});


describe("🔥 Test getters and setters", function () {
    it("All the getters and setters should work", async function () {
        const [owner] = await ethers.getSigners();

        const FundersRing = await ethers.getContractFactory("FundersRing");
        const fundersRing = await FundersRing.deploy("http://d9grnqbmunyb9.cloudfront.net/GetPlotId?PlotId=");

        const FundersRingMinter = await ethers.getContractFactory("FundersRingMinter");
        const fundersRingMinter = await FundersRingMinter.deploy(fundersRing.address);
        fundersRing.setMinter(owner.address);

        const lessProbabilities = [100, 200];
        await expect(fundersRingMinter.setProbabilities(lessProbabilities)).to.be.revertedWithCustomError(fundersRingMinter, "GivenValuesNotValid");
        const badProbabilities = [10, 10, 10, 10, 10, 10, 10, 10];
        await expect(fundersRingMinter.setProbabilities(badProbabilities)).to.be.revertedWithCustomError(fundersRingMinter, "GivenValuesNotValid");
        const newProbabilities = [1, 1, 1, 1, 1, 1, 1, 93];
        await fundersRingMinter.setProbabilities(newProbabilities);
        expect(await fundersRingMinter.getProbabilities()).to.deep.equal(newProbabilities);

        const ringPrice = ethers.utils.parseEther("0.01");
        const ringsAvailable = ethers.BigNumber.from("10000");
        const mintClaimStartTime = ethers.BigNumber.from("100");
        const mintListStartTime = ethers.BigNumber.from("200");
        const mintStartTime = ethers.BigNumber.from("300");

        await fundersRingMinter.setPrice(ringPrice);
        await fundersRingMinter.setPublicMintStartTime(mintStartTime);
        await fundersRingMinter.setMintlistStartTime(mintListStartTime);
        await fundersRingMinter.setClaimsStartTime(mintClaimStartTime);

        // Big numbers problem
        expect(await fundersRingMinter.getRingPrice()).to.deep.equal(ringPrice);
        expect(await fundersRingMinter.getInitialRings()).to.deep.equal(ringsAvailable);
        expect(await fundersRingMinter.getAvailableRings()).to.deep.equal(ringsAvailable);

        expect(await fundersRingMinter.publicMintStartTime()).to.deep.equal(mintStartTime);
        expect(await fundersRingMinter.mintlistStartTime()).to.deep.equal(mintListStartTime);
        expect(await fundersRingMinter.claimsStartTime()).to.deep.equal(mintClaimStartTime);

    });
});


describe("🔥 Mint test", function () {
    it("Test single mints + withdrawal functions", async function () {
        const [owner] = await ethers.getSigners();

        const FundersRing = await ethers.getContractFactory("FundersRing");
        const fundersRing = await FundersRing.deploy("http://d9grnqbmunyb9.cloudfront.net/GetPlotId?PlotId=");

        const FundersRingMinter = await ethers.getContractFactory("FundersRingMinter");
        const fundersRingMinter = await FundersRingMinter.deploy(fundersRing.address);
        fundersRing.setMinter(fundersRingMinter.address);

        // Set available rings
        await fundersRingMinter.setRingsAvailable(200);
        const availableRings = await fundersRingMinter.getInitialRings();
        expect(availableRings).to.deep.equal(200);

        const ringPrice = ethers.utils.parseEther("0.01");
        const mintClaimStartTime = ethers.BigNumber.from("0");
        const mintListStartTime = ethers.BigNumber.from("0");
        const mintStartTime = ethers.BigNumber.from("0");

        const blockNumBefore = await ethers.provider.getBlockNumber();
        const blockBefore = await ethers.provider.getBlock(blockNumBefore);
        const startPublicSale = blockBefore.timestamp + 1000;

        await fundersRingMinter.setPrice(ringPrice);
        await fundersRingMinter.setPublicMintStartTime(startPublicSale);
        await fundersRingMinter.setMintlistStartTime(mintListStartTime);
        await fundersRingMinter.setClaimsStartTime(mintClaimStartTime);

        await expect(fundersRingMinter.mint(1, { value: ethers.utils.parseEther("0.01") })).to.be.revertedWithCustomError(fundersRingMinter, "WrongDateForProcess");
        await fundersRingMinter.setPublicMintStartTime(mintStartTime);
        await expect(fundersRingMinter.mint(1, { value: ethers.utils.parseEther("0.02") })).to.be.revertedWith("Ether value sent is not accurate.");
        await fundersRingMinter.mint(1, { value: ethers.utils.parseEther("0.01") });
        await fundersRingMinter.mint(20, { value: ethers.utils.parseEther("0.20") });
        await fundersRingMinter.mint(20, { value: ethers.utils.parseEther("0.20") });
        await fundersRingMinter.mint(20, { value: ethers.utils.parseEther("0.20") });
        await fundersRingMinter.mint(20, { value: ethers.utils.parseEther("0.20") });
        await fundersRingMinter.mint(20, { value: ethers.utils.parseEther("0.20") });
        await expect(fundersRingMinter.mint(21, { value: ethers.utils.parseEther("0.21") })).to.be.revertedWithCustomError(fundersRingMinter, "IncorrectPurchaseLimit");

        // Search for events to know minted rings
        const sentLogs = await fundersRing.queryFilter(
            fundersRing.filters.Transfer(owner.address, null),
        );
        const receivedLogs = await fundersRing.queryFilter(
            fundersRing.filters.Transfer(null, owner.address),
        );
        const logs = sentLogs.concat(receivedLogs)
            .sort(
                (a, b) =>
                    a.blockNumber - b.blockNumber ||
                    a.transactionIndex - b.TransactionIndex,
            );
        const owned = new Set();
        for (const log of logs) {
            const { tokenId } = log.args;
            owned.add(tokenId.toString());
        }
        const tokenIds = Array.from(owned);
        expect((await fundersRingMinter.getTokenIdRingType(tokenIds[0]))).to.lessThan(101);
        console.log("Distribution of rings minted by type (101 rings):");
        console.log(await fundersRingMinter.getTotalMintedRingsByType());

        // Withdraw test
        var beforeWithdraw = await fundersRingMinter.provider.getBalance(owner.address);
        var withdrawEther = ethers.utils.parseEther("0.01");
        var transactionWhithdraw = await fundersRingMinter.withdraw(ethers.utils.parseEther("0.01"));
        var receiptWithdraw = await transactionWhithdraw.wait();
        var expectedWithdrawEther = beforeWithdraw.add(withdrawEther.sub(receiptWithdraw.cumulativeGasUsed.mul(receiptWithdraw.effectiveGasPrice)));

        expect(await fundersRingMinter.provider.getBalance(owner.address)).to.equal(expectedWithdrawEther);

        // Withdraw all test
        var beforeWithdrawAll = await fundersRingMinter.provider.getBalance(owner.address);
        var withdrawAllEther = await fundersRingMinter.provider.getBalance(fundersRingMinter.address);
        var transactionWithdrawAll = await fundersRingMinter.withdrawAll();
        var receiptWithdrawAll = await transactionWithdrawAll.wait();
        var expectedWithdrawAllEther = beforeWithdrawAll.add(withdrawAllEther.sub(receiptWithdrawAll.cumulativeGasUsed.mul(receiptWithdrawAll.effectiveGasPrice)));

        expect(await fundersRingMinter.provider.getBalance(owner.address)).to.equal(expectedWithdrawAllEther);
        expect(await fundersRingMinter.provider.getBalance(fundersRingMinter.address)).to.equal(mintClaimStartTime);

        await fundersRing.withdrawAll();

        // So far, 101 rings have been minted
        const totalSupply = await fundersRing.totalSupply();
        expect(totalSupply).to.equal(101);
    });

    it("Test free mints + claim with mint functions", async function () {
        const [owner] = await ethers.getSigners();

        const FundersRing = await ethers.getContractFactory("FundersRing");
        const fundersRing = await FundersRing.deploy("http://d9grnqbmunyb9.cloudfront.net/GetPlotId?PlotId=");

        const FundersRingMinter = await ethers.getContractFactory("FundersRingMinter");
        const fundersRingMinter = await FundersRingMinter.deploy(fundersRing.address);
        fundersRing.setMinter(fundersRingMinter.address);

        const ringPrice = ethers.utils.parseEther("0.01");
        const mintClaimStartTime = ethers.BigNumber.from("0");
        const mintListStartTime = ethers.BigNumber.from("0");
        const mintStartTime = ethers.BigNumber.from("0");

        const blockNumBefore = await ethers.provider.getBlockNumber();
        const blockBefore = await ethers.provider.getBlock(blockNumBefore);
        const startPublicSale = blockBefore.timestamp + 1000;

        await fundersRingMinter.setPrice(ringPrice);
        await fundersRingMinter.setPublicMintStartTime(startPublicSale);
        await fundersRingMinter.setMintlistStartTime(mintListStartTime);
        await fundersRingMinter.setClaimsStartTime(mintClaimStartTime);
        await fundersRingMinter.setPublicMintStartTime(mintStartTime);

        await expect(fundersRingMinter.mintWithClaim(2, 3, [
            "0x3f763845cf8fc1ce980db962b636d70e50d0821cd1108b59d6f31730ea49dc69"
        ], { value: ethers.utils.parseEther("0.01") })).to.be.revertedWith("Ether value sent is not accurate.");
    });
});

describe("🔥 URI test", function () {
    it("URI should work", async function () {
        const [owner] = await ethers.getSigners();

        const FundersRing = await ethers.getContractFactory("FundersRing");
        const fundersRing = await FundersRing.deploy("http://d9grnqbmunyb9.cloudfront.net/GetPlotId?PlotId=");

        const FundersRingMinter = await ethers.getContractFactory("FundersRingMinter");
        const fundersRingMinter = await FundersRingMinter.deploy(fundersRing.address);
        fundersRing.setMinter(fundersRingMinter.address);

        const tokenId = ethers.BigNumber.from("1099511628032");
        const tokenBad = ethers.BigNumber.from("0");

        await fundersRingMinter.ownerMint([0], [owner.address]);

        const tokenUri_0 = await fundersRing.tokenURI(tokenId);
        await expect(tokenUri_0).to.be.equal("http://d9grnqbmunyb9.cloudfront.net/GetPlotId?PlotId=1099511628032");
        await fundersRing.setBaseURI("https://api.runiverse.world/GetPlotInfo?PlotId=")

        const tokenUri_1 = await fundersRing.tokenURI(tokenId);
        await expect(tokenUri_1).to.be.equal("https://api.runiverse.world/GetPlotInfo?PlotId=1099511628032");

        await expect(tokenUri_1).to.be.equal("https://api.runiverse.world/GetPlotInfo?PlotId=1099511628032");
        await expect(fundersRing.tokenURI(tokenBad)).to.be.revertedWith("ERC721Metadata: URI query for nonexistent token");

    });
});

describe("🔥 Offsets test", function () {
    it("Local and global offsets should work", async function () {
        const [owner] = await ethers.getSigners();

        const FundersRing = await ethers.getContractFactory("FundersRing");
        const fundersRing = await FundersRing.deploy("http://d9grnqbmunyb9.cloudfront.net/GetPlotId?PlotId=");

        const FundersRingMinter = await ethers.getContractFactory("FundersRingMinter");
        const fundersRingMinter = await FundersRingMinter.deploy(fundersRing.address);
        fundersRing.setMinter(fundersRingMinter.address);

        const tokenId = ethers.BigNumber.from("5497558140672");

        await fundersRingMinter.setGlobalIdOffset(5);
        await fundersRingMinter.setLocalIdOffsets([7, 3, 3, 3, 3, 3, 3, 3]);
        await fundersRingMinter.ownerMint([0], [owner.address]);

        await expect(await fundersRing.exists(tokenId)).to.be.equal(true);

        expect(await fundersRingMinter.ringGlobalOffset()).to.be.equal(5);
        expect(await fundersRingMinter.ringTypeLocalOffset(0)).to.be.equal(7);
        expect(await fundersRingMinter.ringTypeLocalOffset(1)).to.be.equal(3);
        expect(await fundersRingMinter.ringTypeLocalOffset(2)).to.be.equal(3);
        expect(await fundersRingMinter.ringTypeLocalOffset(3)).to.be.equal(3);
        expect(await fundersRingMinter.ringTypeLocalOffset(4)).to.be.equal(3);
        expect(await fundersRingMinter.ringTypeLocalOffset(5)).to.be.equal(3);
        expect(await fundersRingMinter.ringTypeLocalOffset(6)).to.be.equal(3);
        expect(await fundersRingMinter.ringTypeLocalOffset(7)).to.be.equal(3);
    });
});

describe("🔥 Start times test", function () {
    it("Start times for public, mint list and claim list should work.", async function () {
        const [owner] = await ethers.getSigners();

        const FundersRing = await ethers.getContractFactory("FundersRing");
        const fundersRing = await FundersRing.deploy("http://d9grnqbmunyb9.cloudfront.net/GetPlotId?PlotId=");

        const FundersRingMinter = await ethers.getContractFactory("FundersRingMinter");
        const fundersRingMinter = await FundersRingMinter.deploy(fundersRing.address);
        fundersRing.setMinter(fundersRingMinter.address);

        const ringPrice = ethers.utils.parseEther("0.01");
        const ringsAvailable = ethers.BigNumber.from("10000");

        await fundersRingMinter.setPrice(ringPrice);

        // Public test
        const blockNumBeforePublic = await ethers.provider.getBlockNumber();
        const blockBeforePublic = await ethers.provider.getBlock(blockNumBeforePublic);
        const beforeTimePublic = blockBeforePublic.timestamp + 5;
        const currentTimePublic = blockBeforePublic.timestamp + 10;
        const afterTimePublic = blockBeforePublic.timestamp + 15;

        await fundersRingMinter.setPublicMintStartTime(currentTimePublic);


        await ethers.provider.send("evm_mine", [beforeTimePublic]);
        await expect(await fundersRingMinter.publicStarted()).to.be.equal(false);
        await ethers.provider.send("evm_mine", [afterTimePublic]);
        await expect(await fundersRingMinter.publicStarted()).to.be.equal(true);

        // Mint test
        const blockNumBeforeMintList = await ethers.provider.getBlockNumber();
        const blockBeforeMintList = await ethers.provider.getBlock(blockNumBeforeMintList);
        const beforeTimeMintList = blockBeforeMintList.timestamp + 5;
        const currentTimeMintList = blockBeforeMintList.timestamp + 10;
        const afterTimeMintList = blockBeforeMintList.timestamp + 15;

        await fundersRingMinter.setMintlistStartTime(currentTimeMintList);


        await ethers.provider.send("evm_mine", [beforeTimeMintList]);
        await expect(await fundersRingMinter.mintlistStarted()).to.be.equal(false);
        await ethers.provider.send("evm_mine", [afterTimeMintList]);
        await expect(await fundersRingMinter.mintlistStarted()).to.be.equal(true);

        // Claim test
        const blockNumBeforeClaimList = await ethers.provider.getBlockNumber();
        const blockBeforeClaimList = await ethers.provider.getBlock(blockNumBeforeClaimList);
        const beforeTimeClaimList = blockBeforeClaimList.timestamp + 5;
        const currentTimeClaimList = blockBeforeClaimList.timestamp + 10;
        const afterTimeClaimList = blockBeforeClaimList.timestamp + 15;

        await fundersRingMinter.setClaimsStartTime(currentTimeClaimList);


        await ethers.provider.send("evm_mine", [beforeTimeClaimList]);
        await expect(await fundersRingMinter.claimsStarted()).to.be.equal(false);
        await ethers.provider.send("evm_mine", [afterTimeClaimList]);
        await expect(await fundersRingMinter.claimsStarted()).to.be.equal(true);
    });
});

describe("🔥 Whitelist test", function () {
    it("Whitelist should work", async function () {
        const [owner] = await ethers.getSigners();

        const FundersRing = await ethers.getContractFactory("FundersRing");
        const fundersRing = await FundersRing.deploy("http://d9grnqbmunyb9.cloudfront.net/GetPlotId?PlotId=");

        const FundersRingMinter = await ethers.getContractFactory("FundersRingMinter");
        const fundersRingMinter = await FundersRingMinter.deploy(fundersRing.address);
        fundersRing.setMinter(fundersRingMinter.address);

        const ringPrice = ethers.utils.parseEther("0.01");
        const ringsAvailable = ethers.BigNumber.from("10000");
        const mintClaimStartTime = ethers.BigNumber.from("0");
        const mintListStartTime = ethers.BigNumber.from("0");
        const mintListFarTime = ethers.BigNumber.from("999999999999999");
        const mintStartTime = ethers.BigNumber.from("0");

        await fundersRingMinter.setPrice(ringPrice);
        await fundersRingMinter.setPublicMintStartTime(mintStartTime);
        await fundersRingMinter.setMintlistStartTime(mintListFarTime);
        await fundersRingMinter.setClaimsStartTime(mintClaimStartTime);

        // Mint list has not started
        await expect(fundersRingMinter.mintlistMint(1, 2, ["0x57c6ff6eaab36a7f1f87867ec8b2276e9b01ed576e56485d2c89535038c94865"], { value: ethers.utils.parseEther("0.01") })).to.be.revertedWithCustomError(fundersRingMinter, "WrongDateForProcess");
        await fundersRingMinter.setMintlistStartTime(mintListStartTime);

        // Dummy Merkle
        await fundersRingMinter.setMintlistMerkleRoot1("0xaaaaa4e7390960252c56ff025100919fcb353ee8ba83f9726c613ba2368c62c3");

        // Corret proof bad Merkle
        await expect(fundersRingMinter.mintlistMint(1, 2, ["0x57c6ff6eaab36a7f1f87867ec8b2276e9b01ed576e56485d2c89535038c94865"], { value: ethers.utils.parseEther("0.01") })).to.be.revertedWith("Invalid proof.");

        // Good Merkle in second tree
        await fundersRingMinter.setMintlistMerkleRoot2("0x1fbda4e7390960252c56ff025100919fcb353ee8ba83f9726c613ba2368c62c3");

        // Correct in second merkle
        await fundersRingMinter.mintlistMint(1, 2, [
            "0x3f763845cf8fc1ce980db962b636d70e50d0821cd1108b59d6f31730ea49dc69"
        ], { value: ethers.utils.parseEther("0.01") });

        // Swap
        await fundersRingMinter.setMintlistMerkleRoot1("0x1fbda4e7390960252c56ff025100919fcb353ee8ba83f9726c613ba2368c62c3");
        await fundersRingMinter.setMintlistMerkleRoot2("0xaaaaa4e7390960252c56ff025100919fcb353ee8ba83f9726c613ba2368c62c3");

        // Still correct and last available plot for this wallet
        await fundersRingMinter.mintlistMint(1, 2, [
            "0x3f763845cf8fc1ce980db962b636d70e50d0821cd1108b59d6f31730ea49dc69"
        ], { value: ethers.utils.parseEther("0.01") });

        // Mints with invalid proof
        await expect(fundersRingMinter.mintlistMint(1, 2, [
            "0xaaaaa845cf8fc1ce980db962b636d70e50d0821cd1108b59d6f31730ea49dc69"
        ], { value: ethers.utils.parseEther("0.01") })).to.be.revertedWith("Invalid proof.");

        // Ran out of slots
        await expect(fundersRingMinter.mintlistMint(1, 2, [
            "0x3f763845cf8fc1ce980db962b636d70e50d0821cd1108b59d6f31730ea49dc69"
        ], { value: ethers.utils.parseEther("0.01") })).to.be.revertedWith("Minting more than allowed.");
    });
});

describe("🔥 Claimlist test", function () {
    it("Claimlist should work", async function () {
        const [owner] = await ethers.getSigners();

        const FundersRing = await ethers.getContractFactory("FundersRing");
        const fundersRing = await FundersRing.deploy("http://d9grnqbmunyb9.cloudfront.net/GetPlotId?PlotId=");

        const FundersRingMinter = await ethers.getContractFactory("FundersRingMinter");
        const fundersRingMinter = await FundersRingMinter.deploy(fundersRing.address);
        fundersRing.setMinter(fundersRingMinter.address);

        const ringPrice = ethers.utils.parseEther("0.01");
        const ringsAvailable = ethers.BigNumber.from("10000");
        const mintClaimStartTime = ethers.BigNumber.from("0");
        const mintListStartTime = ethers.BigNumber.from("0");
        const mintListFarTime = ethers.BigNumber.from("999999999999999");
        const mintStartTime = ethers.BigNumber.from("0");

        await fundersRingMinter.setPrice(ringPrice);
        await fundersRingMinter.setPublicMintStartTime(mintStartTime);
        await fundersRingMinter.setMintlistStartTime(mintListFarTime);


        // Claim list has not started
        await expect(fundersRingMinter.claimlistMint(1, 2, [
            "0x3f763845cf8fc1ce980db962b636d70e50d0821cd1108b59d6f31730ea49dc69"
        ], { value: ethers.utils.parseEther("0.01") })).to.be.revertedWithCustomError(fundersRingMinter, "WrongDateForProcess");
        await fundersRingMinter.setClaimsStartTime(mintClaimStartTime);
        await fundersRingMinter.setClaimsStartTime(mintListStartTime);
        await fundersRingMinter.setClaimlistMerkleRoot("0x1fbda4e7390960252c56ff025100919fcb353ee8ba83f9726c613ba2368c62c3");

        // Mints with invalid proof
        await expect(fundersRingMinter.claimlistMint(1, 2, [
            "0xaaaaa845cf8fc1ce980db962b636d70e50d0821cd1108b59d6f31730ea49dc69"
        ])).to.be.revertedWith("Invalid proof.");

        // Mints with valid proof
        await fundersRingMinter.claimlistMint(1, 2, ["0x3f763845cf8fc1ce980db962b636d70e50d0821cd1108b59d6f31730ea49dc69"]);
        await fundersRingMinter.claimlistMint(1, 2, ["0x3f763845cf8fc1ce980db962b636d70e50d0821cd1108b59d6f31730ea49dc69"]);

        // Ran out of slots
        await expect(fundersRingMinter.claimlistMint(1, 2, [
            "0x3f763845cf8fc1ce980db962b636d70e50d0821cd1108b59d6f31730ea49dc69"
        ])).to.be.revertedWith("Claiming more than allowed.");
    });
});

describe("🔥 Marketplace blacklist", function () {
    it("Marketplace blacklist should work.", async function () {
        const [owner, addr1, addr2] = await ethers.getSigners();

        const FundersRing = await ethers.getContractFactory("FundersRing");
        const fundersRing = await FundersRing.deploy("http://d9grnqbmunyb9.cloudfront.net/GetPlotId?PlotId=");

        const FundersRingMinter = await ethers.getContractFactory("FundersRingMinter");
        const fundersRingMinter = await FundersRingMinter.deploy(fundersRing.address);
        fundersRing.setMinter(fundersRingMinter.address);

        const ringPrice = ethers.utils.parseEther("0.01");
        const ringsAvailable = ethers.BigNumber.from("10000");
        const mintClaimStartTime = ethers.BigNumber.from("0");
        const mintListStartTime = ethers.BigNumber.from("0");
        const mintStartTime = ethers.BigNumber.from("0");

        await fundersRingMinter.setPrice(ringPrice);
        await fundersRingMinter.setPublicMintStartTime(mintStartTime);
        await fundersRingMinter.setMintlistStartTime(mintListStartTime);
        await fundersRingMinter.setClaimsStartTime(mintClaimStartTime);

        // Mints an extra plot
        await fundersRingMinter.ownerMint(
            [0, 0, 0, 0],
            [owner.address,
            owner.address,
            owner.address,
            owner.address]);

        // Search for events to know minted plots
        const sentLogs = await fundersRing.queryFilter(
            fundersRing.filters.Transfer(owner.address, null),
        );
        const receivedLogs = await fundersRing.queryFilter(
            fundersRing.filters.Transfer(null, owner.address),
        );
        const logs = sentLogs.concat(receivedLogs)
            .sort(
                (a, b) =>
                    a.blockNumber - b.blockNumber ||
                    a.transactionIndex - b.TransactionIndex,
            );
        const owned = new Set();
        for (const log of logs) {
            const { tokenId } = log.args;
            owned.add(tokenId.toString());
        }
        const tokenIds = Array.from(owned);

        // Should be 2 plots
        expect(tokenIds.length).to.equal(4);

        // Normal fail transfer, as is not approved
        await expect(fundersRing.connect(addr1).transferFrom(owner.address, addr2.address, tokenIds[0])).to.be.revertedWith("ERC721: caller is not token owner or approved");
        // Success approve, now addr1 can transfer tokenIds[0]
        await fundersRing.approve(addr1.address, tokenIds[0]);
        // Success transfer
        await fundersRing.connect(addr1).transferFrom(owner.address, addr2.address, tokenIds[0]);
        // Denying add1 as "marketplace"
        await fundersRing.setDeniedMarketplace(addr1.address, true);
        // Address is in blacklist, signer can't approve addr1 to transfer his token
        await expect(fundersRing.approve(addr1.address, tokenIds[1])).to.be.revertedWith("Invalid Marketplace");
        // If trying to transfer, first require is the market blacklist, so it should fail
        await expect(fundersRing.connect(addr1).transferFrom(owner.address, addr2.address, tokenIds[1])).to.be.revertedWith("Invalid Marketplace");
        // Removing "addr1" from the blacklist
        await fundersRing.setDeniedMarketplace(addr1.address, false);
        // Success approve, now addr1 and add2 can transfer tokenIds[1]
        await fundersRing.approve(addr1.address, tokenIds[1]);
        await fundersRing.approve(addr1.address, tokenIds[2]);
        // Correct transfer
        await fundersRing.connect(addr1).transferFrom(owner.address, addr2.address, tokenIds[1]);
        // Denying the addr1 as marketplace
        await fundersRing.setDeniedMarketplace(addr1.address, true);
        // add2 was not transferred and now addr1 is blocked as marketplace
        await expect(fundersRing.connect(addr1).transferFrom(owner.address, addr2.address, tokenIds[2])).to.be.revertedWith("Invalid Marketplace");


        // Addr1 is blocked as marketplace, setApprovalForAll should fail
        await expect(fundersRing.setApprovalForAll(addr1.address, true)).to.be.revertedWith("Invalid Marketplace");
        // Allowing the  marketplace again
        await fundersRing.setDeniedMarketplace(addr1.address, false);
        // Now approved for all tokens
        await fundersRing.setApprovalForAll(addr1.address, true);
        // Correct transfer
        await fundersRing.connect(addr1).transferFrom(owner.address, addr2.address, tokenIds[2]);
        // Denying addr1 as marketplace again
        await fundersRing.setDeniedMarketplace(addr1.address, true);
        // Failed trasnfer
        await expect(fundersRing.connect(addr1).transferFrom(owner.address, addr2.address, tokenIds[3])).to.be.revertedWith("Invalid Marketplace");

        // Allowing marketplace
        await fundersRing.setDeniedMarketplace(addr1.address, false);
        // Removing approval
        await fundersRing.setApprovalForAll(addr1.address, false);
        // Normal not approved fail
        await expect(fundersRing.connect(addr1).transferFrom(owner.address, addr2.address, tokenIds[3])).to.be.revertedWith("ERC721: caller is not token owner or approved");
        // Single approving
        await fundersRing.approve(addr1.address, tokenIds[3]);
        // Success transfer
        await fundersRing.connect(addr1).transferFrom(owner.address, addr2.address, tokenIds[3]);
    });
});