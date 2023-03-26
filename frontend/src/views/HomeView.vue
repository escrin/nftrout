<script setup lang="ts">
import { BigNumber } from "ethers";
import { CirclesToRhombusesSpinner } from "epic-spinners";
import { computed, reactive, ref, watch } from "vue";
import { ContentLoader } from "vue-content-loader";

import type { NFTrout } from "@escrin/nftrout-evm";

import TroutCard from "../components/TroutCard.vue";
import { useNFTrout } from "../contracts";
import { useEthereumStore } from "../stores/ethereum";
import type { Trout } from "../trouts";

const eth = useEthereumStore();
const nftrout = useNFTrout();

type BlockTag = number | string;

const trouts = reactive<Record<string, Trout>>({});
const myTrouts = computed(() =>
  Object.values(trouts).filter((t) => t.owned ?? false)
);
const notMyBreedableTrouts = computed(() =>
  Object.values(trouts).filter((t) => !t.owned && t.fee !== undefined)
);
const loadingMyTrouts = ref(true);
const loadingBreedable = ref(true);

async function fetchMyTrouts(
  nftrout: NFTrout,
  blockTag: number
): Promise<void> {
  loadingMyTrouts.value = true;
  if (!eth.address) return;
  const numTrouts = await nftrout.callStatic.balanceOf(eth.address, {
    blockTag,
  });
  const troutIdPs: Promise<BigNumber>[] = [];
  for (let i = 0; i < numTrouts.toNumber(); i++) {
    troutIdPs.push(
      nftrout.callStatic.tokenOfOwnerByIndex(eth.address!, i, { blockTag })
    );
  }
  const troutIds = await Promise.all(troutIdPs);
  await Promise.all(
    troutIds.map(async (id) => {
      const key = id.toHexString();
      if (trouts[key] === undefined) {
        const imageUrl = await nftrout.callStatic.tokenURI(id, { blockTag });
        if (!imageUrl) return;
        trouts[key] = {
          id,
          owned: true,
          imageUrl,
        };
      } else {
        trouts[key].owned = true;
      }
    })
  );
  loadingMyTrouts.value = false;
}

async function fetchBreedableTrouts(
  nftrout: NFTrout,
  blockTag: BlockTag
): Promise<void> {
  loadingBreedable.value = true;
  const batchSize = 100;
  for (let offset = 0; ; offset += batchSize) {
    let studs: NFTrout.StudStructOutput[] = [];
    try {
      studs = await nftrout.callStatic.getStuds(offset, batchSize, {
        blockTag,
      });
    } catch (e: any) {
      console.error("failed to fetch studs", e);
      break;
    }
    await Promise.all(
      studs.map(async ({ tokenId, fee }) => {
        const key = tokenId.toHexString();
        if (trouts[key] === undefined) {
          const imageUrl = await nftrout.callStatic.tokenURI(tokenId);
          if (!imageUrl) return;
          trouts[key] = {
            id: tokenId,
            fee,
            imageUrl,
            owned: false,
          };
        } else {
          trouts[key].fee = fee;
        }
      })
    );
    if (studs.length < batchSize) break;
  }
  loadingBreedable.value = false;
}

const mintingFee = ref<BigNumber | undefined>();

(async () => {
  await eth.connect();
  loadingMyTrouts.value = false;
  loadingBreedable.value = false;
  for (let i = 0; i < 15; i++) {
    trouts[BigNumber.from(i).toHexString()] = {
      id: BigNumber.from(i),
      fee: BigNumber.from(0),
      imageUrl:
        "https://img.plasmic.app/img-optimizer/v1/img/2af909482e749130fd3c55041746e8b6.png?q=75",
      owned: Math.random() < 0.3,
    };
  }
  nftrout.value.callStatic
    .mintFee()
    .then((f) => (mintingFee.value = f))
    .catch(() => {});
  // const { number: blockTag } = await eth.provider.getBlock('latest');
  // await Promise.all([
  // fetchMyTrouts(nftrout.value!, blockTag),
  // fetchBreedableTrouts(nftrout.value!, blockTag),
  // ]);
})();

const selectedTrouts = ref<string[]>([]);
function isSelected(troutId: string): boolean {
  for (const selId of selectedTrouts.value) {
    if (selId === troutId) return true;
  }
  return false;
}

const breeding = ref(false);

async function troutSelected(e: Event) {
  if (breeding.value || !e.target || !(e.target instanceof HTMLElement)) return;
  const troutId = e.target.getAttribute("data-troutid")!;
  if (!troutId) return;
  selectedTrouts.value.push(troutId);
  if (selectedTrouts.value.length < 2) return;
  const [leftId, rightId] = selectedTrouts.value;
  const [left, right] = selectedTrouts.value.map((id) => trouts[id]);
  const zero = BigNumber.from(0);
  const leftFee = left.owned ? zero : left.fee ?? zero;
  const rightFee = right.owned ? zero : right.fee ?? zero;
  const mintFee = mintingFee.value ?? zero;
  const fee = leftFee.add(rightFee).add(mintFee);
  breeding.value = true;
  try {
    const tx = await nftrout.value.breed(leftId, rightId, { value: fee });
    console.log("breeding", tx.hash);
    const receipt = await tx.wait();
    let newTokenId = BigNumber.from(0);
    for (const event of receipt.events ?? []) {
      if (
        event.address === nftrout.value.address &&
        event.event === "Spawned"
      ) {
        newTokenId = BigNumber.from(event.data.slice(event.data.length - 64));
      }
    }
    if (!newTokenId) return;
    setTimeout(async () => {
      trouts[newTokenId.toHexString()].imageUrl =
        await nftrout.value.callStatic.tokenURI(newTokenId);
    }, 30_000);
  } finally {
    selectedTrouts.value.splice(0, selectedTrouts.value.length);
    breeding.value = false;
  }
}
</script>

<template>
  <main style="max-width: 60ch" class="py-5 m-auto w-4/5">
    <h2>My Trout 🎣</h2>
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
            @click="troutSelected"
            :trout="{ ...trout, fee: undefined }"
            :data-troutid="trout.id.toHexString()"
            :selected="isSelected(trout.id.toHexString())"
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

    <h2>Breedable Trout 🎏</h2>
    <div>
      <template v-if="loadingBreedable">
        <ContentLoader class="inline" width="428" height="128">
          <rect x="0" y="0" width="128" height="128" />
          <rect x="150" y="0" width="128" height="128" />
          <rect x="300" y="0" width="128" height="128" />
        </ContentLoader>
      </template>
      <ul v-else class="flex flex-row flex-wrap">
        <li
          class="m-5"
          v-for="trout in notMyBreedableTrouts"
          :key="trout.id.toHexString()"
        >
          <TroutCard
            @click="troutSelected"
            :trout="trout"
            :data-troutid="trout.id.toHexString()"
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
  @apply font-bold text-2xl my-2;
}

button {
  @apply block mx-auto my-4 p-2 rounded-xl font-medium transition-transform enabled:hover:scale-110 enabled:active:scale-90 disabled:scale-90 disabled:bg-gray-400;
  width: 7ch;
  height: 2.5em;
}
</style>
