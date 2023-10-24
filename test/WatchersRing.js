const { expect } = require("chai");
const { ethers } = require("hardhat");
const { setBalance } = require("@nomicfoundation/hardhat-network-helpers");


describe("🔥 Contract deployment test", function () {
    it("Deployment should verify name and symbol", async function () {
        const WatchersRing = await ethers.getContractFactory("WatchersRing");
        const contract = await WatchersRing.deploy("http://d9grnqbmunyb9.cloudfront.net/GetRingId?RingId=");

        expect(await contract.name()).to.equal("WatchersRing");
        expect(await contract.symbol()).to.equal("WR");
    });

    it("Deployment should work for contract and minter", async function () {
        const [owner] = await ethers.getSigners();

        const WatchersRing = await ethers.getContractFactory("WatchersRing");
        const watchersRing = await WatchersRing.deploy("http://d9grnqbmunyb9.cloudfront.net/GetRingId?RingId=");

        const WatchersRingMinter = await ethers.getContractFactory("WatchersRingMinter");
        const watchersRingMinter = await WatchersRingMinter.deploy(watchersRing.address);
        watchersRing.setMinter(watchersRingMinter.address);

    });
});


describe("🔥 Test getters and setters", function () {
    it("All the getters and setters should work", async function () {
        const [owner] = await ethers.getSigners();

        const WatchersRing = await ethers.getContractFactory("WatchersRing");
        const watchersRing = await WatchersRing.deploy("http://d9grnqbmunyb9.cloudfront.net/GetRingId?RingId=");

        const baseURI = await watchersRing.getTokenURI();
        expect(baseURI).to.equal("http://d9grnqbmunyb9.cloudfront.net/GetRingId?RingId=");

        const WatchersRingMinter = await ethers.getContractFactory("WatchersRingMinter");
        const watchersRingMinter = await WatchersRingMinter.deploy(watchersRing.address);
        watchersRing.setMinter(owner.address);

        const lessProbabilities = [100, 200];
        await expect(watchersRingMinter.setProbabilities(lessProbabilities)).to.be.revertedWithCustomError(watchersRingMinter, "GivenValuesNotValid");
        const badProbabilities = [10, 10, 10, 10, 10, 10, 10, 10];
        await expect(watchersRingMinter.setProbabilities(badProbabilities)).to.be.revertedWithCustomError(watchersRingMinter, "GivenValuesNotValid");
        const newProbabilities = [1, 1, 1, 1, 1, 1, 1, 93];
        await watchersRingMinter.setProbabilities(newProbabilities);
        expect(await watchersRingMinter.getProbabilities()).to.deep.equal(newProbabilities);

        const ringPrice = ethers.utils.parseEther("0.01");
        const ringsAvailable = ethers.BigNumber.from("700");
        const mintClaimStartTime = ethers.BigNumber.from("100");
        const mintListStartTime = ethers.BigNumber.from("200");
        const mintStartTime = ethers.BigNumber.from("300");

        await watchersRingMinter.setPrice(ringPrice);
        await watchersRingMinter.setPublicMintStartTime(mintStartTime);
        await watchersRingMinter.setMintlistStartTime(mintListStartTime);
        await watchersRingMinter.setClaimsStartTime(mintClaimStartTime);

        // Big numbers problem
        expect(await watchersRingMinter.getRingPrice()).to.deep.equal(ringPrice);
        expect(await watchersRingMinter.getInitialRings()).to.deep.equal(ringsAvailable);
        expect(await watchersRingMinter.getAvailableRings()).to.deep.equal(ringsAvailable);

        expect(await watchersRingMinter.publicMintStartTime()).to.deep.equal(mintStartTime);
        expect(await watchersRingMinter.mintlistStartTime()).to.deep.equal(mintListStartTime);
        expect(await watchersRingMinter.claimsStartTime()).to.deep.equal(mintClaimStartTime);

    });
});


