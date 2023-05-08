<script setup lang="ts">
import { BigNumber, ethers } from 'ethers';
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';

import type { NFTrout } from '@escrin/nftrout-evm';

import TroutCard from '../components/TroutCard.vue';
import { sapphireWrap, useNFTrout } from '../contracts';
import { Network, useEthereumStore } from '../stores/ethereum';
import type { Trout } from '../trouts';
import { troutCid } from '../trouts';

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
  if (!eth.address) return;
  const troutIds = await nftrout.callStatic.tokensOfOwner(eth.address!, { blockTag });
  const chainId = eth.network;
  await Promise.all(
    troutIds.map(async (id) => {
      const key = id.toHexString();
      const cid = await troutCid(nftrout, id, blockTag);
      if (!cid) watchPendingTroutCid(key);
      if (trouts[key] === undefined) {
        trouts[key] = {
          chainId,
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
            chainId: eth.network,
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

function watchPendingTroutCid(troutId: string) {
  const wait = 3 * 60 * 1000;
  pendingTrout.add(troutId);
  async function watcher() {
    if (!nftrout.value) return;
    const cid = await troutCid(nftrout.value, BigNumber.from(troutId));
    if (cid) {
      trouts[troutId].cid = cid;
      pendingTrout.delete(troutId);
      return;
    }
    setTimeout(watcher, wait);
  }
  setTimeout(watcher, wait);
}

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
  try {
    if (!nftrout.value || !eth.address) return;
    const fee = await sapphireWrap(nftrout.value).callStatic.getBreedingFee(
      eth.address,
      leftId,
      rightId,
    );
    const tx = await nftrout.value.breed(leftId, rightId, { value: fee, ...eth.txOpts });
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
      chainId: eth.network,
      key,
      cid: '',
      owned: true,
    };
  } finally {
    selectedTrouts.value.splice(0, selectedTrouts.value.length);
    isBreeding.value = false;
  }
}

const earnings = ref(BigNumber.from(0));
let earningsPollerId: ReturnType<typeof setInterval>;

async function checkEarnings() {
  if (!nftrout.value) return;
  const caller = await nftrout.value?.signer?.getAddress();
  if (caller) {
    earnings.value = await nftrout.value.callStatic.earnings(caller);
  }
  earningsPollerId = setTimeout(checkEarnings, caller ? 30 * 1000 : 1_000);
}

watch(eth, async (eth) => {
  const { number: latestBlock } = await eth.provider.getBlock('latest');
  const blockTag = latestBlock - (eth.network === Network.SapphireMainnet ? 2 : 0);
  await Promise.all([
    fetchBreedableTrouts(nftrout.value!, blockTag),
    fetchMyTrouts(nftrout.value!, blockTag),
    checkEarnings(),
  ]);
});

onMounted(() => eth.connect());

onBeforeUnmount(() => {
  clearInterval(earningsPollerId);
});

const isWithdrawing = ref(false);
const isDonating = ref(false);
const suggestedDonation = ref(BigNumber.from(0).mul(1e9).mul(1e9));

async function withdrawEarnings() {
  if (!nftrout.value) return BigNumber.from(0);
  isWithdrawing.value = true;
  try {
    const tx = await nftrout.value.withdraw(eth.txOpts);
    console.log('withdrawing', tx);
    const receipt = await tx.wait();
    if (receipt.status !== 1) throw new Error('withdraw failed');
    suggestedDonation.value = earnings.value;
    earnings.value = BigNumber.from(0);
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
    suggestedDonation.value = BigNumber.from(0);
  } finally {
    isDonating.value = false;
  }
}

const hidingIntro = ref<boolean>(!!window.localStorage.hideIntro ?? false);

function hideIntro() {
  hidingIntro.value = true;
  window.localStorage.hideIntro = true;
}
</script>

<template>
  <main class="m-auto md:w-2/3 sm:w-4/5">
    <section class="text-center" v-if="!hidingIntro">
      <h2>Introduction 🏞️</h2>
      <p class="padded">
        NFTrout is an <i>autonomous</i> trout NFT breeding game. NFTrout is autonomous because trout
        genes are secret and known only to the game itself. Since nobody knows the genes, each trout
        is unpredictable and cannot be spontaneously generated, just like a real trout.
      </p>
      <p class="padded">
        NFTrout is a tech demo of the
        <a href="https://escrin.org" target="_blank">Escrin</a> autonomous computing network. You
        can connect with our mission of making secure computing accessible to all on
        <a href="https://discord.gg/KpNYB2F42a" target="_blank">Discord</a> or
        <a href="https://twitter.com/EnshrineCC" target="_blank">Twitter</a>.
      </p>
      <h3>How to Play</h3>
      <ol class="max-w-prose list-decimal text-left m-auto list-inside padded">
        <li
          ><span
            >Connect your browser wallet to
            <a href="https://chainlist.org/chain/23294">Oasis Sapphire</a> or
            <a href="https://chainlist.org/chain/314" target="_blank">Filecoin</a> and ensure that
            it is funded.
          </span></li
        >
        <li>Click any two trout to initiate a breeding transaction.</li>
        <li>Send the tx to begin incubating your trout and join the TROUT community.</li>
        <li
          >Your new trout will incubate for a while. Longer incubation is associated with
          rarity.</li
        >
        <li>The baby trout appear under "Owned Trout". Owned trout can be farmed for breeding.</li>
      </ol>
      <h3>Tips</h3>
      <ul class="max-w-prose list-disc text-left m-auto list-inside padded">
        <li>Long-term NFTrout holders get special perks within the community.</li>
        <li>NFTrout does not collect any of your personal data.</li>
        <li>
          <span
            >This service is provided under the terms of the
            <a href="https://en.wikipedia.org/wiki/MIT_License" target="_blank">MIT License</a>.
            <a
              href="https://github.com/escrin/nftrout/blob/main/evm/contracts/NFTrout.sol"
              target="_blank"
              >Here's</a
            >
            the
            <a
              href="https://github.com/escrin/escrin/blob/main/evm/contracts/enclave-identity"
              target="_blank"
              >code</a
            >.
          </span>
        </li>
      </ul>
      <button @click="hideIntro" class="bg-blue-900 px-2 py-1 my-6 rounded-md text-white mx-auto">
        Hide Introduction
      </button>
    </section>

    <section class="text-center">
      <h2>Owned Trout 🎣</h2>
      <div class="my-2 flex flex-col">
        <form
          v-if="!earnings.isZero()"
          @submit.prevent="withdrawEarnings"
          class="cashout-form border-yellow-400 bg-yellow-100"
        >
          You have <span class="text-green-800">{{ ethers.utils.formatEther(earnings) }}</span
          >&nbsp;{{ eth.currency }}
          <span v-if="isWithdrawing"> being withdrawn now. </span>
          <template v-else>
            available to
            <button class="bg-green-500 px-2 py-1 rounded-md text-white">withdraw</button>
          </template>
        </form>
        <form
          v-if="!suggestedDonation.isZero()"
          @submit.prevent="donateEarnings"
          class="cashout-form border-sky-400 bg-sky-100"
        >
          <span v-if="isDonating || false"> Thank you for donating ❤️! </span>
          <template v-else>
            Would you like to
            <button class="bg-sky-800 px-2 py-1 rounded-md text-white">donate</button>
            your <span>{{ ethers.utils.formatEther(suggestedDonation) }}</span
            >&nbsp;{{ eth.currency }}
            earnings?
          </template>
        </form>
      </div>
      <div class="my-2">
        <p
          v-if="pendingTrout.size > 0"
          class="text-center px-3 py-2 font-medium bg-blue-200 border-2 border-blue-700 inline-block mx-auto rounded-md"
        >
          You have {{ pendingTrout.size }} trout currently incubating.
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
      <h2>Trout Farm 🎏</h2>
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
input {
  @apply block my-4 p-1 mx-auto text-3xl text-center border border-gray-400 rounded-md;
}

h2 {
  @apply font-bold text-2xl mt-8 mb-4 text-center;
}

h3 {
  @apply font-medium text-xl my-4 text-center;
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
</style>
