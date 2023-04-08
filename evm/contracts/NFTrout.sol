// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";
import {EnumerableMap} from "@openzeppelin/contracts/utils/structs/EnumerableMap.sol";
import {ERC721A} from "erc721a/contracts/ERC721A.sol";
import {IERC721A} from "erc721a/contracts/IERC721A.sol";
import {ERC721AQueryable} from "erc721a/contracts/extensions/ERC721AQueryable.sol";

import {LilypadEvents} from "./lilypad/LilypadEvents.sol";
import {LilypadCallerInterface, LilypadResultType} from "./lilypad/LilypadCallerInterface.sol";

type JobId is uint256;
type TokenId is uint256;

/// The caller must be lilypad.
error NotLilypad();
/// You are not the owner of the trout;
error NotOwner();
/// The token does not exist;
error NoSuchToken(TokenId id);
/// One of the trout you tried to breed is neither owned by you nor listed for public breeding.
error NotListed();
/// Not enough value was sent.
error PaymentRequired(uint256 amount);
/// A trout cannot breed with itself.
error CannotSelfBreed();

contract NFTrout is ERC721A, ERC721AQueryable, LilypadCallerInterface, Ownable {
    using EnumerableMap for EnumerableMap.UintToUintMap;

    /// The trout was listed as breedable.
    event Listed(TokenId indexed tokenId, uint256 fee);
    /// The trout is no longer breedable.
    event Delisted(TokenId indexed tokenId);
    /// Two trouts have bred to produce a new trout.
    event Spawned(TokenId indexed left, TokenId indexed right, TokenId child);

    struct Receipt {
        TokenId tokenId;
        TokenId left;
        TokenId right;
    }

    struct Stud {
        TokenId tokenId;
        uint256 fee;
    }

    uint256 public mintFee;
    uint256 public matchmakingBps;
    mapping(address => uint256) public earnings;

    LilypadEvents public lilypadEvents;

    mapping(TokenId => Receipt) private receipts;
    mapping(TokenId => string) private tokenUris;
    mapping(JobId => TokenId) private tokensByJob;
    /// token id -> fee
    EnumerableMap.UintToUintMap private studs;

    modifier onlyLilypadEvents() {
        if (msg.sender != address(lilypadEvents)) revert NotLilypad();
        _;
    }

    modifier onlyTroutOwner(TokenId _tokenId) {
        if (msg.sender != _ownerOf(_tokenId)) revert NotOwner();
        _;
    }

    constructor(
        LilypadEvents _lilypadEvents,
        uint256 _mintFee,
        uint256 _matchmakingBps
    ) ERC721A("NFTrout Gen 1", unicode"NF🐟1") {
        lilypadEvents = _lilypadEvents;
        mintFee = _mintFee;
        matchmakingBps = _matchmakingBps;
    }

    /// Transmutes money into trout.
    function mint() external payable returns (TokenId tokenId, JobId jobId) {
        uint256 fee = _getMintFee(msg.sender);
        if (_pay(owner(), fee, 0) != msg.value) revert PaymentRequired(mintFee);
        tokenId = _mint(msg.sender);
        TokenId z = TokenId.wrap(0);
        jobId = _enqueueJob(Receipt({tokenId: tokenId, left: z, right: z}));
        emit Spawned(z, z, tokenId);
    }

    /// Makes a trout breedable.
    function list(TokenId _tokenId, uint256 _fee) external onlyTroutOwner(_tokenId) {
        studs.set(TokenId.unwrap(_tokenId), _fee);
        emit Listed(_tokenId, _fee);
    }

    /// Makes a trout not breedable.
    function delist(TokenId _tokenId) external onlyTroutOwner(_tokenId) {
        studs.remove(TokenId.unwrap(_tokenId));
        emit Delisted(_tokenId);
    }

    /// Breeds any two trout to produce a third trout that will be owned by the caller.
    /// This method must be called with enough value to pay for the two trouts' fees and the minting fee.
    function breed(TokenId _left, TokenId _right) external payable returns (TokenId tokenId) {
        uint256 leftId = TokenId.unwrap(_left);
        uint256 rightId = TokenId.unwrap(_right);
        if (!_exists(leftId)) revert NoSuchToken(_left);
        if (!_exists(rightId)) revert NoSuchToken(_right);
        if (leftId == rightId) revert CannotSelfBreed();

        uint256 subtotal;
        subtotal += _pay(owner(), _getMintFee(msg.sender), 0);
        subtotal += _pay(_ownerOf(_left), _getBreedingFee(msg.sender, _left), matchmakingBps);
        subtotal += _pay(_ownerOf(_right), _getBreedingFee(msg.sender, _right), matchmakingBps);
        if (subtotal != msg.value) revert PaymentRequired(subtotal);
        tokenId = _mint(msg.sender);
        _enqueueJob(Receipt({left: _left, right: _right, tokenId: tokenId}));
        emit Spawned(_left, _right, tokenId);
    }

    function withdraw() external {
        uint256 stack = earnings[msg.sender];
        earnings[msg.sender] = 0;
        payable(msg.sender).transfer(stack);
    }

    function setLilypadEvents(LilypadEvents _lilypadEvents) external onlyOwner {
        lilypadEvents = _lilypadEvents;
    }

    function setFees(uint256 _mintFee, uint256 _matchBps) external onlyOwner {
        mintFee = _mintFee;
        matchmakingBps = _matchBps;
    }

    function lilypadFulfilled(
        address,
        uint256 _jobId,
        LilypadResultType _resultType,
        string calldata _result
    ) external onlyLilypadEvents {
        if (_resultType != LilypadResultType.CID) return;
        TokenId tokenId = tokensByJob[JobId.wrap(_jobId)];
        tokenUris[tokenId] = string.concat("ipfs://", _result);
    }

    function lilypadCancelled(address, uint256 _jobId, string calldata) external onlyLilypadEvents {
        Receipt memory receipt = receipts[tokensByJob[JobId.wrap(_jobId)]];
        _enqueueJob(Receipt({left: receipt.left, right: receipt.right, tokenId: receipt.tokenId}));
    }

    /// Paginated list of trout listed for breeding.
    function getStuds(uint256 _offset, uint256 _count) external view returns (Stud[] memory) {
        uint256 start = _offset > studs.length() ? studs.length() : _offset;
        uint256 end = start + _count;
        uint256 n = end > studs.length() ? studs.length() - start : _count;
        Stud[] memory studz = new Stud[](n);
        for (uint256 i; i < n; ++i) {
            (uint256 tokenId, uint256 fee) = studs.at(_offset + i);
            studz[i] = Stud({tokenId: TokenId.wrap(tokenId), fee: fee});
        }
        return studz;
    }

    /// Returns the number of tokens that must be paid to breed the two trout.
    function getBreedingFee(TokenId _left, TokenId _right) public view returns (uint256 fee) {
        fee += _getBreedingFee(msg.sender, _left);
        fee += _getBreedingFee(msg.sender, _right);
        fee += _getMintFee(msg.sender);
    }

    function tokenURI(
        uint256 _tokenId
    ) public view virtual override(IERC721A, ERC721A) returns (string memory) {
        return tokenUris[TokenId.wrap(_tokenId)];
    }

    /// Returns a cost for the payer to breed the trout that is no larger than the list price.
    function _getBreedingFee(address _payer, TokenId _tokenId) internal view returns (uint256) {
        address owner = _ownerOf(_tokenId);
        if (owner == _payer) return 0;
        (bool exists, uint256 fee) = studs.tryGet(TokenId.unwrap(_tokenId));
        if (!exists) revert NotListed();
        return fee;
    }

    function _getMintFee(address _minter) internal view returns (uint256) {
        return _minter == owner() ? 0 : mintFee;
    }

    function _enqueueJob(Receipt memory _receipt) internal returns (JobId jobId) {
        // solhint-disable quotes
        string memory spec = string.concat(
            '{"_lilypad_template": "nftrout", "left": "',
            Strings.toString(TokenId.unwrap(_receipt.left)),
            '", "right": "',
            Strings.toString(TokenId.unwrap(_receipt.right)),
            '", "tokenId": "',
            Strings.toString(TokenId.unwrap(_receipt.tokenId)),
            '"}'
        );
        // solhint-enable quotes
        jobId = JobId.wrap(
            lilypadEvents.runBacalhauJob(address(this), spec, LilypadResultType.CID)
        );
        receipts[_receipt.tokenId] = _receipt;
        tokensByJob[jobId] = _receipt.tokenId;
    }

    function _pay(
        address _payee,
        uint256 _value,
        uint256 _ownerTakeBps
    ) internal returns (uint256 value) {
        uint256 take = (_value * _ownerTakeBps) / 10_000;
        earnings[_payee] += _value - take;
        earnings[owner()] += take;
        return _value;
    }

    function _mint(address _to) internal returns (TokenId tokenId) {
        tokenId = TokenId.wrap(_nextTokenId());
        _safeMint(_to, 1);
    }

    function _ownerOf(TokenId _id) internal view returns (address) {
        return ownerOf(TokenId.unwrap(_id));
    }

    function _startTokenId() internal view virtual override returns (uint256) {
        return 1;
    }
}
