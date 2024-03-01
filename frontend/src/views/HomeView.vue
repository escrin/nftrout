<script setup lang="ts">
import { ethers } from 'ethers';
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';

import Aquarium from '../components/Aquarium.vue';
import Header from '../components/Header.vue';
import TroutCard from '../components/TroutCard.vue';
import TroutModal from '../components/TroutModal.vue';
import { useNFTrout } from '../contracts';
import { useEthereumStore } from '../stores/ethereum';
import type { TokenId, Trout } from '../stores/nftrout';
import { useTroutStore } from '../stores/nftrout';

const eth = useEthereumStore();
const nftrout = useNFTrout();
const troutStore = useTroutStore();

const selectedTrouts = ref<number[]>([]);
function isSelected(troutId: number): boolean {
  for (const selId of selectedTrouts.value) {
    if (selId === troutId) return true;
  }
  return false;
}

const isBreeding = ref(false);

async function troutSelected(troutId: number) {
  if (isBreeding.value) return;
  if (isSelected(troutId)) {
    selectedTrouts.value = selectedTrouts.value.filter((tid) => tid !== troutId);
    return;
  }
  await eth.connect();
  selectedTrouts.value.push(troutId);
  if (selectedTrouts.value.length < 2) return;
  isBreeding.value = true;
  const [leftId, rightId] = selectedTrouts.value;
  try {
    if (!nftrout.value || !eth.address) return;
    const fee = await nftrout.value.getBreedingFee(eth.address, leftId, rightId);
    const tx = await nftrout.value.breed(leftId, rightId, { value: fee, ...eth.txOpts });
    console.log('breeding', tx.hash);
    const receipt = await tx.wait();
    console.log('breeding completed');
    let newTokenId = 0n;
    for (const log of receipt?.logs ?? []) {
      if (log instanceof ethers.EventLog) {
        if (log.eventName !== 'Transfer') continue;
        newTokenId = ethers.getBigInt(log.args[2]);
        break;
      } else {
        const event = nftrout.value.interface.parseLog(
          log as unknown as { data: string; topics: string[] },
        );
        if (event?.name !== 'Transfer') continue;
        newTokenId = ethers.getBigInt(event.args[2]);
      }
    }
    if (!newTokenId) throw new Error('breeding did not create new token');
    troutStore.incLocalPendingCount();
  } finally {
    selectedTrouts.value.splice(0, selectedTrouts.value.length);
    isBreeding.value = false;
  }
}

const earnings = ref(0n);
let earningsPollerId: ReturnType<typeof setInterval>;

async function checkEarnings() {
  if (!nftrout.value) return;
  const caller = eth.address;
  if (caller) {
    earnings.value = await nftrout.value.earnings(caller);
  }
}

const connected = ref(false);
eth.$subscribe(async () => {
  if (connected.value) return;
  if (eth.address) {
    clearInterval(earningsPollerId);
    earningsPollerId = setInterval(checkEarnings, 180 * 1000);
  }
  await Promise.allSettled([troutStore.fetchTrout(), checkEarnings()]);
  connected.value = true;
});

let troutPollerId: ReturnType<typeof setInterval>;

onMounted(async () => {
  if (window.localStorage.hasConnected) await eth.connect();
  troutPollerId = setInterval(async () => troutStore.fetchTrout(), 180 * 1000);
  if (!eth.address) {
    await troutStore.fetchTrout().catch(() => {});
  }
});

onBeforeUnmount(() => {
  clearInterval(earningsPollerId);
  clearInterval(troutPollerId);
});

const isWithdrawing = ref(false);
const isDonating = ref(false);
const suggestedDonation = ref(0n);

async function withdrawEarnings() {
  if (!nftrout.value) return 0n;
  isWithdrawing.value = true;
  try {
    const tx = await nftrout.value.withdraw(eth.txOpts);
    console.log('withdrawing', tx);
    const receipt = await tx.wait();
    if (receipt?.status !== 1) throw new Error('withdraw failed');
    suggestedDonation.value = earnings.value / 10n;
    earnings.value = 0n;
  } finally {
    isWithdrawing.value = false;
  }
}

