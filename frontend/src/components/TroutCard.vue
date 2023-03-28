<script setup lang="ts">
import type { BigNumber } from "ethers";
import { ethers } from "ethers";
import { computed, defineProps, ref } from "vue";

import { useNFTrout } from "../contracts";
import type { Trout } from "../trouts";

const nftrout = useNFTrout();

const emit = defineEmits(["feeUpdated", "selected"]); // TODO: use pinia store

const props = defineProps<{
  trout: Trout;
  scale?: number;
  selected?: boolean;
  editable?: boolean;
}>();
const scale = computed(() => props.scale ?? 3 / 8);
const imageUrl = computed(
  () => `https://gateway.ipfs.io${props.trout.cid}/outputs/trout.svg`
);

function formatFee(fee: BigNumber): string {
  return fee.isZero() ? "0 FIL" : `${ethers.utils.formatEther(fee)} FIL`;
}

const fee = ref<number | undefined>(undefined);
const listDisabled = ref(false);

async function listTrout(e: Event) {
  if (e.target instanceof HTMLFormElement) {
    e.target.checkValidity();
    e.target.reportValidity();
  }
  e.preventDefault();
  listDisabled.value = true;
  try {
    if (!fee.value) return;
    const tx = await nftrout.value.list(
      props.trout.id,
      ethers.utils.parseEther(fee.value.toString())
    );
    console.log("listing trout", tx.hash);
    const receipt = await tx.wait();
    if (receipt.status !== 1) throw new Error("tx failed");
    emit("feeUpdated", fee);
    console.log("trout listed");
  } catch {
    listDisabled.value = false;
  }
}
</script>

<template>
  <div
    class="bg-white border-gray-600 border-4 rounded-md p-1 text-center"
    :class="{ selected: props.selected }"
  >
    <div
      @click="$emit('selected')"
      class="bg-contain bg-no-repeat bg-cover cursor-pointer"
      :style="{
        'background-image': `url('${imageUrl}')`,
        width: `${500 * scale}px`,
        height: `${310 * scale}px`,
      }"
    >
      <p
        v-if="props.trout.fee !== undefined"
        class="p-1 text-center bg-white rounded-full text-xs m-1 opacity-60 px-1 font-medium text-black float-right"
      >
        <span>{{ formatFee(props.trout.fee) }}</span>
      </p>
    </div>
    <form v-if="props.editable" @submit="listTrout" class="mx-auto my-3">
      Fee:
      <input
        required
        type="number"
        min="0.01"
        step="0.01"
        v-model="fee"
        class="w-16 border"
      />
      FIL
      <button
        class="bg-red-500 px-2 rounded-md text-white cursor-pointer m-1 disabled:bg-red-200 disabled:cursor-default"
        :disabled="listDisabled"
      >
        List
      </button>
    </form>
    <!-- <form v-if="!props.trout.fee"> -->
    <!-- </form> -->
  </div>
</template>

<style lang="postcss" scoped>
.selected {
  @apply border-pink-400;
}
</style>
