<script setup lang="ts">
import { CirclesToRhombusesSpinner } from 'epic-spinners';
import { ref, watch } from 'vue';
import { ContentLoader } from 'vue-content-loader';
import { useRouter } from 'vue-router';

import type { NFTrout } from '@escrin/nftrout-evm';

import { useNFTrout } from '../contracts';
import { check as checkWord } from '../dictionary';
import { useEthereumStore } from '../stores/ethereum';

const router = useRouter();
const eth = useEthereumStore();
const nftrout = useNFTrout();

// let numGames = ref<number | undefined>(undefined);
// async function updateNumGames(nftrout: NFTrout) {
//   console.log('updating num games');
//   try {
//     const id = await nftrout.callStatic.nextGameId();
//     numGames.value = id.toNumber();
//   } catch (e: any) {
//     console.error(e);
//     numGames.value = undefined;
//   }
// }
// watch(nftrout, (w) => updateNumGames(w.read));
// updateNumGames(nftrout.value.read);

// let gameId = ref<string>();
// let showingNoGame = ref(false);
// async function joinGame(e: Event): Promise<void> {
//   showingNoGame.value = false;
//   if (e.target instanceof HTMLFormElement) {
//     e.target.checkValidity();
//     e.target.reportValidity();
//   }
//   e.preventDefault();
//   if (
//     typeof numGames.value === 'number' &&
//     Number.parseInt(gameId.value!, 10) > numGames.value
//   ) {
//     showingNoGame.value = true;
//     return;
//   }
//   router.push({ name: 'game', params: { gameId: gameId.value } });
// }

// let newGameWord = ref('');
// let creatingGame = ref(false);
// let showingNotWord = ref(false);
// async function createGame(e: Event): Promise<void> {
//   showingNotWord.value = false;
//   if (e.target instanceof HTMLFormElement) {
//     e.target.checkValidity();
//     e.target.reportValidity();
//   }
//   e.preventDefault();
//   creatingGame.value = true;
//   try {
//     await eth.connect();
//     if (!(await checkWord(newGameWord.value))) {
//       showingNotWord.value = true;
//       throw new Error('not word');
//     }
//     const tx = await nftrout.value.write!.startGame(a2i(newGameWord.value), {
//       gasLimit: 200_000,
//     });
//     console.log('creating game in', tx.hash);
//     const receipt = await tx.wait();
//     const startedLog = receipt.logs[0];
//     const { gameId } = nftrout.value.read.interface.decodeEventLog(
//       'GameStarted',
//       startedLog.data,
//       startedLog.topics,
//     );
//     router.push({ name: 'game', params: { gameId: gameId.toNumber() + 1 } });
//   } catch (e: any) {
//     if (e.message !== 'not word') console.error(e.message);
//   } finally {
//     creatingGame.value = false;
//   }
// }
</script>

<template>
  <main style="max-width: 60ch" class="py-5 m-auto w-4/5">
    <form class="mb-8" @submit="joinGame">
      <h2>Solve a Puzzle</h2>
      <span v-if="numGames !== undefined">{{ numGames }}</span
      ><ContentLoader v-else class="inline" width="1em" height="1em"
        ><rect x="0" y="0" rx="3" ry="3" width="1em" height="1em"
      /></ContentLoader>
      puzzles have been created so far.
      <Dropdown
        :triggers="[]"
        :shown="showingNoGame"
        placement="top"
        @apply-hide="showingNoGame = false"
      >
        <input
          title="numeric game id"
          required
          minlength="1"
          size="3"
          placeholder="42"
          pattern="^\d+$"
          v-model="gameId"
        />
        <template #popper>
          <p class="p-2">This puzzle does not exist.</p>
        </template>
      </Dropdown>
      <button class="bg-rose-500">Go</button>
    </form>
    <form class="mt-16" @submit="createGame">
      <h2>Create a Puzzle</h2>
      <Dropdown :triggers="[]" :shown="showingNotWord" placement="top">
        <input
          title="five-letter English word"
          required
          minlength="5"
          maxlength="5"
          size="5"
          placeholder="ideal"
          pattern="^\w{5,5}$"
          v-model="newGameWord"
          :disabled="creatingGame"
        />
        <template #popper>
          <p class="p-2">This word is not recognized.</p>
        </template>
      </Dropdown>
      <button class="bg-lime-500" :disabled="creatingGame">
        <span v-if="!creatingGame">Create</span>
        <CirclesToRhombusesSpinner class="m-auto" v-else :circleSize="9" />
      </button>
    </form>
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
