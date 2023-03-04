// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import { Initializable } from "oz-upgradeable/proxy/utils/Initializable.sol";
import { OwnableUpgradeable } from "oz-upgradeable/access/OwnableUpgradeable.sol";
import { UUPSUpgradeable } from "oz-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import { PausableUpgradeable } from "oz-upgradeable/security/PausableUpgradeable.sol";
import { ERC721Upgradeable } from "oz-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import { ERC721BurnableUpgradeable } from "oz-upgradeable/token/ERC721/extensions/ERC721BurnableUpgradeable.sol";
import { ERC721URIStorageUpgradeable } from "oz-upgradeable/token/ERC721/extensions/ERC721URIStorageUpgradeable.sol";
import { LilypadCaller } from "./LilypadCaller.sol";
import { Errors } from "./libs/Errors.sol";

contract NFTMinter is 
    Initializable,
    OwnableUpgradeable,
    UUPSUpgradeable,
    PausableUpgradeable,
    ERC721Upgradeable,
    ERC721BurnableUpgradeable,
    ERC721URIStorageUpgradeable
{
    event TokenMinted(uint256 indexed tokenID, string uri);

    // solhint-disable-next-line const-name-snakecase
    string constant _myname = "NFTMinter";
    string constant _mysymbol = "";

    /// INIT

    /// @dev see { openzeppelin-contracts-upgradeable/contracts/proxy/utils/Initializable.sol }
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /// @dev see { openzeppelin-contracts-upgradeable/contracts/proxy/utils/Initializable.sol }
    function initialize() public virtual initializer {
        __Ownable_init();
        __UUPSUpgradeable_init();
        __Pausable_init();
        __ERC721_init(_myname, _mysymbol);
        __ERC721Burnable_init();
        __ERC721URIStorage_init();
    }

    /// EXTERNAL

    function name() public view virtual override returns (string memory _name) {
        _name = _myname;
    }

    function symbol() public view virtual override returns (string memory _symbol) {
        _symbol = _mysymbol;
    }

    function safeMint(
        address to,
        uint256 tokenID
    ) external whenNotPaused {
        // This enables us to release this restriction in the future
        if (msg.sender != to) revert Errors.NotAllowed();
        if (_exists(tokenID)) revert Errors.AlreadyClaimed();
        _safeMint(to, tokenID);
        emit TokenMinted(tokenID, "");
    }

    function burn(uint256 _tokenID) public virtual override(ERC721BurnableUpgradeable) whenNotPaused {
        _burn(_tokenID);
    }

    /// PAUSABLE

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    /// METADATA

    function tokenURI(
        uint256 tokenID
    ) public view virtual override(ERC721Upgradeable, ERC721URIStorageUpgradeable) returns (string memory _uri) {
        //_uri = ERC721URIStorageUpgradeable.uri(tokenID);
        _uri = "";
    }

    /// INTERNAL

    /// @dev see { openzeppelin-contracts-upgradeable/contracts/proxy/utils/UUPSUpgradeable.sol }
    function _authorizeUpgrade(address newImplementation) internal virtual override onlyOwner {
        // solhint-disable-previous-line no-empty-blocks
    }

    function _burn(uint256 _tokenID) internal virtual override(ERC721Upgradeable, ERC721URIStorageUpgradeable) {
        super._burn(_tokenID);
    }

    /**
     * @dev This empty reserved space is put in place to allow future versions to add new
     * variables without shifting down storage in the inheritance chain.
     * See https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps
     * Assuming 30 available slots (slots cost space, cost gas)
     * 1. TBD
     */
    uint256[30] private __gap;
}
