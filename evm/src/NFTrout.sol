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
    function breed(BreedingPair[] calldata pairs) external whenNotPaused {
        uint256 fee = _earn(owner(), pairs.length * mintFee);
        for (uint256 i; i < pairs.length; i++) {
            (TokenId left, TokenId right) = (pairs[i].left, pairs[i].right);
            require(TokenId.unwrap(left) != TokenId.unwrap(right), "cannot self-breed");
            fee += _earn(_ownerOf(left), getBreedingFee(msg.sender, left));
            fee += _earn(_ownerOf(right), getBreedingFee(msg.sender, right));
        }
        _safeMint(msg.sender, pairs.length);
        paymentToken.safeTransferFrom(msg.sender, address(this), fee);
    }

    /// Makes a trout not breedable.
    function delist(TokenId tokenId) external {
        if (msg.sender != _ownerOf(tokenId)) revert Unauthorized();
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
    function getBreedingFee(address breeder, TokenId tokenId) public view returns (uint256) {
        if (TokenId.unwrap(tokenId) == 0 || breeder == _ownerOf(tokenId)) return 0;
        uint256 fee = studFees[tokenId];
        if (fee == 0) revert Unauthorized();
        return fee;
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

    struct MintTask {
        RecipentQuantity[] outputs;
    }

    struct RecipentQuantity {
        address recipient;
        // @dev uint128 minted || uint128 quantity
        uint256 packedMintedAndQuantity;
    }

    struct BurnTask {
        TokenId[] tokens;
    }

    struct ListTask {
        StudFee[] listings;
    }

    struct StudFee {
        TokenId stud;
        /// @dev uint128 prev || uint128 next
        uint256 packedFees;
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
                ListTask memory listTask = abi.decode(task.payload, (ListTask));
                for (uint256 j; j < listTask.listings.length; j++) {
                    StudFee memory l = listTask.listings[j];
                    uint256 oldFee = l.packedFees >> 128;
                    if (studFees[l.stud] != oldFee) continue;
                    studFees[l.stud] = uint128(l.packedFees);
                }
                return;
            }

            if (task.kind == TaskKind.Mint) {
                MintTask memory mintTask = abi.decode(task.payload, (MintTask));
                for (uint256 j; j < mintTask.outputs.length; j++) {
                    RecipentQuantity memory rq = mintTask.outputs[j];
                    uint256 expectedMinted = rq.packedMintedAndQuantity >> 128;
                    if (_numberMinted(rq.recipient) != expectedMinted) continue;
                    uint256 qty = uint128(rq.packedMintedAndQuantity);
                    _safeMint(rq.recipient, qty);
                }
                return;
            }

            if (task.kind == TaskKind.Burn) {
                BurnTask memory burnTask = abi.decode(task.payload, (BurnTask));
                for (uint256 j; j < burnTask.tokens.length; j++) {
                    if (!_exists(burnTask.tokens[j])) continue;
                    _burn(TokenId.unwrap(burnTask.tokens[j]));
                }
                return;
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

    function _exists(TokenId id) internal view returns (bool) {
        return _exists(TokenId.unwrap(id));
    }

    function _startTokenId() internal pure override returns (uint256) {
        return 1;
    }
}
