// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {
    ITaskAcceptor, TaskAcceptor
} from "@escrin/evm/contracts/tasks/v1/acceptors/TaskAcceptor.sol";
import {TimelockedDelegatedTaskAcceptor} from
    "@escrin/evm/contracts/tasks/v1/acceptors/DelegatedTaskAcceptor.sol";

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20, SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import {
    IERC165, ERC165Checker
} from "@openzeppelin/contracts/utils/introspection/ERC165Checker.sol";

import {IERC721A, ERC721A} from "erc721a/contracts/ERC721A.sol";
import {ERC721ABurnable} from "erc721a/contracts/extensions/ERC721ABurnable.sol";
import {ERC721AQueryable} from "erc721a/contracts/extensions/ERC721AQueryable.sol";

contract NFTrout is
    ERC721A,
    ERC721ABurnable,
    ERC721AQueryable,
    TimelockedDelegatedTaskAcceptor,
    Ownable,
    Pausable
{
    using SafeERC20 for IERC20;

    type TokenId is uint256;

    /// There are still claims to process.
    error ClaimsOutstanding();

    /// The trout is no longer breedable.
    event Delisted();
    event TasksAccepted();

    uint256 private immutable numClaimable;
    bytes32 private immutable claimsRoot;
    string private urlPrefix;
    string private urlSuffix;

    IERC20 public immutable paymentToken;
    uint256 public mintFee;
    mapping(address => uint256) public earnings;
    mapping(TokenId => uint256) public studFees;

    constructor(
        address upstreamAcceptor,
        uint64 initialAcceptorTimelock,
        address paymentTokenAddr,
        uint256 numClaimableTokens,
        bytes32 claimsMerkleRoot,
        uint256 initialMintFee,
        string memory initialUrlPrefix,
        string memory initialUrlSuffix
    )
        ERC721A("NFTrout", "TROUT")
        TimelockedDelegatedTaskAcceptor(upstreamAcceptor, initialAcceptorTimelock)
        Ownable(msg.sender)
    {
        require(
            ERC165Checker.supportsInterface(paymentTokenAddr, type(IERC20).interfaceId),
            "bad payment token"
        );

        mintFee = initialMintFee;
        numClaimable = numClaimableTokens;
        claimsRoot = claimsMerkleRoot;
        (urlPrefix, urlSuffix) = (initialUrlPrefix, initialUrlSuffix);

        _pause(); // wait for claims
    }

    struct Claim {
        uint256 startTokenId;
        uint256 quantity;
        address claimant;
    }

    function processClaims(
        Claim[] calldata claims,
        bytes32[] calldata proof,
        bool[] calldata proofFlags
    ) external {
        bytes32[] memory leaves = new bytes32[](claims.length);
        for (uint256 i; i < claims.length; i++) {
            Claim calldata claim = claims[i];
            leaves[i] = keccak256(abi.encode(claim));
            if (_nextTokenId() != claim.startTokenId) revert ClaimsOutstanding();
            _mint(claim.claimant, claim.quantity);
        }
        bool ok = MerkleProof.multiProofVerify(proof, proofFlags, claimsRoot, leaves);
        if (!ok) revert MerkleProof.MerkleProofInvalidMultiproof();
    }

    function mint(uint256 quantity) external whenNotPaused {
        uint256 fee = mintFee * quantity;
        _earn(owner(), fee);
        _safeMint(msg.sender, quantity);
        paymentToken.safeTransferFrom(msg.sender, address(this), fee);
    }

    struct BreedingPair {
        TokenId left;
        TokenId right;
    }

    /// Breeds any two trout to produce a third trout that will be owned by the caller.
    /// This method must be called with enough value to pay for the two trouts' fees and the minting fee.
    function breed(BreedingPair[] calldata pairs)
        external
        whenNotPaused
        returns (uint256 startTokenId)
    {
        uint256 fee = _earn(owner(), pairs.length * mintFee);
        for (uint256 i; i < pairs.length; i++) {
            (TokenId left, TokenId right) = (pairs[i].left, pairs[i].right);
            require(TokenId.unwrap(left) != TokenId.unwrap(right), "cannot self-breed");
            fee += _earn(_ownerOf(left), getBreedingFee(msg.sender, left));
            fee += _earn(_ownerOf(right), getBreedingFee(msg.sender, right));
        }
        startTokenId = _nextTokenId();
        _safeMint(msg.sender, pairs.length);
        paymentToken.safeTransferFrom(msg.sender, address(this), fee);
    }

    /// Makes a trout not breedable.
    function delist(TokenId tokenId) external {
        if (!_isApprovedOrOwner(msg.sender, tokenId)) revert Unauthorized();
        studFees[tokenId] = 0;
        emit Delisted();
    }

    function withdraw() external {
        uint256 stack = earnings[msg.sender];
        earnings[msg.sender] = 0;
        paymentToken.safeTransferFrom(address(this), msg.sender, stack);
    }

    function setUrlComponents(string calldata prefix, string calldata suffix) external onlyOwner {
        (urlPrefix, urlSuffix) = (prefix, suffix);
    }

    function setMintFee(uint256 fee) external onlyOwner {
        mintFee = fee;
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        if (_nextTokenId() > numClaimable) _unpause();
        else revert ClaimsOutstanding();
    }

    /// Returns a cost for the payer to breed the trout that is no larger than the list price.
    function getBreedingFee(address breeder, TokenId tokenId) public view returns (uint256 fee) {
        if (_isApprovedOrOwner(breeder, tokenId)) return 0;
        if ((fee = studFees[tokenId]) == 0) revert Unauthorized();
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override(IERC721A, ERC721A)
        returns (string memory)
    {
        return string.concat(urlPrefix, _toString(tokenId), urlSuffix);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        pure
        override(IERC721A, ERC721A, TaskAcceptor)
        returns (bool)
    {
        return interfaceId == type(IERC165).interfaceId
            || interfaceId == type(ITaskAcceptor).interfaceId
            || interfaceId == type(IERC721A).interfaceId;
    }

    struct Task {
        TaskKind kind;
        bytes payload;
    }

    enum TaskKind {
        Unknown,
        Mint,
        Burn,
        List
    }

    struct RecipentQuantity {
        address recipient;
        // @dev uint128 minted || uint128 quantity
        uint32 packedMintedAndQuantity;
    }

    struct StudFee {
        TokenId stud;
        /// @dev uint128 prev || uint128 next
        uint32 packedFees;
    }

    function _afterTaskResultsAccepted(
        uint256[] calldata,
        bytes calldata report,
        TaskIdSelector memory
    ) internal override whenNotPaused {
        Task[] memory tasks = abi.decode(report, (Task[]));
        for (uint256 i; i < tasks.length; i++) {
            Task memory task = tasks[i];

            if (task.kind == TaskKind.List) {
                StudFee[] memory listings = abi.decode(task.payload, (StudFee[]));
                for (uint256 j; j < listings.length; j++) {
                    uint256 oldFee = listings[j].packedFees >> 128;
                    if (studFees[listings[j].stud] != oldFee) continue;
                    studFees[listings[j].stud] = uint128(listings[j].packedFees);
                }
                continue;
            }

            if (task.kind == TaskKind.Mint) {
                RecipentQuantity[] memory outputs = abi.decode(task.payload, (RecipentQuantity[]));
                for (uint256 j; j < outputs.length; j++) {
                    uint256 expectedMinted = outputs[j].packedMintedAndQuantity >> 128;
                    if (_numberMinted(outputs[j].recipient) != expectedMinted) continue;
                    uint256 qty = uint128(outputs[j].packedMintedAndQuantity);
                    _safeMint(outputs[j].recipient, qty);
                }
                continue;
            }

            if (task.kind == TaskKind.Burn) {
                TokenId[] memory tokens = abi.decode(task.payload, (TokenId[]));
                for (uint256 j; j < tokens.length; j++) {
                    if (!_exists(TokenId.unwrap(tokens[j]))) continue;
                    _burn(TokenId.unwrap(tokens[j]));
                }
                continue;
            }
        }
        emit TasksAccepted();
    }

    function _afterTokenTransfers(address from, address, uint256 startTokenId, uint256 quantity)
        internal
        override
    {
        if (from == address(0)) return;
        for (uint256 i = startTokenId; i < quantity; i++) {
            studFees[TokenId.wrap(i)] = 0;
        }
    }

    function _earn(address payee, uint256 amount) internal returns (uint256) {
        earnings[payee] += amount;
        return amount;
    }

    function _ownerOf(TokenId id) internal view returns (address) {
        return ownerOf(TokenId.unwrap(id));
    }

    function _isApprovedOrOwner(address whom, TokenId id) internal view returns (bool) {
        uint256 tokenId = TokenId.unwrap(id);
        address owner = ownerOf(tokenId);
        return whom == owner || getApproved(tokenId) == whom || isApprovedForAll(owner, whom);
    }

    function _startTokenId() internal pure override returns (uint256) {
        return 1;
    }
}
