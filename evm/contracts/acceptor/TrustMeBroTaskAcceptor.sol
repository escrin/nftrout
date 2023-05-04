// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import {ITaskAcceptorV1} from "@escrin/evm/contracts/tasks/acceptor/ITaskAcceptor.sol";

/// The `TrustMeBroTaskAcceptor` is the first step in fully autonomizing NFTrout.
/// The `setTaskAcceptor` method in NFTrout allows this one to be replaced with something that checks the validity of the TEE that spawned the trout.
/// Along with `setOwner`, these methods allow NFTrout to be owned autonomously in cooperation with TROUTDAO.
contract TrustMeBroTaskAcceptor is ITaskAcceptorV1 {
    address public immutable trustedSender;

    constructor(address _trustedSender) {
        trustedSender = _trustedSender;
    }

    function acceptTaskResults(
        uint256[] calldata,
        bytes calldata,
        bytes calldata
    ) external virtual returns (TaskIdSelector memory) {
        require(msg.sender == trustedSender, "not trusted sender");
        return TaskIdSelector({
            quantifier: Quantifier.All,
            taskIds: new uint256[](0)
        });
    }
}
