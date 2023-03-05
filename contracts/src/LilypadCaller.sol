// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import { console } from "hardhat/console.sol";
import { Errors } from "./libs/Errors.sol";
import { LilypadEvents } from "lilypad/contracts/LilypadEvents.sol";
import { LilypadCallerInterface, LilypadResultType } from "lilypad/contracts/LilypadCallerInterface.sol";

contract LilypadCaller is LilypadCallerInterface {
    LilypadEvents public bridge;
    
    struct StableDiffusionImage {
        string prompt;
        string ipfsResult;
    }

    StableDiffusionImage[] public images;
    mapping (uint => string) prompts;

    event NewImageGenerated(StableDiffusionImage image);

    constructor(address bridgeContract) {
        console.log("Deploying StableDiffusion contract");
        setLPEventsAddress(bridgeContract);
    }

    function setLPEventsAddress(address _eventsAddress) public {
        bridge = LilypadEvents(_eventsAddress);
    }

    /**
    string constant specStart = '{'
        '"Engine": "docker",'
        '"Verifier": "noop",'
        '"Publisher": "estuary",'
        '"Docker": {'
        '"Image": "ghcr.io/bacalhau-project/examples/stable-diffusion-gpu:0.0.1",'
        '"Entrypoint": ["python", "main.py", "--o", "./outputs", "--p", "';

    string constant specEnd =
        '"]},'
        '"Resources": {"GPU": "1"},'
        '"Outputs": [{"Name": "outputs", "Path": "/outputs"}],'
        '"Deal": {"Concurrency": 1}'
        '}';
    */

    string constant specStart = '{'
        '"Engine": "docker",'
        '"Verifier": "noop",'
        '"Publisher": "estuary",'
        '"Docker": {'
        '"Image": "docker.io/nhdh/gsc-stable-diffusion-cpu:0.0.1",'
        '"Entrypoint": ["./generate.sh", "';

    string constant specEnd =
        '"]},'
        '"Resources": {"TEE": true},'
        '"Outputs": [{"Name": "outputs", "Path": "/outputs"}],'
        '"Deal": {"Concurrency": 1}'
        '}';

    function StableDiffusion(string calldata _prompt) external {
        // TODO: do proper json encoding, look out for quotes in _prompt
        string memory spec = string.concat(specStart, _prompt, specEnd);
        uint id = bridge.runBacalhauJob(address(this), spec, LilypadResultType.CID);
        prompts[id] = _prompt;
    }

    function allImages() public view returns (StableDiffusionImage[] memory) {
        return images;
    }

    function lilypadFulfilled(address _from, uint _jobId, LilypadResultType _resultType, string calldata _result) external override {
        //need some checks here that it a legitimate result
        require(_from == address(bridge)); //really not secure
        require(_resultType == LilypadResultType.CID);

        StableDiffusionImage memory image = StableDiffusionImage({
            ipfsResult: _result,
            prompt: prompts[_jobId]
        });
        images.push(image);
        emit NewImageGenerated(image);
        delete prompts[_jobId];
    }

    function lilypadCancelled(address _from, uint _jobId, string calldata _errorMsg) external override {
        require(_from == address(bridge)); //really not secure
        console.log(_errorMsg);
        delete prompts[_jobId];
    }

    /**
     * @dev This empty reserved space is put in place to allow future versions to add new
     * variables without shifting down storage in the inheritance chain.
     * See https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps
     * Assuming 30 available slots (slots cost space, cost gas)
     * 1. merkleRoots
     * 2. hasBeenClaimed
     * 3. maxUnits
     * 4. minted
     */
    uint256[26] private __gap;
}
