// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721URIStorage} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Counters} from "@openzeppelin/contracts/utils/Counters.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";
import {EnumerableMap} from "@openzeppelin/contracts/utils/structs/EnumerableMap.sol";

import {LilypadEvents} from "./lilypad/LilypadEvents.sol";
import {LilypadCallerInterface, LilypadResultType} from "./lilypad/LilypadCallerInterface.sol";

contract NFTrout is ERC721, ERC721URIStorage, LilypadCallerInterface, Ownable {
    using Counters for Counters.Counter;
    using EnumerableMap for EnumerableMap.UintToUintMap;

    /// The trout was listed as breedable.
    event Listed(uint256 tokenId, uint256 fee);
    /// The trout is no longer breedable.
    event Delisted(uint256 tokenId);
    /// Two trouts have bred to produce a new trout.
    event Spawned(uint256 left, uint256 right, uint256 child);

    struct Receipt {
        uint256 tokenId;
        uint256 left;
        uint256 right;
    }

    struct Stud {
        uint256 tokenId;
        uint256 fee;
    }

    uint256 public mintFee;
    /// job id -> receipt
    mapping(uint256 => Receipt) private receipts;
    LilypadEvents public lilypadEvents;
    Counters.Counter private tokenIdCounter;
    /// token id -> fee
    EnumerableMap.UintToUintMap private studs;

    modifier onlyLilypadEvents() {
        require(msg.sender == address(lilypadEvents), "not lilypad"); // close enough
        _;
    }

    modifier onlyTroutOwner(uint256 _tokenId) {
        require(ownerOf(_tokenId) == msg.sender, "not owner");
        _;
    }

    constructor(LilypadEvents _lilypadEvents) ERC721("NFTrout", "TROUT") {
        lilypadEvents = _lilypadEvents;
    }

    /// Transmutes money into trout.
    function mint() external payable returns (uint256 tokenId, uint256 jobId) {
        require(msg.value < mintFee, "payment required");
        tokenId = _mint(msg.sender);
        jobId = _enqueueJob(Receipt({tokenId: tokenId, left: 0, right: 0}));
    }

    /// Makes a trout breedable.
    function list(
        uint256 _tokenId,
        uint256 _fee
    ) external onlyTroutOwner(_tokenId) {
        studs.set(_tokenId, _fee);
        emit Listed(_tokenId, _fee);
    }

    /// Makes a trout not breedable.
    function delist(uint256 _tokenId) external onlyTroutOwner(_tokenId) {
        studs.remove(_tokenId);
        emit Delisted(_tokenId);
    }

    /// Breeds any two trout to produce a third trout that will be owned by the caller.
    /// This method must be called with enough value to pay for the two trouts' fees and the minting fee.
    function breed(
        uint256 _left,
        uint256 _right
    ) external payable returns (uint256 tokenId) {
        require(_left != _right, "trout cannot self-breed");
        uint256 change = msg.value;
        change = _payStudFee(msg.sender, _left, change);
        change = _payStudFee(msg.sender, _right, change);
        change -= mintFee;
        require(change == 0, "incorrect fee");
        tokenId = _mint(msg.sender);
        _enqueueJob(Receipt({left: _left, right: _right, tokenId: tokenId}));
        emit Spawned(_left, _right, tokenId);
    }

    /// If the trout didn't spawn correctly, you can call this as a last-ditch way to respawn it.
    function respawn(uint256 jobId) external {
        Receipt memory receipt = receipts[jobId];
        require(
            receipt.left != 0 && receipt.right != 0 && receipt.tokenId != 0,
            "no job"
        );
        _enqueueJob(receipt);
    }

    function setLilypadEvents(LilypadEvents _lilypadEvents) external onlyOwner {
        lilypadEvents = _lilypadEvents;
    }

    function setMintFee(uint256 amount) external onlyOwner {
        mintFee = amount;
    }

    function lilypadFulfilled(
        address,
        uint _jobId,
        LilypadResultType _resultType,
        string calldata _result
    ) external onlyLilypadEvents {
        require(_resultType == LilypadResultType.CID, "not CID");
        Receipt memory receipt = receipts[_jobId];
        _setTokenURI(receipt.tokenId, _result);
    }

    function lilypadCancelled(
        address,
        uint,
        string calldata
    ) external view onlyLilypadEvents {
        return; // That's unfortunate. Try `retryStuckJob`.
    }

    /// Paginated list of trout listed for breeding.
    function getStuds(
        uint256 offset,
        uint256 count
    ) external view returns (Stud[] memory) {
        uint256 start = offset > studs.length() ? studs.length() : offset;
        uint256 end = start + count;
        uint256 n = end > studs.length() ? studs.length() - start : count;
        Stud[] memory studz = new Stud[](n);
        for (uint256 i; i < n; ++i) {
            (uint256 tokenId, uint256 fee) = studs.at(offset + i);
            studz[i] = Stud({tokenId: tokenId, fee: fee});
        }
        return studz;
    }

    function _enqueueJob(
        Receipt memory _receipt
    ) internal returns (uint256 jobId) {
        // solhint-disable quotes
        string memory spec = string.concat(
            '{"_lilypad_template": "nftrout", "left": "',
            Strings.toString(_receipt.left),
            '", "right": "',
            Strings.toString(_receipt.right),
            '", "tokenId": "',
            Strings.toString(_receipt.tokenId),
            '"}'
        );
        // solhint-enable quotes
        jobId = lilypadEvents.runBacalhauJob(
            msg.sender,
            spec,
            LilypadResultType.CID
        );
        receipts[jobId] = _receipt;
    }

    function _mint(address receiver) internal returns (uint256 tokenId) {
        tokenId = tokenIdCounter.current();
        tokenIdCounter.increment();
        _safeMint(receiver, tokenId);
    }

    function _payStudFee(
        address _payer,
        uint256 _tokenId,
        uint256 _payment
    ) internal returns (uint256 change) {
        address owner = ownerOf(_tokenId);
        if (owner == _payer) return _payment;
        uint256 cost = studs.get(_tokenId, "not listed");
        payable(owner).transfer(cost);
        return _payment - cost;
    }

    // The following functions are overrides required by Solidity.

    function _burn(
        uint256 _tokenId
    ) internal override(ERC721, ERC721URIStorage) {
        super._burn(_tokenId);
    }

    function tokenURI(
        uint256 _tokenId
    ) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(_tokenId);
    }
}
