# LilypadCaller









## Methods

### StableDiffusion

```solidity
function StableDiffusion(string _prompt) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _prompt | string | undefined |

### allImages

```solidity
function allImages() external view returns (struct LilypadCaller.StableDiffusionImage[])
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | LilypadCaller.StableDiffusionImage[] | undefined |

### bridge

```solidity
function bridge() external view returns (contract LilypadEvents)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | contract LilypadEvents | undefined |

### images

```solidity
function images(uint256) external view returns (string prompt, string ipfsResult)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| prompt | string | undefined |
| ipfsResult | string | undefined |

### lilypadCancelled

```solidity
function lilypadCancelled(address _from, uint256 _jobId, string _errorMsg) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _from | address | undefined |
| _jobId | uint256 | undefined |
| _errorMsg | string | undefined |

### lilypadFulfilled

```solidity
function lilypadFulfilled(address _from, uint256 _jobId, enum LilypadResultType _resultType, string _result) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _from | address | undefined |
| _jobId | uint256 | undefined |
| _resultType | enum LilypadResultType | undefined |
| _result | string | undefined |

### setLPEventsAddress

```solidity
function setLPEventsAddress(address _eventsAddress) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _eventsAddress | address | undefined |



## Events

### NewImageGenerated

```solidity
event NewImageGenerated(LilypadCaller.StableDiffusionImage image)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| image  | LilypadCaller.StableDiffusionImage | undefined |



