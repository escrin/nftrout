<script setup lang="ts">
import { BigNumber, ethers } from 'ethers';
import { computed, ref } from 'vue';

import { useNFTrout } from '../contracts';
import type { Trout } from '../trouts';
import { Network, useEthereumStore } from '../stores/ethereum';

const eth = useEthereumStore();

const nftrout = useNFTrout();

const emit = defineEmits(['feeUpdated', 'selected']); // TODO: use pinia store

const props = defineProps<{
  trout: Trout;
  scale?: number;
  selected?: boolean;
  selectable?: boolean;
  editable?: boolean;
}>();
const scale = computed(() => props.scale ?? 0.45);
const imageUrl = computed(
  () => `https://ipfs.escrin.org/ipfs/${props.trout.cid}/outputs/trout.svg`,
);
const w = computed(() => 500 * scale.value + 2);

function formatFee(fee: BigNumber): string {
  return fee.isZero() ? '0' : ethers.utils.formatEther(fee);
}

const fee = ref<number | undefined>((props.trout.fee?.div(1e15).toNumber() ?? 0) / 1e3);
const feeBig = computed(() => BigNumber.from(Math.floor((fee.value ?? 0) * 1e9)).mul(1e9));
const isListing = ref(false);

async function zlistTrout(e: Event) {
  if (e.target instanceof HTMLFormElement) {
    e.target.checkValidity();
    e.target.reportValidity();
  }
  e.preventDefault();
  isListing.value = true;
  try {
    if (props.trout.fee && !fee.value) await delistTrout();
    else if (props.trout.fee !== feeBig.value) await listTrout();
    emit('feeUpdated', feeBig.value);
  } finally {
    isListing.value = false;
  }
}

async function listTrout() {
  if (!nftrout.value) return;
  if (!fee.value) throw new Error('cannot list trout without fee');
  const tx = await nftrout.value.list(props.trout.id, feeBig.value, eth.txOpts);
  console.log('listing trout', tx.hash);
  const receipt = await tx.wait();
  if (receipt.status !== 1) throw new Error('tx failed');
  console.log('trout listed');
}

async function delistTrout() {
  if (!nftrout.value) return;
  const tx = await nftrout.value.delist(props.trout.id, eth.txOpts);
  console.log('delisting trout', tx.hash);
  const receipt = await tx.wait();
  if (receipt.status !== 1) throw new Error('tx failed');
  console.log('trout delisted');
}
</script>

<template>
  <div class="bg-white border-gray-600 border-4 rounded-md" :class="{ selected: props.selected }">
    <div
      @click="$emit('selected')"
      class="bg-contain bg-no-repeat bg-cover enabled:cursor-pointer rounded-sm"
      :style="{
        'background-image': `url('${imageUrl}')`,
        width: `${w}px`,
        height: `${300 * scale + 4}px`,
      }"
    >
      <p v-if="props.trout.fee !== undefined" class="fishhead float-right">
        <span>{{ formatFee(props.trout.fee) }} {{ eth.currency }}</span>
      </p>
      <p class="fishhead float-left">
        <span class="pl-1">#{{ props.trout.id }}</span>
      </p>
    </div>
    <form
      v-if="props.editable && selected"
      class="absolute -translate-y-full text-center py-1 backdrop-blur-sm flex justify-around items-center text-gray-700 rounded-b-sm text-sm"
      @submit.stop="zlistTrout"
      :style="{ width: `${w}px` }"
    >
      <span>Stud Fee:</span>
      <span>
        <input
          required
          :disabled="isListing && props.selectable"
          type="number"
          min="0"
          step="1"
          v-model="fee"
          class="w-12 border"
          @click.stop="() => {}"
        />
        {{ eth.currency }}
      </span>
      <button
        v-if="!isListing"
        :disabled="
          isListing ||
          (!props.trout.fee && !fee) ||
          (props.trout.fee && feeBig.eq(props.trout.fee)) ||
          !props.selectable
        "
        class="enabled:bg-rose-500 disabled:bg-gray-400 px-3 py-1 rounded-md text-white enabled:cursor-pointer"
        :class="{ delist: props.trout.fee && !fee }"
      >
        <span v-if="props.trout.fee && !fee">Delist</span>
        <span v-else-if="props.trout.fee">Relist</span>
        <span v-else>List</span>
      </button>
      <span v-else-if="!fee">Delisting</span>
      <span v-else>Listing</span>
    </form>
  </div>
</template>

<style lang="postcss" scoped>
.selected {
  @apply border-rose-500;
}

fieldset legend {
  @apply mx-1 px-1;
}

.fishhead {
  @apply p-1 text-center text-xs m-1 px-1 font-medium text-gray-700;
}

.delist {
  @apply bg-sky-500;
}
</style>
