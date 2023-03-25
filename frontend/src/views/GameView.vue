<script setup lang="ts">
import { ethers } from 'ethers';
import { computed, ref } from 'vue';
import { ContentLoader } from 'vue-content-loader';

import { LetterMatch, a2i, getMatches, useWordleish } from '../contracts';
import { checkBestEffort as checkWordBestEffort } from '../dictionary';
import { useEthereumStore } from '../stores/ethereum';

const props = defineProps<{ gameId: string }>();
const gameId = computed(() => Number.parseInt(props.gameId, 10) - 1);

const eth = useEthereumStore();
const wordleish = useWordleish();

const guess = ref('');
const guessProblem = ref('');
const guessProblemShown = ref(false);
const guessing = ref(false);
const guesses = ref<Array<{ letters: string; matches: LetterMatch[] }>>([]);
const won = ref(false);
const submitting = ref(false);

async function makeGuess(e: Event): Promise<void> {
  e.preventDefault();
  try {
    if (guess.value.length < 5) throw new Error('This guess is too short.');
    if (guess.value.length > 5) throw new Error('This guess is too long.');
    if (!checkWordBestEffort(guess.value))
      throw new Error('This word is not recognized.');

    guessing.value = true;
    const mask = await wordleish.value.read.callStatic.guess(
      gameId.value,
      a2i(guess.value),
    );
    const matches = getMatches(mask);
    guesses.value.unshift({ letters: guess.value, matches });
    guessing.value = false;
    if (matches.every((m) => m == LetterMatch.Correct)) {
      won.value = true;
      await eth.connect();
      const tx = await wordleish.value.write!.guess(
        gameId.value,
        a2i(guess.value),
        { gasLimit: 300_000 },
      );
      submitting.value = true;
      console.log('submitted winning word in', tx.hash);
      const receipt = await tx.wait();
      if (receipt.status !== 1) throw new Error('Guess transaction failed.');
      await fetchSolves();
    }
    guess.value = '';
  } catch (e: any) {
    guessProblem.value = e.reason ?? e.message;
    guessProblemShown.value = true;
    won.value = false;
  } finally {
    guessing.value = false;
    submitting.value = false;
  }
}

const solutions = ref<{ firstSolver: string; numSolves: number } | undefined>();
async function fetchSolves(): Promise<void> {
  try {
    const { firstSolver, numSolves } =
      await wordleish.value.read.callStatic.solvers(gameId.value);
    if (firstSolver === ethers.constants.AddressZero) {
      solutions.value = { firstSolver: '', numSolves: 0 };
    } else {
      solutions.value = {
        firstSolver:
          firstSolver === eth.address ? 'You' : truncAddr(firstSolver),
        numSolves: numSolves.toNumber(),
      };
    }
  } catch (e: any) {
    console.error('failed to fetch solvers', e);
  }
}
fetchSolves();

function truncAddr(addr: string): string {
  addr = addr.replace('0x', '');
  return `${addr.slice(0, 10)}…${addr.slice(-10)}`;
}
</script>

<template>
  <main style="max-width: 60ch" class="p-5 m-auto">
    <h1 class="font-medium text-3xl">Puzzle #{{ props.gameId }}</h1>
    <p class="text-gray-500 mb-10" style="height: 3em">
      <ContentLoader v-if="!solutions || submitting" width="30ch" height="3em">
        <rect x="0" y="0.1em" rx="3" ry="3" width="30ch" height="1.3em" />
        <rect x="0" y="1.6em" rx="3" ry="3" width="20ch" height="1.3em" />
      </ContentLoader>
      <template v-else-if="solutions && solutions.firstSolver">
        <span aria-description="first solver">
          🥇&nbsp;<span class="font-mono text-sm">{{
            solutions.firstSolver
          }}</span>
        </span>
        <br />
        <span aria-description="number of times solved">
          🥈&nbsp;{{ solutions.numSolves - 1 }} others
        </span>
      </template>
      <span v-else> This puzzle has not yet been solved. </span>
    </p>
    <form @submit="makeGuess">
      <Dropdown
        :triggers="[]"
        :shown="guessProblemShown"
        placement="top"
        no-auto-focus
        @apply-hide="guessProblemShown = false"
      >
        <input
          title="five-letter English word"
          class="block my-4 p-2 mx-auto text-3xl text-center border border-gray-400 rounded-md"
          size="5"
          maxlength="5"
          :placeholder="won ? guesses[0].letters : 'guess'"
          v-model="guess"
          :disabled="won"
          @input="guessProblemShown = false"
        />
        <template #popper>
          <p class="p-2">{{ guessProblem }}</p>
        </template>
      </Dropdown>
    </form>
    <table>
      <template v-if="guessing">
        <tr>
          <td v-for="n in 5" :key="n">
            <ContentLoader width="50" height="50">
              <rect x="0" y="0" rx="3" ry="3" width="50" height="50" />
            </ContentLoader>
          </td>
        </tr>
      </template>
      <tr v-for="(guess, i) in guesses" :key="i">
        <td
          v-for="j in 5"
          :key="i + ',' + j"
          class="letter-box"
          :data-match="guess.matches[j - 1]"
        >
          {{ guess.letters[j - 1] }}
        </td>
      </tr>
    </table>
  </main>
</template>

<style lang="postcss" scoped>
table {
  --cell-size: 50px;
  @apply m-auto mt-10 table-fixed border-separate border-spacing-1;
  width: calc(var(--cell-size) * 5);
}

td {
  @apply font-medium;
  box-sizing: border-box;
  font-family: monospace;
  font-size: 32px;
  width: var(--cell-size);
  height: var(--cell-size);
  text-align: center;
  line-height: calc(var(--cell-size) - 2px);
}

td[data-match='0'] {
  @apply bg-gray-400;
}

td[data-match='1'] {
  @apply bg-amber-300;
}

td[data-match='2'] {
  @apply bg-lime-500;
}
</style>
