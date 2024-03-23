// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {
    ITaskAcceptor, TaskAcceptor
} from "@escrin/evm/contracts/tasks/v1/acceptors/TaskAcceptor.sol";
import {TimelockedDelegatedTaskAcceptor} from
    "@escrin/evm/contracts/tasks/v1/acceptors/DelegatedTaskAcceptor.sol";

import {IERC20, ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Burnable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import {IERC165} from "@openzeppelin/contracts/interfaces/IERC165.sol";

contract Scales is ERC20, ERC20Burnable, ERC20Permit, TimelockedDelegatedTaskAcceptor {
    error SenderIsFrozen();

    event TasksAccepted();

    mapping(address => bool) public frozen;

    constructor(address upstreamAcceptor, uint64 initialAcceptorTimelock)
        ERC20("Scales", "SCALE")
        ERC20Permit("Scales")
        TimelockedDelegatedTaskAcceptor(upstreamAcceptor, initialAcceptorTimelock)
    {}

    function supportsInterface(bytes4 interfaceId)
        public
        pure
        override(TaskAcceptor)
        returns (bool)
    {
        return interfaceId == type(IERC165).interfaceId
            || interfaceId == type(ITaskAcceptor).interfaceId || interfaceId == type(IERC20).interfaceId;
    }

    function _update(address from, address to, uint256 value) internal override {
        if (frozen[from] && to != address(0)) revert SenderIsFrozen();
        super._update(from, to, value);
    }

    struct Task {
        TaskKind kind;
        bytes payload;
    }

    enum TaskKind {
        Unknown,
        Mint,
        Freeze,
        Thaw
    }

    struct Mint {
        address account;
        // @dev uint128 old || uint128 new
        uint256 packedQuantities;
    }

    struct AccountBalance {
        address account;
        uint256 expectedBalance;
    }

    function _afterTaskResultsAccepted(
        uint256[] calldata,
        bytes calldata report,
        TaskIdSelector memory
    ) internal override {
        Task[] memory tasks = abi.decode(report, (Task[]));
        for (uint256 i; i < tasks.length; i++) {
            Task memory task = tasks[i];

            if (task.kind == TaskKind.Mint) {
                Mint[] memory mints = abi.decode(task.payload, (Mint[]));
                for (uint256 j; j < mints.length; j++) {
                    uint256 oldBalance = mints[j].packedQuantities >> 128;
                    if (balanceOf(mints[j].account) != oldBalance) continue;
                    _mint(mints[j].account, uint128(mints[j].packedQuantities));
                }
                return;
            }

            if (task.kind == TaskKind.Unknown) continue;

            AccountBalance[] memory abs = abi.decode(task.payload, (AccountBalance[]));
            for (uint256 j; j < abs.length; j++) {
                if (balanceOf(abs[j].account) != abs[j].expectedBalance) continue;
                frozen[abs[j].account] = task.kind == TaskKind.Freeze;
            }
        }
        emit TasksAccepted();
    }
}