async function donateEarnings() {
  try {
    isDonating.value = true;
    const tx = await eth.signer!.sendTransaction({
      to: '0x45708C2Ac90A671e2C642cA14002C6f9C0750057',
      value: suggestedDonation.value,
    });
    console.log('donating', tx.hash);
    await tx.wait();
    console.warn('Thank you for your donation!');
    suggestedDonation.value = 0n;
  } finally {
    isDonating.value = false;
  }
}

const hidingIntro = ref<boolean>(!!(window.localStorage.hideIntro ?? false));
function toggleIntro(vis: boolean) {
  hidingIntro.value = !vis;
  window.localStorage.hideIntro = !vis;
}
const hideIntro = () => toggleIntro(false);
const showIntro = () => toggleIntro(true);

type Sorters = Record<
  'id' | 'fee' | 'popularity' | 'inbreeding' | 'name',
  {
    available: boolean;
    name: string;
    makeComparator: () => (a: Trout, b: Trout) => number;
  }
>;

const sorters: Sorters = {
  id: {
    available: true,
    name: 'Birthday',
    makeComparator: () => (a, b) => a.id - b.id,
  },
  fee: {
    available: true,
    name: 'Stud Fee',
    makeComparator:
      () =>
      ({ fee: afee = 0n }, { fee: bfee = 0n }) =>
        afee > bfee ? 1 : afee < bfee ? -1 : 0,
  },
  popularity: {
    available: troutStore.mode === 'indexed',
    name: 'Popularity',
    makeComparator: () => {
      const breedCount = new Map<number, number>();
      for (const { parents } of Object.values(troutStore.trout)) {
        if (!parents) continue;
        const [l, r] = parents;
        if (l.chainId === eth.network) {
          breedCount.set(l.tokenId, (breedCount.get(l.tokenId) ?? 0) + 1);
        }
        if (r.chainId === eth.network) {
          breedCount.set(r.tokenId, (breedCount.get(r.tokenId) ?? 0) + 1);
        }
      }
      return (a, b) => (breedCount.get(a.id) ?? 0) - (breedCount.get(b.id) ?? 0);
    },
  },
  inbreeding: {
    available: troutStore.mode === 'indexed',
    name: 'Inbreeding',
    makeComparator: () => (a, b) => {
      if (a.coi === b.coi) return a.id - b.id;
      return (a.coi ?? 0) - (b.coi ?? 0);
    },
  },
  name: {
    available: troutStore.mode === 'indexed',
    name: 'Has Name',
    makeComparator: () => {
      const sortId = (id: number): number => {
        const day = Math.floor(new Date().getTime() / (1000 * 60 * 60 * 24));
        id = id ^ day;
        id = ((id >> 16) ^ id) * 0x45d9f3b;
        id = ((id >> 16) ^ id) * 0x45d9f3b;
        id = (id >> 16) ^ id;
        return id;
      };
      const rv = new Map<TokenId, number>();
      for (const { id, name } of Object.values(troutStore.trout)) {
        const hasName = !name.startsWith('Sapphire TROUT #');
        rv.set(id, hasName ? -sortId(id) : 0);
      }
      return (a, b) => rv.get(a.id)! - rv.get(b.id)!;
    },
  },
};

const sortOption = ref<keyof Sorters>('id');
const sortDirection = ref<'asc' | 'desc'>('asc');
watch(sortOption, (s) => {
  if (s === 'id' || s === 'fee' || s === 'name') sortDirection.value = 'asc';
  else sortDirection.value = 'desc';
});
const sorter = computed(() => {
  const sorter = sorters[sortOption.value];
  const compare = sorter.makeComparator();
  return sortDirection.value === 'asc' ? compare : (a: Trout, b: Trout) => -compare(a, b);
});

const menuTroutId = ref<TokenId | undefined>();
const instaShowContext = ref(false);
async function troutContext(troutId: number) {
  if (!instaShowContext.value) await eth.connect();
  instaShowContext.value = !eth.address;
  menuTroutId.value = troutId;
}
</script>

