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
error NotOwner(); // 30cd7471 MM10cQ==
/// The token does not exist;
error NoSuchToken(TokenId id);
/// One of the trout you tried to breed is neither owned by you nor listed for public breeding.
error NotListed(); // 665c1c57 ZlwcVw==
/// Not enough value was sent.
error PaymentRequired(uint256 amount); // 8c4fcd93 jE/Nkw=b
/// A trout cannot breed with itself.
error CannotSelfBreed(); // 56938583 VpOFgw==

contract NFTrout is ERC721A, ERC721AQueryable, LilypadCallerInterface, Ownable {
    using EnumerableMap for EnumerableMap.UintToUintMap;

    /// The trout was listed as breedable.
    event Listed(TokenId indexed tokenId, uint256 fee);
    /// The trout is no longer breedable.
    event Delisted(TokenId indexed tokenId);
    /// Two trouts have bred to produce a new trout.
    event Spawned(TokenId indexed left, TokenId indexed right, JobId job, TokenId child);
    /// The trout has finished incubating.
    event Incubated(TokenId indexed tokenId);
    event FeesChanged(uint256 mintFee, uint256 matchmakingBps);

    struct Receipt {
        TokenId tokenId;
        TokenId left;
        TokenId right;
        JobId jobId;
    }

    struct Stud {
        TokenId tokenId;
        uint256 fee;
    }

    uint256 public mintFee;
    uint256 public matchmakingBps;
    mapping(address => uint256) public earnings;
    mapping(TokenId => Receipt) public receipts;
    LilypadEvents public lilypadEvents;

    /// token id -> fee
    EnumerableMap.UintToUintMap private studs;
    mapping(TokenId => string) private tokenCids;
    mapping(JobId => TokenId) private tokensByJob;

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
        uint256 _matchmakingBps,
        bool _genesisMint
    ) ERC721A("NFTrout Gen 1", "TROUT1") {
        lilypadEvents = _lilypadEvents;
        mintFee = _mintFee;
        matchmakingBps = _matchmakingBps;

        if (_genesisMint) {
            _mintERC2309(0xa885B1F77e4185F98b4D4dBe752B212B18b5d551, 36);
            _mintERC2309(0x56e5F834F88F9f7631E9d6a43254e173478cE06a, 35);
            _mintERC2309(0xF29Ac257c03CBA76DA7d3c4A34f2cA14B563260d, 25);
            _mintERC2309(0xbd34678C8e17d4D6F221B4Cb912D79C3443F8034, 12);
            _mintERC2309(0x7B9Bb19911763A372E35f95d0E31031C0884b6EC, 11);
            _mintERC2309(0xEd03EA9c96ec39097548256E428a163E5f524e47, 9);
            _mintERC2309(0x404E70A162487c9Af8982a89a5453f389d5257b1, 6);
            _mintERC2309(0x7Fdb709F97dcd5F5a51054aD84A51107B2C15EF3, 5);
            _mintERC2309(0xAE378d2e106d5C3ebDb7D960BD9c9093e23e680F, 4);
            _mintERC2309(0x0532Bf0916F509883eaA1ECA5b270D753E152855, 3);
            _mintERC2309(0x2772c7DF084Cbe204576731d711B622234BdD9A7, 3);
            _mintERC2309(0xa9ad6C62611884672DfEf7e20a115778C4b0bAb1, 1);
        }
    }

    /// Transmutes money into trout.
    function mint() external payable returns (Receipt memory) {
        uint256 fee = _getMintFee(msg.sender);
        if (_pay(owner(), fee, 0) != msg.value) revert PaymentRequired(mintFee);
        TokenId tokenId = _mint(msg.sender);
        TokenId z = TokenId.wrap(0);
        return _spawn(tokenId, z, z);
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
        if (!_exists(_left)) revert NoSuchToken(_left);
        if (!_exists(_right)) revert NoSuchToken(_right);
        if (TokenId.unwrap(_left) == TokenId.unwrap(_right)) revert CannotSelfBreed();

        uint256 subtotal;
        subtotal += _pay(owner(), _getMintFee(msg.sender), 0);
        subtotal += _pay(_ownerOf(_left), _getBreedingFee(msg.sender, _left), matchmakingBps);
        subtotal += _pay(_ownerOf(_right), _getBreedingFee(msg.sender, _right), matchmakingBps);
        if (subtotal != msg.value) revert PaymentRequired(subtotal);
        tokenId = _mint(msg.sender);
        _spawn(tokenId, _left, _right);
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
        emit FeesChanged(_mintFee, _matchBps);
    }

    function lilypadFulfilled(
        address,
        uint256 _jobId,
        LilypadResultType _resultType,
        string calldata _result
    ) external onlyLilypadEvents {
        if (_resultType != LilypadResultType.CID) return;
        JobId jobId = JobId.wrap(_jobId);
        TokenId tokenId = tokensByJob[jobId];
        if (!_exists(tokenId)) return;
        tokenCids[tokenId] = _result;
        emit Incubated(tokenId);
    }

    function lilypadCancelled(address, uint256 _jobId, string calldata) external onlyLilypadEvents {
        JobId jobId = JobId.wrap(_jobId);
        TokenId tokenId = tokensByJob[jobId];
        if (bytes(tokenCids[tokenId]).length > 0) return;
        Receipt memory receipt = receipts[tokensByJob[jobId]];
        _doSpawn(receipt.tokenId, receipt.left, receipt.right);
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
    /// This is also the minting fee when the parents are unset.
    function getBreedingFee(TokenId _left, TokenId _right) public view returns (uint256 fee) {
        fee += _getBreedingFee(msg.sender, _left);
        fee += _getBreedingFee(msg.sender, _right);
        fee += _getMintFee(msg.sender);
    }

    function tokenURI(
        uint256 _tokenId
    ) public view virtual override(IERC721A, ERC721A) returns (string memory) {
        return string.concat("ipfs://", tokenCids[TokenId.wrap(_tokenId)]);
    }

    /// Returns a cost for the payer to breed the trout that is no larger than the list price.
    function _getBreedingFee(address _payer, TokenId _tokenId) internal view returns (uint256) {
        if (TokenId.unwrap(_tokenId) == 0 || _payer == _ownerOf(_tokenId)) return 0;
        (bool exists, uint256 fee) = studs.tryGet(TokenId.unwrap(_tokenId));
        if (!exists) revert NotListed();
        return fee;
    }

    function _getMintFee(address _minter) internal view returns (uint256) {
        return _minter == owner() ? 0 : mintFee;
    }

    function _spawn(
        TokenId _id,
        TokenId _left,
        TokenId _right
    ) internal returns (Receipt memory receipt) {
        receipt = _doSpawn(_id, _left, _right);
        emit Spawned(_left, _right, receipt.jobId, _id);
    }

    function _doSpawn(
        TokenId _id,
        TokenId _left,
        TokenId _right
    ) internal returns (Receipt memory receipt) {
        // solhint-disable quotes
        string memory spec = string.concat(
            '{"_lilypad_template": "nftrout", "left": "',
            tokenCids[_left],
            '", "right": "',
            tokenCids[_right],
            '", "tokenId": "',
            Strings.toString(TokenId.unwrap(_id)),
            '"}'
        );
        // solhint-enable quotes
        JobId jobId = JobId.wrap(
            lilypadEvents.runBacalhauJob(address(this), spec, LilypadResultType.CID)
        );
        receipt = Receipt({tokenId: _id, left: _left, right: _right, jobId: jobId});
        receipts[_id] = receipt;
        tokensByJob[receipt.jobId] = receipt.tokenId;
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

    function _exists(TokenId _id) internal view returns (bool) {
        return _exists(TokenId.unwrap(_id));
    }

    function _startTokenId() internal view virtual override returns (uint256) {
        return 1;
    }
}
