<script setup lang="ts">
import { formatEther, hexToBigInt } from 'viem';
import { computed, onMounted, reactive, ref, watch } from 'vue';

import { useNFTrout } from '../contracts';
import { useEthereumStore } from '../stores/ethereum';
import type { TokenId } from '../stores/nftrout';
import { useTroutStore } from '../stores/nftrout';

const emit = defineEmits(['close']);

const props = defineProps<{
  showingTrout: TokenId | undefined;
}>();

const eth = useEthereumStore();
const nftrout = useNFTrout();
const troutStore = useTroutStore();

const modal = ref<HTMLDialogElement>();

const toggleModal = () => {
  if (props.showingTrout) {
    modal.value?.showModal();
  } else {
    modal.value?.close();
  }
};
onMounted(toggleModal);

const closeModal = () => {
  emit('close');
};

const transferring = reactive(new Set<TokenId>());
const transferRecipient = ref('');

async function sendTrout(e: Event) {
  if (e.target instanceof HTMLFormElement) {
    e.target.checkValidity();
    e.target.reportValidity();
  }
  e.preventDefault();

  if (!nftrout.value || !eth.address || !props.showingTrout) return;
  let showingTrout = props.showingTrout;
  try {
    transferring.add(showingTrout);
    const tx = await nftrout.value['safeTransferFrom(address,address,uint256)'](
      eth.address,
      transferRecipient.value,
      BigInt(showingTrout),
    );
    console.log('sending', tx.hash);
    await tx.wait();
    troutStore.trout[showingTrout].owner = transferRecipient.value as `0x{string}`;
  } finally {
    transferring.delete(showingTrout);
  }
}

const renaming = reactive(new Set<TokenId>());
const name = ref(props.showingTrout ? troutStore.trout[props.showingTrout].name : '');

async function renameTrout(e: Event) {
  if (e.target instanceof HTMLFormElement) {
    e.target.checkValidity();
    e.target.reportValidity();
  }
  e.preventDefault();

  if (!props.showingTrout) return;
  let showingTrout = props.showingTrout;
  try {
    renaming.add(showingTrout);
    await troutStore.setTroutName(props.showingTrout, name.value);
  } finally {
    renaming.delete(showingTrout);
  }
}

const displayName = computed(() => {
  if (!props.showingTrout) return '';
  const { name } = troutStore.trout[props.showingTrout];
  if (/#\d+$/.test(name)) return name;
  return `${name} (#${props.showingTrout})`;
});

watch(props, async () => {
  toggleModal();
  transferRecipient.value = '';
  if (props.showingTrout) {
    name.value = troutStore.trout[props.showingTrout].name;
    try {
      troutStore.fetchTroutEvents(props.showingTrout);
    } catch (e: any) {
      console.error('failed to fetch trout events:', e);
    }
  } else {
    name.value = '';
  }
});
</script>

<template>
  <dialog
    ref="modal"
    @click.stop="closeModal"
    @close="closeModal"
    :class="`w-screen h-screen max-w-none max-h-none blur-bg flex flex-col items-center justify-center ${
      showingTrout ? '' : 'hidden'
    }`"
  >
    <div
      class="w-4/5 max-w-[800px] h-fit bg-gray-100 mx-auto my-2 p-8 rounded-sm text-left overflow-scroll"
      @click.stop
      v-if="showingTrout"
    >
      <header class="flex justify-between mb-8 text-xl">
        <h1>{{ displayName }}</h1>
        <button @click.stop="closeModal">✕</button>
      </header>
      <div>
        <img class="w-3/4 max-w-lg mx-auto my-8" :src="troutStore.trout[showingTrout].imageUrl" />
      </div>
      <div
        v-if="troutStore.trout[showingTrout].owner?.toLowerCase() === eth.address?.toLowerCase()"
      >
        <form @submit="sendTrout" class="my-4">
          <label>
            Send to:&nbsp;<input
              type="text"
              class="w-[42ch] max-w-4/5"
              placeholder="0x..."
              v-model="transferRecipient"
              required
              pattern="0x[A-Fa-f0-9]{40}"
            />
          </label>
          <button
            class="ms-1 enabled:bg-rose-500 disabled:bg-gray-400 px-2 py-1 rounded-md text-white enabled:cursor-pointer"
            :disabled="transferring.has(showingTrout)"
          >
            <span v-if="transferring.has(showingTrout)">Sending</span>
            <span v-else>Send</span>
          </button>
        </form>
        <form @submit="renameTrout" class="my-4" v-if="troutStore.mode === 'indexed'">
          <label>
            Name:&nbsp;<input
              type="text"
              class="w-[38ch] max-w-4/5"
              placeholder="Trouty McTroutface"
              v-model="name"
              required
            />
          </label>
          <button
            class="ms-1 enabled:bg-rose-500 disabled:bg-gray-400 px-2 py-1 rounded-md text-white enabled:cursor-pointer"
            :disabled="renaming.has(showingTrout) || name === troutStore.trout[showingTrout].name"
          >
            <span v-if="renaming.has(showingTrout)">Sending</span>
            <span v-else>Rename</span>
          </button>
        </form>

        <div v-if="troutStore.mode === 'indexed'">
          <hr />
          <h1 class="font-medium my-4 text-2xl">Breeding Events</h1>
          <table class="mx-auto w-3/4 border-black border-t-[3px] border-b-[3px]">
            <thead class="border-black border-b-2 text-right">
              <th class="py-1">Breeder</th>
              <th class="py-1">Co-Parent</th>
              <th class="py-1">Child</th>
              <th class="py-1">Revenue</th>
            </thead>
            <tbody class="font-mono">
              <template
                v-for="event in troutStore.events.get(showingTrout)"
                :key="JSON.stringify(event)"
              >
                <tr v-if="event.kind === 'breed'" class="text-right border-black border-t">
                  <td class="w-[7ch] inline-block truncate">{{
                    event.breeder.toLowerCase() === eth.address.toLowerCase()
                      ? 'You'
                      : event.breeder
                  }}</td>
                  <td :title="troutStore.trout[event.coparent.tokenId].name"
                    >#{{ event.coparent.tokenId }}</td
                  >
                  <td :title="troutStore.trout[event.child.tokenId].name"
                    >#{{ event.child.tokenId }}</td
                  >
                  <td v-if="event.breeder.toLowerCase() !== eth.address.toLowerCase()"
                    >{{ formatEther(hexToBigInt(event.price)) }} {{ eth.currency }}</td
                  >
                  <td v-else>Free</td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </dialog>
</template>

<style scoped lang="postcss">
input {
  @apply p-1 border border-gray-400 rounded-md;
}

.blur-bg {
  @apply bg-sky-950/40 backdrop-blur-sm;
}
</style>
