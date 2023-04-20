// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import {TaskAcceptorV1, TaskIdSelectorOps} from "@escrin/evm/contracts/tasks/acceptor/TaskAcceptor.sol";
import {DelegatedTaskAcceptorV1} from "@escrin/evm/contracts/tasks/acceptor/DelegatedTaskAcceptor.sol";
import {TaskHubNotifier} from "@escrin/evm/contracts/tasks/widgets/TaskHubNotifier.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/security/Pausable.sol";
import {EnumerableMap} from "@openzeppelin/contracts/utils/structs/EnumerableMap.sol";
import {ERC721A} from "erc721a/contracts/ERC721A.sol";
import {IERC721A} from "erc721a/contracts/IERC721A.sol";
import {ERC721AQueryable} from "erc721a/contracts/extensions/ERC721AQueryable.sol";

type TokenId is uint256;

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

contract NFTrout is ERC721AQueryable, Ownable, Pausable, TaskHubNotifier, DelegatedTaskAcceptorV1 {
    using EnumerableMap for EnumerableMap.UintToUintMap;
    using TaskIdSelectorOps for TaskIdSelector;

    /// The trout was listed as breedable.
    event Listed(TokenId indexed tokenId, uint256 fee);
    /// The trout is no longer breedable.
    event Delisted(TokenId indexed tokenId);
    /// A new trouthas been spawned.
    event Spawned(TokenId indexed left, TokenId indexed right, TokenId child);
    /// The trout has finished incubating.
    event Incubated(TokenId indexed tokenId);
    event MintRewardChanged(uint256 mintReward);
    event MatchmakingFeeChanged(uint256 matchmakingBps);

    struct Stud {
        TokenId tokenId;
        uint256 fee;
    }

    uint256 public mintReward;
    uint256 public matchmakingBps;
    mapping(address => uint256) public earnings;

    /// token id -> fee
    EnumerableMap.UintToUintMap private studs;
    mapping(TokenId => string) private tokenCids;

    modifier onlyTroutOwner(TokenId _tokenId) {
        if (msg.sender != _ownerOf(_tokenId)) revert NotOwner();
        _;
    }

    constructor(
        address _taskHub,
        address _taskAcceptor,
        uint256 _mintReward,
        uint256 _matchmakingBps,
        bool _genesisMint
    ) ERC721A("NFTrout", "TROUT") TaskHubNotifier(_taskHub) DelegatedTaskAcceptorV1(_taskAcceptor) {
        mintReward = _mintReward;
        matchmakingBps = _matchmakingBps;

        if (_genesisMint) {
            _safeMint(0xa885B1F77e4185F98b4D4dBe752B212B18b5d551, 36);
            _safeMint(0xF29Ac257c03CBA76DA7d3c4A34f2cA14B563260d, 25);
            _safeMint(0xEd03EA9c96ec39097548256E428a163E5f524e47, 23);
            _safeMint(0xbd34678C8e17d4D6F221B4Cb912D79C3443F8034, 12);
            _safeMint(0x7B9Bb19911763A372E35f95d0E31031C0884b6EC, 11);
            _safeMint(0x404E70A162487c9Af8982a89a5453f389d5257b1, 6);
            _safeMint(0x7Fdb709F97dcd5F5a51054aD84A51107B2C15EF3, 5);
            _safeMint(0xAE378d2e106d5C3ebDb7D960BD9c9093e23e680F, 4);
            _safeMint(0x0532Bf0916F509883eaA1ECA5b270D753E152855, 3);
            _safeMint(0x2772c7DF084Cbe204576731d711B622234BdD9A7, 3);
            _safeMint(0xa9ad6C62611884672DfEf7e20a115778C4b0bAb1, 3);
            _safeMint(0x1441bbbE1564d0b3e489f7C5bCC4f0c5EC4C4cd8, 2);
            _safeMint(0xd634351C0e586ebC0B192D8573c0524AA1bC459F, 1);
            _safeMint(0x74BDF046024CDF112F1d881526e6F05d278D35a0, 1);
            _safeMint(0x739A5776F98E50bc2a453C0142cff8597b50DEA7, 1);
            _safeMint(0x74BDF046024CDF112F1d881526e6F05d278D35a0, 1);
            taskHub().notify();
        }
    }

    /// Transmutes money into trout.
    function mint() external payable whenNotPaused notify {
        if (_pay(address(this), mintReward, 0) != msg.value) revert PaymentRequired(mintReward);
        _safeMint(msg.sender, 1);
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
    function breed(TokenId _left, TokenId _right) external payable whenNotPaused notify {
        if (!_exists(_left)) revert NoSuchToken(_left);
        if (!_exists(_right)) revert NoSuchToken(_right);
        if (TokenId.unwrap(_left) == TokenId.unwrap(_right)) revert CannotSelfBreed();

        uint256 subtotal;
        subtotal += mintReward;
        subtotal += _pay(_ownerOf(_left), _getBreedingFee(msg.sender, _left), matchmakingBps);
        subtotal += _pay(_ownerOf(_right), _getBreedingFee(msg.sender, _right), matchmakingBps);
        if (subtotal != msg.value) revert PaymentRequired(subtotal);
        _safeMint(msg.sender, 1);
    }

    function withdraw() external {
        uint256 stack = earnings[msg.sender];
        earnings[msg.sender] = 0;
        payable(msg.sender).transfer(stack);
    }

    function setMintReward(uint256 _mintReward) external onlyOwner {
        mintReward = _mintReward;
        emit MintRewardChanged(_mintReward);
    }

    function setMatchmakingFee(uint256 _matchBps) external onlyOwner {
        matchmakingBps = _matchBps;
        emit MatchmakingFeeChanged(_matchBps);
    }

    function setTaskHub(address _newTaskHub) external onlyOwner {
        _setTaskHub(_newTaskHub);
    }

    function setTaskAcceptor(address _newTaskAcceptor) external onlyOwner {
        _setTaskAcceptor(_newTaskAcceptor);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
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

    function tokenURI(
        uint256 _tokenId
    ) public view override(IERC721A, ERC721A) returns (string memory) {
        return string.concat("ipfs://", tokenCids[TokenId.wrap(_tokenId)]);
    }

    /// Returns the number of tokens that must be paid to breed the two trout.
    function getBreedingFee(
        address breeder,
        TokenId _left,
        TokenId _right
    ) public view returns (uint256 fee) {
        fee = mintReward;
        fee += _getBreedingFee(breeder, _left);
        fee += _getBreedingFee(breeder, _right);
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

    /// Returns a cost for the payer to breed the trout that is no larger than the list price.
    function _getBreedingFee(address _payer, TokenId _tokenId) internal view returns (uint256) {
        if (TokenId.unwrap(_tokenId) == 0 || _payer == _ownerOf(_tokenId)) return 0;
        (bool exists, uint256 fee) = studs.tryGet(TokenId.unwrap(_tokenId));
        if (!exists) revert NotListed();
        return fee;
    }

    function _ownerOf(TokenId _id) internal view returns (address) {
        return ownerOf(TokenId.unwrap(_id));
    }

    function _exists(TokenId _id) internal view returns (bool) {
        return _exists(TokenId.unwrap(_id));
    }

    function _startTokenId() internal pure override returns (uint256) {
        return 1;
    }

    function _afterTaskResultsAccepted(
        uint256[] calldata _taskIds,
        bytes calldata _report,
        address _submitter,
        TaskIdSelector memory _selected
    ) internal override {
        string[] memory cids = abi.decode(_report, (string[]));
        for (uint256 i; i < cids.length; ++i) {
            TokenId tokenId = TokenId.wrap(_taskIds[i]);
            tokenCids[tokenId] = cids[i];
        }
        uint256 payout = _selected.countSelected(_taskIds.length) * mintReward;
        if (payout > 0) payable(_submitter).transfer(payout);
    }
}