describe("🔥 Mint test", function () {
    it("Test single mints + withdrawal functions + limit to 1 ring minted", async function () {
        const [owner] = await ethers.getSigners();

        // Create 99 wallets for testing
        let addressArray = [];
        let signers = [];

        for (let i = 0; i < 100; i++) {
            // Create a new wallet
            let wallet = ethers.Wallet.createRandom().connect(ethers.provider);
            
            // Store as signer
            signers.push(wallet);
            
            // Store as address
            addressArray.push(wallet.address.toString());
        }

        // Fund each wallet with 10000 ETH
        const startingBalance = ethers.utils.parseEther("10000");
        const fundWallets = () => {
            return Promise.all(
                addressArray.map(async fooWallet => {
                    expect(await setBalance(
                        fooWallet, startingBalance
                    )).to.changeEtherBalance(fooWallet, startingBalance);
                })
            ).then(() => {});
        };
        await fundWallets();

        const WatchersRing = await ethers.getContractFactory("WatchersRing");
        const watchersRing = await WatchersRing.deploy("http://d9grnqbmunyb9.cloudfront.net/GetRingId?RingId=");

        const WatchersRingMinter = await ethers.getContractFactory("WatchersRingMinter");
        const watchersRingMinter = await WatchersRingMinter.deploy(watchersRing.address);
        watchersRing.setMinter(watchersRingMinter.address);

        // Set available rings
        await watchersRingMinter.setRingsAvailable(200);
        const availableRings = await watchersRingMinter.getInitialRings();
        expect(availableRings).to.deep.equal(200);

        const ringPrice = ethers.utils.parseEther("0.01");
        const mintClaimStartTime = ethers.BigNumber.from("0");
        const mintListStartTime = ethers.BigNumber.from("0");
        const mintStartTime = ethers.BigNumber.from("0");

        const blockNumBefore = await ethers.provider.getBlockNumber();
        const blockBefore = await ethers.provider.getBlock(blockNumBefore);
        const startPublicSale = blockBefore.timestamp + 1000;

        await watchersRingMinter.setPrice(ringPrice);
        await watchersRingMinter.setPublicMintStartTime(startPublicSale);
        await watchersRingMinter.setMintlistStartTime(mintListStartTime);
        await watchersRingMinter.setClaimsStartTime(mintClaimStartTime);

        await expect(watchersRingMinter.mint({ value: ethers.utils.parseEther("0.01") })).to.be.revertedWithCustomError(watchersRingMinter, "WrongDateForProcess");
        await watchersRingMinter.setPublicMintStartTime(mintStartTime);
        await expect(watchersRingMinter.mint({ value: ethers.utils.parseEther("0.02") })).to.be.revertedWith("Ether value sent is not accurate.");
        await watchersRingMinter.mint({ value: ethers.utils.parseEther("0.01") });
        await expect(watchersRingMinter.mint({ value: ethers.utils.parseEther("0.01") })).to.be.revertedWith("Address alredy minted a ring.");
        
        // Test minting other 99 rings
        for (let i = 0; i < 100; i++) {
            await watchersRingMinter.connect(signers[i]).mint({ value: ethers.utils.parseEther("0.01") });
        }

        // Search for events to know minted rings
        const sentLogs = await watchersRing.queryFilter(
            watchersRing.filters.Transfer(owner.address, null),
        );
        const receivedLogs = await watchersRing.queryFilter(
            watchersRing.filters.Transfer(null, owner.address),
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
        expect((await watchersRingMinter.getTokenIdRingType(tokenIds[0]))).to.lessThan(101);
        console.log("Distribution of rings minted by type (100 rings):");
        console.log(await watchersRingMinter.getTotalMintedRingsByType());

        // Withdraw test
        var beforeWithdraw = await watchersRingMinter.provider.getBalance(owner.address);
        var withdrawEther = ethers.utils.parseEther("0.01");
        var transactionWhithdraw = await watchersRingMinter.withdraw(ethers.utils.parseEther("0.01"));
        var receiptWithdraw = await transactionWhithdraw.wait();
        var expectedWithdrawEther = beforeWithdraw.add(withdrawEther.sub(receiptWithdraw.cumulativeGasUsed.mul(receiptWithdraw.effectiveGasPrice)));

        expect(await watchersRingMinter.provider.getBalance(owner.address)).to.equal(expectedWithdrawEther);

        // Withdraw all test
        var beforeWithdrawAll = await watchersRingMinter.provider.getBalance(owner.address);
        var withdrawAllEther = await watchersRingMinter.provider.getBalance(watchersRingMinter.address);
        var transactionWithdrawAll = await watchersRingMinter.withdrawAll();
        var receiptWithdrawAll = await transactionWithdrawAll.wait();
        var expectedWithdrawAllEther = beforeWithdrawAll.add(withdrawAllEther.sub(receiptWithdrawAll.cumulativeGasUsed.mul(receiptWithdrawAll.effectiveGasPrice)));

        expect(await watchersRingMinter.provider.getBalance(owner.address)).to.equal(expectedWithdrawAllEther);
        expect(await watchersRingMinter.provider.getBalance(watchersRingMinter.address)).to.equal(mintClaimStartTime);

        await watchersRing.withdrawAll();

        // So far, 101 rings have been minted
        const totalSupply = await watchersRing.totalSupply();
        expect(totalSupply).to.equal(101);
    });
});

describe("🔥 URI test", function () {
    it("URI should work", async function () {
        const [owner] = await ethers.getSigners();

        const WatchersRing = await ethers.getContractFactory("WatchersRing");
        const watchersRing = await WatchersRing.deploy("http://d9grnqbmunyb9.cloudfront.net/GetRingId?RingId=");

        const WatchersRingMinter = await ethers.getContractFactory("WatchersRingMinter");
        const watchersRingMinter = await WatchersRingMinter.deploy(watchersRing.address);
        watchersRing.setMinter(watchersRingMinter.address);

        const tokenId = ethers.BigNumber.from("1099511628032");
        const tokenBad = ethers.BigNumber.from("0");

        await watchersRingMinter.ownerMint([0], [owner.address]);

        const tokenUri_0 = await watchersRing.tokenURI(tokenId);
        await expect(tokenUri_0).to.be.equal("http://d9grnqbmunyb9.cloudfront.net/GetRingId?RingId=1099511628032");
        await watchersRing.setBaseURI("https://api.runiverse.world/GetPlotInfo?PlotId=")

        const tokenUri_1 = await watchersRing.tokenURI(tokenId);
        await expect(tokenUri_1).to.be.equal("https://api.runiverse.world/GetPlotInfo?PlotId=1099511628032");

        await expect(tokenUri_1).to.be.equal("https://api.runiverse.world/GetPlotInfo?PlotId=1099511628032");
        await expect(watchersRing.tokenURI(tokenBad)).to.be.revertedWith("ERC721Metadata: URI query for nonexistent token");

    });
});

describe("🔥 Offsets test", function () {
    it("Local and global offsets should work", async function () {
        const [owner] = await ethers.getSigners();

        const WatchersRing = await ethers.getContractFactory("WatchersRing");
        const watchersRing = await WatchersRing.deploy("http://d9grnqbmunyb9.cloudfront.net/GetRingId?RingId=");

        const WatchersRingMinter = await ethers.getContractFactory("WatchersRingMinter");
        const watchersRingMinter = await WatchersRingMinter.deploy(watchersRing.address);
        watchersRing.setMinter(watchersRingMinter.address);

        const tokenId = ethers.BigNumber.from("5497558140672");

        await watchersRingMinter.setGlobalIdOffset(5);
        await watchersRingMinter.setLocalIdOffsets([7, 3, 3, 3, 3, 3, 3, 3]);
        await watchersRingMinter.ownerMint([0], [owner.address]);

        await expect(await watchersRing.exists(tokenId)).to.be.equal(true);

        expect(await watchersRingMinter.ringGlobalOffset()).to.be.equal(5);
        expect(await watchersRingMinter.ringTypeLocalOffset(0)).to.be.equal(7);
        expect(await watchersRingMinter.ringTypeLocalOffset(1)).to.be.equal(3);
        expect(await watchersRingMinter.ringTypeLocalOffset(2)).to.be.equal(3);
        expect(await watchersRingMinter.ringTypeLocalOffset(3)).to.be.equal(3);
        expect(await watchersRingMinter.ringTypeLocalOffset(4)).to.be.equal(3);
        expect(await watchersRingMinter.ringTypeLocalOffset(5)).to.be.equal(3);
        expect(await watchersRingMinter.ringTypeLocalOffset(6)).to.be.equal(3);
        expect(await watchersRingMinter.ringTypeLocalOffset(7)).to.be.equal(3);
    });
});

describe("🔥 Start times test", function () {
    it("Start times for public, mint list and claim list should work.", async function () {
        const [owner] = await ethers.getSigners();

        const WatchersRing = await ethers.getContractFactory("WatchersRing");
        const watchersRing = await WatchersRing.deploy("http://d9grnqbmunyb9.cloudfront.net/GetRingId?RingId=");

        const WatchersRingMinter = await ethers.getContractFactory("WatchersRingMinter");
        const watchersRingMinter = await WatchersRingMinter.deploy(watchersRing.address);
        watchersRing.setMinter(watchersRingMinter.address);

        const ringPrice = ethers.utils.parseEther("0.01");
        await watchersRingMinter.setPrice(ringPrice);

        // Public test
        const blockNumBeforePublic = await ethers.provider.getBlockNumber();
        const blockBeforePublic = await ethers.provider.getBlock(blockNumBeforePublic);
        const beforeTimePublic = blockBeforePublic.timestamp + 5;
        const currentTimePublic = blockBeforePublic.timestamp + 10;
        const afterTimePublic = blockBeforePublic.timestamp + 15;

        await watchersRingMinter.setPublicMintStartTime(currentTimePublic);


        await ethers.provider.send("evm_mine", [beforeTimePublic]);
        await expect(await watchersRingMinter.publicStarted()).to.be.equal(false);
        await ethers.provider.send("evm_mine", [afterTimePublic]);
        await expect(await watchersRingMinter.publicStarted()).to.be.equal(true);

        // Mint test
        const blockNumBeforeMintList = await ethers.provider.getBlockNumber();
        const blockBeforeMintList = await ethers.provider.getBlock(blockNumBeforeMintList);
        const beforeTimeMintList = blockBeforeMintList.timestamp + 5;
        const currentTimeMintList = blockBeforeMintList.timestamp + 10;
        const afterTimeMintList = blockBeforeMintList.timestamp + 15;

        await watchersRingMinter.setMintlistStartTime(currentTimeMintList);


        await ethers.provider.send("evm_mine", [beforeTimeMintList]);
        await expect(await watchersRingMinter.mintlistStarted()).to.be.equal(false);
        await ethers.provider.send("evm_mine", [afterTimeMintList]);
        await expect(await watchersRingMinter.mintlistStarted()).to.be.equal(true);

        // Claim test
        const blockNumBeforeClaimList = await ethers.provider.getBlockNumber();
        const blockBeforeClaimList = await ethers.provider.getBlock(blockNumBeforeClaimList);
        const beforeTimeClaimList = blockBeforeClaimList.timestamp + 5;
        const currentTimeClaimList = blockBeforeClaimList.timestamp + 10;
        const afterTimeClaimList = blockBeforeClaimList.timestamp + 15;

        await watchersRingMinter.setClaimsStartTime(currentTimeClaimList);


        await ethers.provider.send("evm_mine", [beforeTimeClaimList]);
        await expect(await watchersRingMinter.claimsStarted()).to.be.equal(false);
        await ethers.provider.send("evm_mine", [afterTimeClaimList]);
        await expect(await watchersRingMinter.claimsStarted()).to.be.equal(true);
    });
});

describe("🔥 Whitelist test", function () {
    it("Whitelist should work", async function () {
        const [owner, addr1] = await ethers.getSigners();

        const WatchersRing = await ethers.getContractFactory("WatchersRing");
        const watchersRing = await WatchersRing.deploy("http://d9grnqbmunyb9.cloudfront.net/GetRingId?RingId=");

        const WatchersRingMinter = await ethers.getContractFactory("WatchersRingMinter");
        const watchersRingMinter = await WatchersRingMinter.deploy(watchersRing.address);
        watchersRing.setMinter(watchersRingMinter.address);

        const ringPrice = ethers.utils.parseEther("0.01");
        const mintClaimStartTime = ethers.BigNumber.from("0");
        const mintListStartTime = ethers.BigNumber.from("0");
        const mintListFarTime = ethers.BigNumber.from("999999999999999");
        const mintStartTime = ethers.BigNumber.from("0");

        await watchersRingMinter.setPrice(ringPrice);
        await watchersRingMinter.setPublicMintStartTime(mintStartTime);
        await watchersRingMinter.setMintlistStartTime(mintListFarTime);
        await watchersRingMinter.setClaimsStartTime(mintClaimStartTime);

        // Mint list has not started
        await expect(watchersRingMinter.mintlistMint(2, [
            "0x57c6ff6eaab36a7f1f87867ec8b2276e9b01ed576e56485d2c89535038c94865"
        ], { value: ethers.utils.parseEther("0.01") })).to.be.revertedWithCustomError(watchersRingMinter, "WrongDateForProcess");
        await watchersRingMinter.setMintlistStartTime(mintListStartTime);

        // Dummy Merkle
        await watchersRingMinter.setMintlistMerkleRoot1("0xaaaaa4e7390960252c56ff025100919fcb353ee8ba83f9726c613ba2368c62c3");

        // Corret proof bad Merkle
        await expect(watchersRingMinter.mintlistMint(2, [
            "0x57c6ff6eaab36a7f1f87867ec8b2276e9b01ed576e56485d2c89535038c94865"
        ], { value: ethers.utils.parseEther("0.01") })).to.be.revertedWith("Invalid proof.");

        // Good Merkle in second tree
        await watchersRingMinter.setMintlistMerkleRoot2("0x1fbda4e7390960252c56ff025100919fcb353ee8ba83f9726c613ba2368c62c3");

        // Correct in second merkle
        await watchersRingMinter.mintlistMint(2, [
            "0x3f763845cf8fc1ce980db962b636d70e50d0821cd1108b59d6f31730ea49dc69"
        ], { value: ethers.utils.parseEther("0.01") });

        // Mints with invalid proof
        await expect(watchersRingMinter.mintlistMint(2, [
            "0xaaaaa845cf8fc1ce980db962b636d70e50d0821cd1108b59d6f31730ea49dc69"
        ], { value: ethers.utils.parseEther("0.01") })).to.be.revertedWith("Invalid proof.");

        // Ran out of slots
        await expect(watchersRingMinter.mintlistMint(2, [
            "0x3f763845cf8fc1ce980db962b636d70e50d0821cd1108b59d6f31730ea49dc69"
        ], { value: ethers.utils.parseEther("0.01") })).to.be.revertedWith("Address alredy minted a ring.");
    });
});

describe("🔥 Claim list test", function () {
    it("Claimlist should work", async function () {
        const [owner, addr1] = await ethers.getSigners();

        const WatchersRing = await ethers.getContractFactory("WatchersRing");
        const watchersRing = await WatchersRing.deploy("http://d9grnqbmunyb9.cloudfront.net/GetRingId?RingId=");

        const WatchersRingMinter = await ethers.getContractFactory("WatchersRingMinter");
        const watchersRingMinter = await WatchersRingMinter.deploy(watchersRing.address);
        watchersRing.setMinter(watchersRingMinter.address);

        const ringPrice = ethers.utils.parseEther("0.01");
        const mintClaimStartTime = ethers.BigNumber.from("0");
        const mintListStartTime = ethers.BigNumber.from("0");
        const mintListFarTime = ethers.BigNumber.from("999999999999999");
        const mintStartTime = ethers.BigNumber.from("0");

        await watchersRingMinter.setPrice(ringPrice);
        await watchersRingMinter.setPublicMintStartTime(mintStartTime);
        await watchersRingMinter.setMintlistStartTime(mintListFarTime);


        // Claim list has not started
        await expect(watchersRingMinter.claimlistMint(2, [
            "0x3f763845cf8fc1ce980db962b636d70e50d0821cd1108b59d6f31730ea49dc69"
        ], { value: ethers.utils.parseEther("0.01") })).to.be.revertedWithCustomError(watchersRingMinter, "WrongDateForProcess");
        await watchersRingMinter.setClaimsStartTime(mintClaimStartTime);
        await watchersRingMinter.setClaimlistMerkleRoot("0x1fbda4e7390960252c56ff025100919fcb353ee8ba83f9726c613ba2368c62c3");

        // Mints with invalid proof
        await expect(watchersRingMinter.claimlistMint(2, [
            "0xaaaaa845cf8fc1ce980db962b636d70e50d0821cd1108b59d6f31730ea49dc69"
        ])).to.be.revertedWith("Invalid proof.");

        // Mints with valid proof
        await watchersRingMinter.claimlistMint(2, [
            "0x3f763845cf8fc1ce980db962b636d70e50d0821cd1108b59d6f31730ea49dc69"
        ]);
        await expect(watchersRingMinter.claimlistMint(2, [
            "0x3f763845cf8fc1ce980db962b636d70e50d0821cd1108b59d6f31730ea49dc69"
        ])).to.be.revertedWith("Address alredy minted a ring.");
    });
});

describe("🔥 Marketplace blacklist", function () {
    it("Marketplace blacklist should work.", async function () {
        const [owner, addr1, addr2, addr3, addr4] = await ethers.getSigners();

        const WatchersRing = await ethers.getContractFactory("WatchersRing");
        const watchersRing = await WatchersRing.deploy("http://d9grnqbmunyb9.cloudfront.net/GetRingId?RingId=");

        const WatchersRingMinter = await ethers.getContractFactory("WatchersRingMinter");
        const watchersRingMinter = await WatchersRingMinter.deploy(watchersRing.address);
        watchersRing.setMinter(watchersRingMinter.address);

        const ringPrice = ethers.utils.parseEther("0.01");
        const mintClaimStartTime = ethers.BigNumber.from("0");
        const mintListStartTime = ethers.BigNumber.from("0");
        const mintStartTime = ethers.BigNumber.from("0");

        await watchersRingMinter.setPrice(ringPrice);
        await watchersRingMinter.setPublicMintStartTime(mintStartTime);
        await watchersRingMinter.setMintlistStartTime(mintListStartTime);
        await watchersRingMinter.setClaimsStartTime(mintClaimStartTime);

        // Mint rings
        await watchersRingMinter.ownerMint([0],[owner.address]);

        await watchersRingMinter.ownerMint(
            [0, 0, 0, 0],
            [
                addr1.address,
                addr2.address,
                addr3.address,
                addr4.address
            ]);
        
        // Minting again should fail
        await expect(watchersRingMinter.ownerMint([0],[owner.address])).to.be.revertedWithCustomError(watchersRingMinter, "AlreadyMintedOneRing");
        await expect(watchersRingMinter.ownerMint(
            [0, 0, 0, 0],
            [
                addr1.address,
                addr2.address,
                addr3.address,
                addr4.address
            ])).to.be.revertedWithCustomError(watchersRingMinter, "AlreadyMintedOneRing");

        // Search for events to know minted rings
        const sentLogs = await watchersRing.queryFilter([
            watchersRing.filters.Transfer(owner.address, null),
            watchersRing.filters.Transfer(addr1.address, null),
            watchersRing.filters.Transfer(addr2.address, null),
            watchersRing.filters.Transfer(addr3.address, null),
            watchersRing.filters.Transfer(addr4.address, null),
        ]);
        const receivedLogs = await watchersRing.queryFilter([
            watchersRing.filters.Transfer(null, owner.address),
            watchersRing.filters.Transfer(null, addr1.address),
            watchersRing.filters.Transfer(null, addr2.address),
            watchersRing.filters.Transfer(null, addr3.address),
            watchersRing.filters.Transfer(null, addr4.address),
        ]);
        const logs = sentLogs.concat(receivedLogs)
            .sort(
                (a, b) =>
                    a.blockNumber - b.blockNumber ||
                    a.transactionIndex - b.TransactionIndex,
            );
        const owned = new Set();
        for (let i = 0; i < logs.length; i++) {
            const tokenId = logs[i].args.tokenId;
            if (tokenId instanceof ethers.BigNumber) {
                owned.add(tokenId.toString());
            }
        }
        const tokenIds = Array.from(owned);

        // Should be 1 ring minted per address, 5 in total
        expect(tokenIds.length).to.equal(5);

        // Normal fail transfer, as is not approved
        await expect(watchersRing.connect(addr1).transferFrom(
            owner.address, addr2.address, tokenIds[0]
        )).to.be.revertedWith("ERC721: caller is not token owner or approved");
        // Success approve, now addr1 can transfer tokenIds[0]
        await watchersRing.approve(addr1.address, tokenIds[0]);
        // Success transfer
        await watchersRing.connect(addr1).transferFrom(
            owner.address, addr2.address, tokenIds[0]
        );
        // Denying add2 as "marketplace"
        await watchersRing.setDeniedMarketplace(addr2.address, true);
        // Address is in blacklist, signer can't approve addr1 to transfer his token
        await expect(watchersRing.connect(addr1).approve(addr2.address, tokenIds[1])).to.be.revertedWith("Invalid Marketplace");
        // If trying to transfer, first require is the market blacklist, so it should fail
        await expect(watchersRing.connect(addr2).transferFrom(
            addr1.address, addr2.address, tokenIds[1]
        )).to.be.revertedWith("Invalid Marketplace");
        // Removing "addr1" from the blacklist
        await watchersRing.setDeniedMarketplace(addr1.address, false);
        // Success approve, now addr1 and add2 can transfer tokenIds[1]
        await watchersRing.connect(addr1).approve(addr3.address, tokenIds[1]);
        await watchersRing.connect(addr2).approve(addr3.address, tokenIds[2]);
        // Correct transfer
        await watchersRing.connect(addr3).transferFrom(
            addr1.address, addr2.address, tokenIds[1]
        );
        // Denying the addr3 as marketplace
        await watchersRing.setDeniedMarketplace(addr3.address, true);
        // add2 was not transferred and now addr1 is blocked as marketplace
        await expect(watchersRing.connect(addr3).transferFrom(
            addr2.address, addr4.address, tokenIds[2]
        )).to.be.revertedWith("Invalid Marketplace");


        // Addr1 is blocked as marketplace, setApprovalForAll should fail
        await expect(watchersRing.setApprovalForAll(addr3.address, true)).to.be.revertedWith("Invalid Marketplace");
        // Allowing the  marketplace again
        await watchersRing.setDeniedMarketplace(addr3.address, false);
        // Now approved for all tokens
        await watchersRing.setApprovalForAll(addr3.address, true);
        // Correct transfer
        await watchersRing.connect(addr3).transferFrom(
            addr2.address, addr4.address, tokenIds[2]
        );
        // Denying addr3 as marketplace again
        await watchersRing.setDeniedMarketplace(addr3.address, true);
        // Failed trasnfer
        await expect(watchersRing.connect(addr3).transferFrom(
            addr4.address, addr2.address, tokenIds[2]
        )).to.be.revertedWith("Invalid Marketplace");

        // Allowing marketplace
        await watchersRing.setDeniedMarketplace(addr1.address, false);
        // Removing approval
        await watchersRing.setApprovalForAll(addr1.address, false);
        // Normal not approved fail
        await expect(watchersRing.connect(addr1).transferFrom(
            owner.address, addr2.address, tokenIds[3]
        )).to.be.revertedWith("ERC721: caller is not token owner or approved");
        // Single approving
        await watchersRing.connect(addr3).approve(addr1.address, tokenIds[3]);
        // Success transfer
        await watchersRing.connect(addr1).transferFrom(
            addr3.address, addr2.address, tokenIds[3]
        );
    });
});