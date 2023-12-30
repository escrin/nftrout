<script setup lang="ts">
import { ethers } from 'ethers';
import { onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';

import TroutCard from '../components/TroutCard.vue';
import { useNFTrout } from '../contracts';
import { useEthereumStore } from '../stores/ethereum';
import { useTroutStore } from '../stores/nftrout';

const eth = useEthereumStore();
const nftrout = useNFTrout();
const troutStore = useTroutStore();

onMounted(async () => await troutStore.fetchTrout());

const pendingTrout = reactive(new Set<number>());

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

watch(eth, async (eth) => {
  if (eth.address) {
    clearTimeout(earningsPollerId);
    earningsPollerId = setTimeout(checkEarnings, eth.address ? 30 * 1000 : 1_000);
  }
  await Promise.all([troutStore.fetchTrout(), checkEarnings()]);
});

onBeforeUnmount(() => {
  clearInterval(earningsPollerId);
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
    suggestedDonation.value = earnings.value;
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

function hideIntro() {
  hidingIntro.value = true;
  window.localStorage.hideIntro = true;
}
</script>

<template>
  <main class="m-auto md:w-2/3 sm:w-4/5">
    <section class="flex flex-col" v-if="!hidingIntro">
      <h2>Introduction 🏞️</h2>
      <div class="p-5 backdropped inline-block mx-auto">
        <p class="padded !mt-0">
          NFTrout is an <i>autonomous</i> trout NFT breeding game. NFTrout is autonomous because
          trout genes are secret and known only to the game itself. Since nobody knows the genes,
          each trout is unpredictable and cannot be spontaneously generated, just like a real trout.
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
              <a href="https://chainlist.org/chain/23294">Oasis Sapphire</a> and ensure that it is
              funded.
            </span></li
          >
          <li>Click any two trout to initiate a breeding transaction.</li>
          <li>Send the tx to begin incubating your trout and join the TROUT community.</li>
          <li
            >Your new trout will incubate for a while. Longer incubation is associated with
            rarity.</li
          >
          <li
            >The baby trout appear under "Owned Trout". Owned trout can be farmed for breeding.</li
          >
        </ol>
        <h3>Tips</h3>
        <ul class="max-w-prose list-disc text-left m-auto list-inside padded">
          <li>Long-term NFTrout holders get special perks within the community.</li>
          <li>NFTrout does not collect any of your personal data.</li>
          <li>
            <span
              >This service is provided under the terms of the
              <a href="https://en.wikipedia.org/wiki/MIT_License" target="_blank">MIT License</a>.
              <a href="https://github.com/escrin/escrin" target="_blank">Here's</a>
              the
              <a
                href="https://github.com/escrin/nftrout/blob/main/evm/contracts/NFTrout.sol"
                target="_blank"
                >code</a
              >.
            </span>
          </li>
        </ul>
      </div>
      <button
        @click="hideIntro"
        class="bg-blue-600 px-2 py-1 my-6 rounded-md text-white mx-auto block"
      >
        Hide Introduction
      </button>
    </section>

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
          <span v-if="isDonating || false"> Thank you for donating ❤️! </span>
          <template v-else>
            Would you like to
            <button class="bg-sky-800 px-2 py-1 rounded-md text-white">donate</button>
            your <span>{{ ethers.formatEther(suggestedDonation) }}</span
            >&nbsp;{{ eth.currency }}
            earnings?
          </template>
        </form>
      </div>
      <div class="my-2">
        <p
          v-if="pendingTrout.size > 0"
          class="text-center px-3 py-2 font-medium text-white bg-blue-800 border-2 border-blue-700 inline-block mx-auto rounded-md"
        >
          You have {{ pendingTrout.size }} trout currently incubating.
          <span v-if="isBreeding">
            <br />
            A pair is currently breeding.
          </span>
        </p>
      </div>
      <ul class="flex flex-row flex-wrap">
        <li class="mx-auto my-5" v-for="trout in troutStore.ownedTrout" :key="trout.id">
          <TroutCard
            @selected="() => troutSelected(trout.id)"
            @feeUpdated="(fee: bigint) => troutStore.updateFee(trout.id, fee)"
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
        <li class="mx-auto m-5" v-for="trout in troutStore.farmedTrout" :key="trout.id">
          <TroutCard
            @selected="() => troutSelected(trout.id)"
            :trout="trout"
            :selected="isSelected(trout.id)"
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

section {
  @apply text-center;
}

h2 {
  @apply font-bold text-2xl mt-8 mb-4 text-center inline-block mx-auto px-5 py-2 backdropped;
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

.backdropped {
  @apply bg-sky-950/40 backdrop-blur-sm rounded-lg;
}
</style>
