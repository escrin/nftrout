// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import {TrustedSenderTaskAcceptorV1} from "@escrin/evm/contracts/tasks/acceptor/TrustedSenderTaskAcceptor.sol";

/// The `TrustMeBroTaskAcceptor` is the first step in fully autonomizing NFTrout.
/// The `setTaskAcceptor` method in NFTrout allows this one to be replaced with something that checks the validity of the TEE that spawned the trout.
/// Along with `setOwner`, these methods allow NFTrout to be owned autonomously in cooperation with TROUTDAO.
contract TrustMeBroTaskAcceptor is TrustedSenderTaskAcceptorV1 {
    constructor(address _trustedSender) TrustedSenderTaskAcceptorV1(_trustedSender) {
        return;
    }
}
