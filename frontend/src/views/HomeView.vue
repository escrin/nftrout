<script setup lang="ts">
import { BigNumber } from 'ethers';
import { CirclesToRhombusesSpinner } from 'epic-spinners';
import { computed, reactive, ref } from 'vue';
import { ContentLoader } from 'vue-content-loader';

import type { NFTrout } from '@escrin/nftrout-evm';

import TroutCard from '../components/TroutCard.vue';
import { useNFTrout } from '../contracts';
import { useEthereumStore } from '../stores/ethereum';
import type { Trout } from '../trouts';

const eth = useEthereumStore();
const nftrout = useNFTrout();

type BlockTag = number | string;

const trouts = reactive<Record<string, Trout>>({});
const myTrouts = computed(() => Object.values(trouts).filter((t) => t.owned ?? false));
const notMyBreedableTrouts = computed(() =>
  Object.values(trouts).filter((t) => !t.owned && t.fee !== undefined),
);
const loadingMyTrouts = ref(true);
const loadingBreedable = ref(true);

async function fetchMyTrouts(nftrout: NFTrout, blockTag: number): Promise<void> {
  loadingMyTrouts.value = true;
  await eth.connect();
  if (!eth.address) return;
  const troutIds = await nftrout.callStatic.tokensOfOwner(eth.address!, { blockTag });
  await Promise.all(
    troutIds.map(async (id) => {
      const key = id.toHexString();
      if (trouts[key] === undefined) {
        const cid = await nftrout.callStatic.tokenURI(id, { blockTag });
        if (!cid) return;
        trouts[key] = {
          id,
          owned: true,
          cid,
        };
      } else {
        trouts[key].owned = true;
      }
    }),
  );
  loadingMyTrouts.value = false;
}

async function fetchBreedableTrouts(nftrout: NFTrout, blockTag: BlockTag): Promise<void> {
  loadingBreedable.value = true;
  const batchSize = 100;
  for (let offset = 0; ; offset += batchSize) {
    let studs: NFTrout.StudStructOutput[] = [];
    try {
      studs = await nftrout.callStatic.getStuds(offset, batchSize, {
        blockTag,
      });
    } catch (e: any) {
      console.error('failed to fetch studs', e);
      break;
    }
    await Promise.all(
      studs.map(async ({ tokenId, fee }) => {
        const key = tokenId.toHexString();
        if (trouts[key] === undefined) {
          const uri = await nftrout.callStatic.tokenURI(tokenId);
          if (!uri) return;
          trouts[key] = {
            id: tokenId,
            fee,
            cid: uri.replace('ipfs://', ''),
            owned: false,
          };
        } else {
          trouts[key].fee = fee;
        }
      }),
    );
    if (studs.length < batchSize) break;
  }
  loadingBreedable.value = false;
}

(async () => {
  const { number: blockTag } = await eth.provider.getBlock('latest');
  await Promise.all([
    fetchMyTrouts(nftrout.value!, blockTag),
    fetchBreedableTrouts(nftrout.value!, blockTag),
  ]);
})();

const selectedTrouts = ref<string[]>([]);
function isSelected(troutId: string): boolean {
  for (const selId of selectedTrouts.value) {
    if (selId === troutId) return true;
  }
  return false;
}

const breeding = ref(false);

async function troutSelected(troutId: string) {
  console.log('selected', troutId);
  if (isSelected(troutId)) {
    console.log('troutisselected');
    selectedTrouts.value = selectedTrouts.value.filter((tid) => tid !== troutId);
    return;
  }
  selectedTrouts.value.push(troutId);
  if (selectedTrouts.value.length < 2) return;
  breeding.value = true;
  const [leftId, rightId] = selectedTrouts.value;
  const fee = await nftrout.value.callStatic.getBreedingFee(leftId, rightId);
  try {
    const tx = await nftrout.value.breed(leftId, rightId, { value: fee });
    const receipt = await tx.wait();
    let newTokenId = BigNumber.from(0);
    for (const event of receipt.events ?? []) {
      if (event.event !== 'Transfer') continue;
      newTokenId = BigNumber.from(receipt.events![0].topics[3]);
      break;
    }
    if (!newTokenId) throw new Error('breeding did not create new token');
    let uri = '';
    while (uri === '') {
      await new Promise((resolve) => setTimeout(resolve, 3_000));
      uri = await nftrout.value.callStatic.tokenURI(newTokenId);
    }
    trouts[newTokenId.toHexString()] = {
      id: newTokenId,
      cid: uri.replace('ipfs://', ''),
      owned: true,
    };
  } finally {
    selectedTrouts.value.splice(0, selectedTrouts.value.length);
    breeding.value = false;
  }
}
</script>

<template>
  <main class="py-5 m-auto md:w-2/3 sm:w-4/5">
    <h2 class="">My Trout 🎣</h2>
    <div>
      <template v-if="loadingMyTrouts">
        <ContentLoader class="inline" width="278" height="128">
          <rect x="0" y="0" width="128" height="128" />
          <rect x="150" y="0" width="128" height="128" />
        </ContentLoader>
      </template>
      <ul v-else class="flex flex-row flex-wrap">
        <li class="m-5" v-for="trout in myTrouts" :key="trout.id.toHexString()">
          <TroutCard
            @selected="() => troutSelected(trout.id.toHexString())"
            :trout="trout"
            :selected="isSelected(trout.id.toHexString())"
            :editable="true"
          />
        </li>
        <li
          v-if="breeding"
          class="m-5 flex flex-col items-center justify-center border-2 border-gray-500 rounded-sm"
          style="width: 128px; height: 128px"
        >
          <CirclesToRhombusesSpinner :circleSize="9" />
        </li>
      </ul>
    </div>

    <h2 class="">Breedable Trout 🎏</h2>
    <div>
      <template v-if="loadingBreedable">
        <ContentLoader class="inline" width="428" height="128">
          <rect x="0" y="0" width="128" height="128" />
          <rect x="150" y="0" width="128" height="128" />
          <rect x="300" y="0" width="128" height="128" />
        </ContentLoader>
      </template>
      <ul v-else class="flex flex-row flex-wrap">
        <li class="m-5" v-for="trout in notMyBreedableTrouts" :key="trout.id.toHexString()">
          <TroutCard
            @selected="() => troutSelected(trout.id.toHexString())"
            :trout="trout"
            :selected="isSelected(trout.id.toHexString())"
          />
        </li>
      </ul>
    </div>
  </main>
</template>

<style scoped lang="postcss">
form {
  @apply text-center;
}

input {
  @apply block my-4 p-1 mx-auto text-3xl text-center border border-gray-400 rounded-md;
}

h2 {
  @apply font-bold text-2xl my-2 bg-white bg-opacity-50 inline-block px-3 py-1 rounded-lg;
}

button {
  @apply block mx-auto my-4 p-2 rounded-xl font-medium transition-transform enabled:hover:scale-110 enabled:active:scale-90 disabled:scale-90 disabled:bg-gray-400;
  width: 7ch;
  height: 2.5em;
}
</style>
