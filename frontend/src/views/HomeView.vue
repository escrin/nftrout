<script setup lang="ts">
import { BigNumber } from 'ethers';
import { computed, reactive, ref } from 'vue';

import type { NFTrout } from '@escrin/nftrout-evm';

import TroutCard from '../components/TroutCard.vue';
import { useNFTrout } from '../contracts';
import { useEthereumStore } from '../stores/ethereum';
import type { Trout } from '../trouts';

const eth = useEthereumStore();
const nftrout = useNFTrout();

type BlockTag = number | string;

const troutSorter = (a: Trout, b: Trout) => a.id.sub(b.id).toNumber();

const trouts = reactive<Record<string, Trout>>({});
const myTrouts = computed(() => {
  const ts = Object.values(trouts).filter((t) => t.cid && (t.owned ?? false));
  ts.sort(troutSorter);
  return ts;
});
const notMyBreedableTrouts = computed(() => {
  const ts = Object.values(trouts).filter((t) => t.cid && !t.owned && t.fee !== undefined);
  ts.sort(troutSorter);
  return ts;
});
const loadingMyTrouts = ref(true);
const loadingBreedable = ref(true);

const pendingTrout = reactive(new Set<string>());

async function fetchMyTrouts(nftrout: NFTrout, blockTag: number): Promise<void> {
  loadingMyTrouts.value = true;
  await eth.connect();
  if (!eth.address) return;
  const troutIds = await nftrout.callStatic.tokensOfOwner(eth.address!, { blockTag });
  await Promise.all(
    troutIds.map(async (id) => {
      const key = id.toHexString();
      const cid = await troutCid(nftrout, id, blockTag);
      if (!cid) watchPendingTroutCid(key);
      if (trouts[key] === undefined) {
        trouts[key] = {
          id,
          key,
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

async function troutCid(
  nftrout: NFTrout,
  troutId: BigNumber,
  blockTag: string | number = 'latest',
): Promise<string> {
  try {
    const uri = await nftrout.callStatic.tokenURI(troutId, { blockTag });
    const cid = uri.replace('ipfs://', '');
    if (!cid) throw new Error('no uri');
    const res = await fetch(`https://ipfs.escrin.org/ipfs/${cid}/outputs/trout.svg`, {
      mode: 'cors',
    });
    if (!res.ok) throw new Error('request failed');
    return cid;
  } catch {
    return '';
  }
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
        const cid = await troutCid(nftrout, tokenId);
        if (!cid) {
          watchPendingTroutCid(key);
          return;
        }
        if (trouts[key] === undefined) {
          trouts[key] = {
            id: tokenId,
            key,
            fee,
            cid,
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

function watchPendingTroutCid(key: string) {
  const wait = 60 * 1000;
  pendingTrout.add(key);
  async function watcher() {
    const cid = await troutCid(nftrout.value, BigNumber.from(key));
    if (cid) {
      trouts[key].cid = cid;
      pendingTrout.delete(key);
      return;
    }
    setTimeout(watcher, wait);
  }
  setTimeout(watcher, wait);
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

const isBreeding = ref(false);

async function troutSelected(troutId: string) {
  if (isBreeding.value) return;
  if (isSelected(troutId)) {
    selectedTrouts.value = selectedTrouts.value.filter((tid) => tid !== troutId);
    return;
  }
  selectedTrouts.value.push(troutId);
  if (selectedTrouts.value.length < 2) return;
  isBreeding.value = true;
  const [leftId, rightId] = selectedTrouts.value;
  const fee = await nftrout.value.callStatic.getBreedingFee(leftId, rightId);
  try {
    const tx = await nftrout.value.breed(leftId, rightId, { value: fee });
    console.log('breeding', tx.hash);
    const receipt = await tx.wait();
    console.log('breeding completed');
    let newTokenId = BigNumber.from(0);
    for (const event of receipt.events ?? []) {
      if (event.event !== 'Transfer') continue;
      newTokenId = BigNumber.from(receipt.events![0].topics[3]);
      break;
    }
    if (!newTokenId) throw new Error('breeding did not create new token');
    const key = newTokenId.toHexString();
    watchPendingTroutCid(key);
    trouts[key] = {
      id: newTokenId,
      key,
      cid: '',
      owned: true,
    };
  } finally {
    selectedTrouts.value.splice(0, selectedTrouts.value.length);
    isBreeding.value = false;
  }
}
</script>

<template>
  <main class="m-auto md:w-2/3 sm:w-4/5">
    <section class="text-center">
      <h2>Owned Trout 🎣</h2>
      <div class="my-2">
        <p
          v-if="pendingTrout.size > 0"
          class="text-center px-3 py-2 font-medium bg-blue-200 border-2 border-blue-700 inline-block mx-auto rounded-md"
        >
          Waiting on {{ pendingTrout.size }} trout to spawn.
          <span v-if="isBreeding">
            <br />
            A pair is currently breeding.
          </span>
        </p>
      </div>
      <ul class="flex flex-row flex-wrap">
        <li class="mx-auto my-5" v-for="trout in myTrouts" :key="trout.key">
          <TroutCard
            @selected="() => troutSelected(trout.key)"
            @feeUpdated="(fee) => (trouts[trout.key].fee = fee)"
            :trout="trout"
            :selected="isSelected(trout.key)"
            :selectable="!isBreeding"
            :editable="selectedTrouts.length == 1"
          />
        </li>
      </ul>
    </section>

    <section>
      <h2>Trout Market 🎏</h2>
      <ul class="flex flex-row flex-wrap">
        <li class="mx-auto m-5" v-for="trout in notMyBreedableTrouts" :key="trout.key">
          <TroutCard
            @selected="() => troutSelected(trout.key)"
            :trout="trout"
            :selected="isSelected(trout.key)"
            :selectable="!isBreeding"
          />
        </li>
      </ul>
    </section>
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
  @apply font-bold text-2xl mt-8 mb-4 text-center;
}

button {
  @apply block mx-auto my-4 p-2 rounded-xl font-medium transition-transform enabled:hover:scale-110 enabled:active:scale-90 disabled:scale-90 disabled:bg-gray-400;
  width: 7ch;
  height: 2.5em;
}
</style>
