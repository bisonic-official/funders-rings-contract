//SPDX-License-Identifier: UNLICENSED

// Solidity files have to start with this pragma.
// It will be used by the Solidity compiler to validate its version.
pragma solidity ^0.8.18;

interface IFundersRing {
    enum FundersRingType {
        red,
        blue,
        yellow,
        green,
        brown,
        white,
        purple,
        prismatic
    }

    event FundersRingMinted(
        address to,
        uint256 tokenId,
        IFundersRing.FundersRingType rtype
    );

    function mintTokenId(
        address recipient,
        uint256 tokenId,
        FundersRingType rtype
    ) external;
}
