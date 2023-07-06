//SPDX-License-Identifier: UNLICENSED

// Solidity files have to start with this pragma.
// It will be used by the Solidity compiler to validate its version.
pragma solidity ^0.8.18;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "./IFundersRing.sol";
import "hardhat/console.sol";

contract FundersRingMinter is Ownable, ReentrancyGuard {
    using Address for address payable;

    /// @notice Address to the ERC721 FundersRing contract.
    IFundersRing public fundersRing;

    /// @notice Address to the vault where we can withdraw.
    address payable public vault;

    /// @notice Total available rings.
    uint256 ringsAvailable = 10000;

    /// @notice The nonce used to generate the random number.
    uint256 randNonce = 0;

    uint256[] ringsProbabilitiesPerType = [
        14, // red
        14, // blue
        14, // yellow
        14, // green
        14, // brown
        14, // white
        14, // purple
        2 // prismatic
    ];

    uint256[] public ringTypeLocalOffset = [
        1, // red
        1, // blue
        1, // yellow
        1, // green
        1, // brown
        1, // white
        1, // purple
        1 // prismatic
    ];

    uint256 public ringGlobalOffset = 1;

    uint256 public ringPrice = type(uint256).max;

    uint256 public publicMintStartTime = type(uint256).max;
    uint256 public mintlistStartTime = type(uint256).max;
    uint256 public claimsStartTime = type(uint256).max;

    /// @notice The primary merkle root.
    bytes32 public mintlistMerkleRoot1;

    /// @notice The secondary Merkle root.
    bytes32 public mintlistMerkleRoot2;

    /// @notice The claimslist Merkle root.
    bytes32 public claimlistMerkleRoot;

    /// @notice Stores the number actually minted per ring type.
    mapping(uint256 => uint256) public ringsMinted;

    /// @notice Stores the number minted by this address in the mintlist.
    mapping(address => uint256) public mintlistMinted;

    /// @notice Stores the number minted by this address in the claimslist.
    mapping(address => uint256) public claimlistMinted;

    /**
     * @dev Create the contract and set the initial baseURI.
     * @param _fundersRing Address the initial base URI for the token metadata URL.
     */
    constructor(IFundersRing _fundersRing) {
        setFundersRing(_fundersRing);
        setVaultAddress(payable(msg.sender));
    }

    /**
     * @dev Returns true if the whitelisted mintlist started.
     * @return mintlistStarted true if mintlist started.
     */
    function mintlistStarted() public view returns (bool) {
        return block.timestamp >= mintlistStartTime;
    }

    /**
     * @dev Returns true if the whitelisted claimlist started.
     * @return mintlistStarted true if claimlist started.
     */
    function claimsStarted() public view returns (bool) {
        return block.timestamp >= claimsStartTime;
    }

    /**
     * @dev Returns true if the public minting started.
     * @return mintlistStarted true if public minting started.
     */
    function publicStarted() public view returns (bool) {
        return block.timestamp >= publicMintStartTime;
    }

    /**
     * @dev Returns how many rings were available since the begining.
     * @return getInitialRings uint256 of total elements.
     */
    function getInitialRings() external view returns (uint256) {
        return ringsAvailable;
    }

    /**
     * @dev Returns the eth cost of each ring.
     * @return getRingPrice uint256 with price per ring.
     */
    function getRingPrice() external view returns (uint256) {
        return ringPrice;
    }

    /**
     * @dev Generates a random number to generate a ring.
     * @return ringType uint256 with ring type.
     */
    function generateRing() private returns (uint256) {
        uint256 ringType = 0;

        randNonce++; // Increase nonce
        uint256 genNumber = (uint256(
            keccak256(abi.encodePacked(block.timestamp, msg.sender, randNonce))
        ) % 100) + 1;

        uint256 lowerBound = 0;
        uint256 upperBound = ringsProbabilitiesPerType[0];

        for (uint256 i = 1; i < ringsProbabilitiesPerType.length; i++) {
            lowerBound = upperBound;
            upperBound += ringsProbabilitiesPerType[i];
            if (genNumber > lowerBound && genNumber <= upperBound) {
                ringType = i;
                break;
            }
        }

        return ringType;
    }

    /**
     * @dev Returns the ring type of a token id.
     * @param tokenId uint256 token id.
     */
    function getTokenIdRingType(
        uint256 tokenId
    ) external pure returns (uint256) {
        return tokenId & 255;
    }

    /**
     * @dev Return the total number of minted rings.
     * @return getTotalMintedRings uint256 Number of minted rings.
     */
    function getTotalMintedRings() external view returns (uint256) {
        uint256 totalMintedRings;
        totalMintedRings =
            ringsMinted[0] +
            ringsMinted[1] +
            ringsMinted[2] +
            ringsMinted[3] +
            ringsMinted[4] +
            ringsMinted[5] +
            ringsMinted[6] +
            ringsMinted[7];
        return totalMintedRings;
    }

    /**
     * @dev Return the total number of minted rings of each type.
     * @return getTotalMintedRingsByType Array uint256 number of minted rings of each type.
     */

    function getTotalMintedRingsByType()
        external
        view
        returns (uint256[] memory)
    {
        uint256[] memory ringsMintedByType = new uint256[](8);

        ringsMintedByType[0] = ringsMinted[0];
        ringsMintedByType[1] = ringsMinted[1];
        ringsMintedByType[2] = ringsMinted[2];
        ringsMintedByType[3] = ringsMinted[3];
        ringsMintedByType[4] = ringsMinted[4];
        ringsMintedByType[5] = ringsMinted[5];
        ringsMintedByType[6] = ringsMinted[6];
        ringsMintedByType[7] = ringsMinted[7];

        return ringsMintedByType;
    }

    /**
     * @dev Returns the number of rings left.
     * @return getAvailableRings uint256 with rings available.
     */
    function getAvailableRings() external view returns (uint256) {
        uint256 ringsLeft = ringsAvailable;

        ringsLeft -= ringsMinted[0];
        ringsLeft -= ringsMinted[1];
        ringsLeft -= ringsMinted[2];
        ringsLeft -= ringsMinted[3];
        ringsLeft -= ringsMinted[4];
        ringsLeft -= ringsMinted[5];
        ringsLeft -= ringsMinted[6];
        ringsLeft -= ringsMinted[7];

        return ringsLeft;
    }

    /**
     * @dev Returns the number of rings left of each type.
     * @return ringsProbabilitiesPerType Array uint256 with rings probabilities per type.
     */
    function getProbabilities() external view returns (uint256[] memory) {
        return ringsProbabilitiesPerType;
    }

    /**
     * @dev Mint public method to mint when the whitelist (mintlist) is active.
     * @param _who address Address that is minting.
     * @param _leaf bytes32 Merkle leaf.
     * @param _merkleProof bytes32[] Merkle proof.
     * @return mintlisted bool Success mint.
     */
    function mintlisted(
        address _who,
        bytes32 _leaf,
        bytes32[] calldata _merkleProof
    ) external view returns (bool) {
        bytes32 node = keccak256(abi.encodePacked(_who));

        if (node != _leaf) return false;
        if (
            MerkleProof.verify(_merkleProof, mintlistMerkleRoot1, _leaf) ||
            MerkleProof.verify(_merkleProof, mintlistMerkleRoot2, _leaf)
        ) {
            return true;
        }
        return false;
    }

    /**
     * @dev Public method for public minting.
     * @param numRings uint256 Number of rings to be minted.
     */
    function mint(uint256 numRings) external payable nonReentrant {
        if (!publicStarted()) {
            revert WrongDateForProcess({
                correct_date: publicMintStartTime,
                current_date: block.timestamp
            });
        }
        if (numRings <= 0 || numRings > 20) {
            revert IncorrectPurchaseLimit();
        }
        _mintTokensCheckingValue(numRings, msg.sender);
    }

    /**
     * @dev Public method for free minting.
     * @param numRings uint256 Number of rings to be minted.
     */
    function freeMint(uint256 numRings) internal {
        mintlistMinted[msg.sender] += numRings;
        _mintTokensCheckingValue(numRings, msg.sender);
    }

    /**
     * @dev Public method to mint with claim.
     * @param payedMints uint256 Number of mints available.
     * @param maxClaim uint256 Maximum number of rings that the address can mint.
     * @param _merkleHash bytes32[] Merkle hash.
     */
    function mintWithClaim(
        uint256 payedMints,
        uint256 maxClaim,
        bytes32[] calldata _merkleHash
    ) external payable {
        this.mint(payedMints);

        uint256 alreadyClaimed = claimlistMinted[msg.sender];
        uint256 toClaim = maxClaim - alreadyClaimed;

        if (alreadyClaimed == 0) {
            freeMint(1);
            toClaim--;
        }

        if (toClaim > 0) {
            this.claimlistMint(toClaim, maxClaim, _merkleHash);
        }
    }

    /**
     * @dev Public method to mint when the whitelist (mintlist) is active.
     * @param numRings uint256 Number of rings to be minted.
     * @param claimedMaxRings uint256 Maximum number of rings that the address mint.
     * @param _merkleProof bytes32[] Merkle proof.
     */
    function mintlistMint(
        uint256 numRings,
        uint256 claimedMaxRings,
        bytes32[] calldata _merkleProof
    ) external payable nonReentrant {
        if (!mintlistStarted()) {
            revert WrongDateForProcess({
                correct_date: mintlistStartTime,
                current_date: block.timestamp
            });
        }
        if (numRings <= 0 || numRings > 20) {
            revert IncorrectPurchaseLimit();
        }
        // verify allowlist
        bytes32 _leaf = keccak256(
            abi.encodePacked(msg.sender, ":", claimedMaxRings)
        );

        require(
            MerkleProof.verify(_merkleProof, mintlistMerkleRoot1, _leaf) ||
                MerkleProof.verify(_merkleProof, mintlistMerkleRoot2, _leaf),
            "Invalid proof."
        );

        uint256 mintedPerAddress = mintlistMinted[msg.sender];

        require(
            mintedPerAddress + numRings <= claimedMaxRings, // this is verified by the merkle proof
            "Minting more than allowed."
        );
        mintlistMinted[msg.sender] += numRings;
        _mintTokensCheckingValue(numRings, msg.sender);
    }

    /**
     * @dev Public method to claim a ring, only when (claimlist) is active.
     * @param numRings uint256 Number of rings to be minted.
     * @param claimedMaxRings uint256 Maximum number of rings of ringType that the address mint.
     * @param _merkleProof bytes32[] Merkle proof.
     */
    function claimlistMint(
        uint256 numRings,
        uint256 claimedMaxRings,
        bytes32[] calldata _merkleProof
    ) external payable nonReentrant {
        if (!claimsStarted()) {
            revert WrongDateForProcess({
                correct_date: claimsStartTime,
                current_date: block.timestamp
            });
        }

        // verify allowlist
        bytes32 _leaf = keccak256(
            abi.encodePacked(msg.sender, ":", claimedMaxRings)
        );

        require(
            MerkleProof.verify(_merkleProof, claimlistMerkleRoot, _leaf),
            "Invalid proof."
        );

        uint256 mintedPerAddress = claimlistMinted[msg.sender];

        require(
            mintedPerAddress + numRings <= claimedMaxRings, // this is verified by the merkle proof
            "Claiming more than allowed."
        );
        claimlistMinted[msg.sender] += numRings;
        _mintTokens(numRings, msg.sender);
    }

    /**
     * @dev Checks if the amount sent is correct. Continue minting if it's correct.
     * @param numRings uint256 Number of rings to be minted.
     * @param recipient address Address that sent the mint.
     */
    function _mintTokensCheckingValue(
        uint256 numRings,
        address recipient
    ) private {
        if (ringPrice <= 0) {
            revert MisconfiguredPrices();
        }
        require(
            msg.value == ringPrice * numRings,
            "Ether value sent is not accurate."
        );
        _mintTokens(numRings, recipient);
    }

    /**
     * @dev Checks if there are rings available.
     * Final step before sending it to FundersRing contract.
     * @param numRings uint256 Number of rings to be minted.
     * @param recipient address Address that sent the mint.
     */
    function _mintTokens(uint256 numRings, address recipient) private {
        require(
            this.getTotalMintedRings() + numRings <= this.getAvailableRings(),
            "Trying to mint too many rings."
        );

        for (uint256 i; i < numRings; ++i) {
            uint256 ringType = generateRing(); // Generate random ring type

            // Cast uint256 to enum
            IFundersRing.FundersRingType ringTypeCast = IFundersRing
                .FundersRingType(ringType);

            uint256 tokenId = ownerGetNextTokenId(ringTypeCast);
            ++ringsMinted[uint256(ringType)];

            fundersRing.mintTokenId(recipient, tokenId, ringTypeCast);
        }
    }

    /**
     * @dev Method to mint many ring and assign it to an addresses without
     * any requirement. Used for private minting.
     * @param ringTypes FundersRingType[] enums with ring types.
     * @param recipients address[] Addresses where the token will be transferred.
     */
    function ownerMint(
        IFundersRing.FundersRingType[] calldata ringTypes,
        address[] calldata recipients
    ) external onlyOwner {
        require(
            ringTypes.length == recipients.length,
            "Arrays should have the same size."
        );
        for (uint256 i; i < recipients.length; ++i) {
            uint256 tokenId = ownerGetNextTokenId(ringTypes[i]);
            ++ringsMinted[uint256(ringTypes[i])];

            fundersRing.mintTokenId(recipients[i], tokenId, ringTypes[i]);
        }
    }

    /**
     * @dev Encodes the next token id.
     * @param ringType FundersRingType enum with ring type.
     * @return ownerGetNextTokenId uint256 Encoded next tokenId.
     */
    function ownerGetNextTokenId(
        IFundersRing.FundersRingType ringType
    ) private view returns (uint256) {
        uint256 globalCounter = ringsMinted[0] +
            ringsMinted[1] +
            ringsMinted[2] +
            ringsMinted[3] +
            ringsMinted[4] +
            ringsMinted[5] +
            ringsMinted[6] +
            ringsMinted[7] +
            ringGlobalOffset;
        uint256 localCounter = ringsMinted[uint256(ringType)] +
            ringTypeLocalOffset[uint256(ringType)];
        require(localCounter <= 4294967295, "Local index overflow.");
        require(uint256(ringType) <= 255, "Ring index overflow.");

        return (globalCounter << 40) + (localCounter << 8) + uint256(ringType);
    }

    /**
     * Owner Controls
     */
    /**
     * @dev Assigns a new public start minting time.
     * @param _newPublicMintStartTime uint256 Echo time in seconds.
     */
    function setPublicMintStartTime(
        uint256 _newPublicMintStartTime
    ) external onlyOwner {
        publicMintStartTime = _newPublicMintStartTime;
    }

    /**
     * @dev Assigns a new mintlist start minting time.
     * @param _newAllowlistMintStartTime uint256 Echo time in seconds.
     */
    function setMintlistStartTime(
        uint256 _newAllowlistMintStartTime
    ) external onlyOwner {
        mintlistStartTime = _newAllowlistMintStartTime;
    }

    /**
     * @dev Assigns a new claimlist start minting time.
     * @param _newClaimsStartTime uint256 echo time in seconds.
     */
    function setClaimsStartTime(
        uint256 _newClaimsStartTime
    ) external onlyOwner {
        claimsStartTime = _newClaimsStartTime;
    }

    /**
     * @dev Assigns a merkle root to the main tree for mintlist.
     * @param newMerkleRoot bytes32 merkle root.
     */
    function setMintlistMerkleRoot1(bytes32 newMerkleRoot) external onlyOwner {
        mintlistMerkleRoot1 = newMerkleRoot;
    }

    /**
     * @dev Assigns a merkle root to the second tree for mintlist. Used for double buffer.
     * @param newMerkleRoot bytes32 merkle root.
     */
    function setMintlistMerkleRoot2(bytes32 newMerkleRoot) external onlyOwner {
        mintlistMerkleRoot2 = newMerkleRoot;
    }

    /**
     * @dev Assigns a merkle root to the main tree for claimlist.
     * @param newMerkleRoot bytes32 merkle root
     */
    function setClaimlistMerkleRoot(bytes32 newMerkleRoot) external onlyOwner {
        claimlistMerkleRoot = newMerkleRoot;
    }

    /**
     * @dev Assigns the main contract.
     * @param _newFundersRingAddress IFundersRing Main contract.
     */
    function setFundersRing(
        IFundersRing _newFundersRingAddress
    ) public onlyOwner {
        fundersRing = _newFundersRingAddress;
    }

    /**
     * @dev Assigns the vault address.
     * @param _newVaultAddress address vault address.
     */
    function setVaultAddress(
        address payable _newVaultAddress
    ) public onlyOwner {
        vault = _newVaultAddress;
    }

    /**
     * @dev Assigns the offset to the global ids. This value will be added to
     * the global id when a token is generated.
     * @param _newGlobalIdOffset uint256 Offset.
     */
    function setGlobalIdOffset(uint256 _newGlobalIdOffset) external onlyOwner {
        if (mintlistStarted()) {
            revert DeniedProcessDuringMinting();
        }
        ringGlobalOffset = _newGlobalIdOffset;
    }

    /**
     * @dev Assigns the offset to the local ids. This value will be added to
     * the local id of each ring type  when a token of some type is generated.
     * @param _newRingTypeLocalOffset uint256[] Offsets.
     */
    function setLocalIdOffsets(
        uint256[] calldata _newRingTypeLocalOffset
    ) external onlyOwner {
        if (_newRingTypeLocalOffset.length != 8) {
            revert GivenValuesNotValid({
                sended_values: _newRingTypeLocalOffset.length,
                expected: 8
            });
        }
        if (mintlistStarted()) {
            revert DeniedProcessDuringMinting();
        }
        ringTypeLocalOffset = _newRingTypeLocalOffset;
    }

    /**
     * @dev Assigns the new rings quantities available.
     * @param _newRingsAvailable uint256 Rings available.
     */
    function setRingsAvailable(uint256 _newRingsAvailable) external onlyOwner {
        if (mintlistStarted()) {
            revert DeniedProcessDuringMinting();
        }
        ringsAvailable = _newRingsAvailable;
    }

    /**
     * @dev Assigns the new ring prices for each ring type.
     * @param _newPrice uint256 Rings prices.
     */
    function setPrice(uint256 _newPrice) external onlyOwner {
        if (mintlistStarted()) {
            revert DeniedProcessDuringMinting();
        }
        ringPrice = _newPrice;
    }

    /**
     * @dev Assigns the new ring probabilities for each ring type.
     * @param _newProbabilities uint256[] Ring probabilities.
     */
    function setProbabilities(
        uint256[] calldata _newProbabilities
    ) external onlyOwner {
        uint256 totalProbabilities = 0;

        for (uint256 i = 0; i < _newProbabilities.length; i++) {
            totalProbabilities += _newProbabilities[i];
        }

        if (totalProbabilities != 100) {
            revert GivenValuesNotValid({
                sended_values: totalProbabilities,
                expected: 100
            });
        }

        if (_newProbabilities.length != 8) {
            revert GivenValuesNotValid({
                sended_values: _newProbabilities.length,
                expected: 8
            });
        }

        if (mintlistStarted()) {
            revert DeniedProcessDuringMinting();
        }

        ringsProbabilitiesPerType = _newProbabilities;
    }

    /**
     * @notice Withdraw funds to the vault using sendValue.
     * @param _amount uint256 The amount to withdraw.
     */
    function withdraw(uint256 _amount) external onlyOwner {
        (bool success, ) = vault.call{value: _amount}("");
        require(success, "withdraw was not succesfull");
    }

    /**
     * @notice Withdraw all the funds to the vault using sendValue
     */
    function withdrawAll() external onlyOwner {
        (bool success, ) = vault.call{value: address(this).balance}("");
        require(success, "withdraw all was not succesfull");
    }

    /**
     * @notice Transfer amount to a token.
     * @param _token IERC20 token to transfer.
     * @param _amount uint256 Amount to transfer.
     */
    function forwardERC20s(IERC20 _token, uint256 _amount) external onlyOwner {
        if (address(msg.sender) == address(0)) {
            revert Address0Error();
        }
        _token.transfer(msg.sender, _amount);
    }

    /// Wrong date for process, Come back on `correct_data` for complete this successfully.
    /// @param correct_date date when the public/ mint is on.
    /// @param current_date date when the process was executed.
    error WrongDateForProcess(uint256 correct_date, uint256 current_date);

    /// Denied Process During Minting.
    error DeniedProcessDuringMinting();

    /// Incorrect Purchase Limit, the limits are from 1 to 20 rings.
    error IncorrectPurchaseLimit();

    /// MisconfiguredPrices, the price of that ring type is not configured yet.
    error MisconfiguredPrices();

    /// Configured Prices Error, please send exactly 8 values.
    /// @param sended_values Total given values.
    /// @param expected Total needed values.
    error GivenValuesNotValid(uint256 sended_values, uint256 expected);

    error Address0Error();
}
