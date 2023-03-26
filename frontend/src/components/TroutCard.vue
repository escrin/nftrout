<script setup lang="ts">
import type { BigNumber } from 'ethers';
import { ethers } from 'ethers';
import { computed, defineProps } from 'vue';

import type { Trout } from '../trouts';

const props = defineProps<{ trout: Trout, size?: number, selected?: boolean }>();
const size = computed(() => `${props.size ?? 128}px`);
const imageUrl = computed(() => props.trout.imageUrl);

function formatFee(fee: BigNumber): string {
  return fee.isZero() ? '0 FIL' : `${ethers.utils.formatEther(fee)} FIL`;
}
</script>

<template>
  <div :class="{selected:props.selected}" class="bg-contain border-gray-600 border-2 rounded-sm cursor-pointer" :style="{ 'background-image': `url('${imageUrl}')`, width: size, height: size }">
    <p v-if="props.trout.fee !== undefined" class="p-1 text-center bg-white rounded-full text-xs m-1 opacity-60 px-1 font-medium text-black float-right">
      <span>{{ formatFee(props.trout.fee) }}</span>
    </p>
  </div>
</template>

<style lang="postcss" scoped>
.selected {
  @apply border-pink-400 border-4;
}
</style>