<template>
  <div class="w-screen h-[100lvh] flex flex-col">
    <Header class="absolute top-0 left-0 z-50" />
    <Aquarium />
  </div>
  <main class="m-auto md:w-2/3 sm:w-4/5">
    <section class="flex flex-col" v-if="!hidingIntro">
      <h2>Introduction 🏞️</h2>
      <div class="p-5 blur-bg inline-block mx-auto">
        <p class="padded !mt-0">
          NFTrout is an <i>autonomous</i> trout NFT breeding game based on the
          <a href="https://escrin.org" target="_blank">Escrin</a> autonomous computing network.
          NFTrout is fun and exciting because trout genes are secret and known only to the game
          itself. Since nobody knows the genes, each trout is unpredictable and unique, just like a
          real trout.
        </p>
        <h3>How to Play</h3>
        <ol class="max-w-prose list-decimal text-left m-auto list-inside padded">
          <li class="my-2"
            ><span
              >Connect your Ethereum-compatible wallet to
              <a href="https://chainlist.org/chain/23294">Oasis Sapphire</a> and ensure that it is
              <a
                href="https://docs.oasis.io/general/manage-tokens/how-to-transfer-rose-into-paratime"
                target="_blank"
                >funded</a
              >.
            </span></li
          >
          <li class="my-2">Click any two trout to initiate a breeding transaction.</li>
          <li class="my-2">Approve and send the transaction to spawn and begin incubation.</li>
          <li class="my-2"
            >Your new trout will be generated by an
            <a href="https://escrin.org" target="_blank">Escrin</a> Smart Worker. It takes a few
            minutes, and will succeed 100% of the time.</li
          >
          <li class="my-2"
            >The new trout will appear under "Owned Trout". Owned trout can be farmed for breeding,
            which brings in passive ROSE income. You can unfarm any time.</li
          >
        </ol>

        <h3>Tips</h3>
        <ul class="max-w-prose list-disc text-left m-auto list-inside padded">
          <li class="my-2">Right click on a trout to see details and additional options.</li>
          <li class="my-2">Due to genetics, a trout will look like its parents.</li>
          <li class="my-2"
            >NFTrout receives regular upgrades every Thursday. Check the
            <a href="https://github.com/escrin/nftrout/issues" target="_blank">issue tracker</a>
            for planned big features like trout racing.</li
          >
        </ul>

        <h3>FAQ</h3>
        <ul class="max-w-prose list-disc text-left m-auto list-inside padded">
          <li class="my-2"
            >Join our <a href="https://escrin.org/discord" target="_blank">Discord</a>,
            <a href="https://escrin.org/twitter" target="_blank">X (Twitter)</a>, or
            <a href="https://escrin.org/telegram" target="_blank">Telegram</a> communities for
            updates, assistance, and general camaraderie.</li
          >
          <li class="my-2">NFTrout holders get special perks within the Oasis community.</li>
          <li class="my-2"
            >There is and will forever be an 80 ROSE breeding fee that is paid to the Escrin network
            for trusted computation.</li
          >
          <li class="my-2">Rest assured that NFTrout does not collect your personal data.</li>
          <li class="my-2">There is no limit on the number of trout you may have.</li>
        </ul>
      </div>
      <button
        @click="hideIntro"
        class="bg-blue-600 px-2 py-1 my-6 rounded-md text-white mx-auto block"
      >
        Hide Introduction
      </button>
    </section>
    <button
      v-if="hidingIntro"
      @click="showIntro"
      class="bg-gray-600 px-2 py-1 my-6 rounded-md text-white mx-auto block opacity-70 text-sm"
    >
      Show Introduction
    </button>

    <div
      class="flex text-center px-4 py-2 mt-14 mb-4 font-medium text-gray-800 border-2 border-gray-800 bg-gray-200 w-fit mx-auto rounded-md b"
    >
      <div class="me-1">
        Sort by:
        <select v-model="sortOption" class="bg-transparent">
          <option
            v-for="[field, sort] in Object.entries(sorters).filter(([_, s]) => s.available)"
            :key="field"
            :value="field"
          >
            {{ sort.name }}
          </option>
        </select>
      </div>
      <div
        class="ms-1 cursor-pointer"
        v-if="sortDirection == 'desc'"
        @click="sortDirection = 'asc'"
      >
        ↓
      </div>
      <div
        class="ms-1 cursor-pointer"
        v-if="sortDirection == 'asc'"
        @click="sortDirection = 'desc'"
      >
        ↑
      </div>
    </div>

    <section>
      <h2>Owned Trout 🎣</h2>
      <div class="my-2 flex flex-col">
        <form
          v-if="earnings !== 0n"
          @submit.prevent="withdrawEarnings"
          class="cashout-form border-yellow-400 bg-yellow-100"
        >
          You have <span class="text-green-800">{{ ethers.formatEther(earnings) }}</span
          >&nbsp;{{ eth.currency }}
          <span v-if="isWithdrawing"> being withdrawn now. </span>
          <template v-else>
            available to
            <button class="bg-green-500 px-2 py-1 rounded-md text-white">withdraw</button>
          </template>
        </form>
        <form
          v-if="suggestedDonation !== 0n"
          @submit.prevent="donateEarnings"
          class="cashout-form border-sky-400 bg-sky-100"
        >
          <span v-if="isDonating"> Thank you for donating ❤️! </span>
          <template v-else>
            Would you like to
            <button class="bg-sky-800 px-2 py-1 rounded-md text-white">donate</button>
            10% (<span>{{ ethers.formatEther(suggestedDonation) }}</span
            >&nbsp;{{ eth.currency }}) to
            <a href="https://www.tu.org/" target="_blank">trout conservation</a>?
          </template>
        </form>
      </div>
      <div class="my-2">
        <p
          v-if="troutStore.pendingCount > 0"
          class="text-center px-3 py-2 font-medium text-white bg-blue-800 border-2 border-blue-700 inline-block mx-auto rounded-md"
        >
          You have {{ troutStore.pendingCount }} trout currently incubating.
          <span v-if="isBreeding">
            <br />
            A pair is currently breeding.
          </span>
        </p>
      </div>
      <ul class="flex flex-row flex-wrap">
        <li
          class="mx-auto my-5"
          v-for="trout in [...troutStore.ownedTrout].sort(sorter)"
          :key="trout.id"
        >
          <TroutCard
            @selected="() => troutSelected(trout.id)"
            @feeUpdated="(fee: bigint) => troutStore.updateFee(trout.id, fee)"
            @menu="() => troutContext(trout.id)"
            :trout="trout"
            :selected="isSelected(trout.id)"
            :selectable="!isBreeding"
            :editable="selectedTrouts.length == 1"
          />
        </li>
      </ul>
    </section>

    <section>
      <h2>Trout Farm 🎏</h2>
      <ul class="flex flex-row flex-wrap">
        <li
          class="mx-auto m-5"
          v-for="trout in [...troutStore.farmedTrout].sort(sorter)"
          :key="trout.id"
        >
          <TroutCard
            @selected="() => troutSelected(trout.id)"
            @menu="() => troutContext(trout.id)"
            :trout="trout"
            :selected="isSelected(trout.id)"
            :selectable="!isBreeding"
          />
        </li>
      </ul>
    </section>
  </main>
  <TroutModal :showingTrout="menuTroutId" @close="menuTroutId = undefined" />
</template>

<style scoped lang="postcss">
input {
  @apply p-1 border border-gray-400 rounded-md;
}

section {
  @apply text-center;
}

h2 {
  @apply font-bold text-2xl mt-8 mb-4 text-center inline-block mx-auto px-5 py-2 blur-bg rounded-lg;
}

h3 {
  @apply font-medium text-xl mt-6 mb-4 text-center;
}

p {
  @apply m-auto text-left max-w-prose my-4;
}

a {
  @apply underline;
}

.padded {
  @apply px-2 md:px-0;
}

.cashout-form {
  @apply text-center px-3 py-2 font-medium border-2 mx-auto rounded-md text-gray-900 my-2;
}

.blur-bg {
  @apply bg-sky-950/40 backdrop-blur-sm;
}
</style>
