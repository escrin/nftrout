<script setup lang="ts">
import { RouterView } from 'vue-router';

import AccountPicker from './components/AccountPicker.vue';
</script>

<template>
  <header class="flex flex-row justify-between p-2">
    <h1 class="mx-5 text-2xl font-medium centered">🐟 NFTrout</h1>
    <div class="centered">
      <AccountPicker class="border border-gray-900 py-1 px-2 rounded-lg mx-5" />
    </div>
  </header>

  <RouterView el="main" ref="rv" />
</template>

<style lang="postcss" scoped>
.centered {
  @apply flex flex-col justify-center;
}
</style>
