<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';

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
watch(props, () => {
  toggleModal();
  transferRecipient.value = '';
  name.value = props.showingTrout ? troutStore.trout[props.showingTrout].name : '';
});

const closeModal = () => {
  emit('close');
};

const transferring = ref(false);
const transferRecipient = ref('');

async function sendTrout(e: Event) {
  if (e.target instanceof HTMLFormElement) {
    e.target.checkValidity();
    e.target.reportValidity();
  }
  e.preventDefault();

  try {
    transferring.value = true;
    if (!nftrout.value || !eth.address || !props.showingTrout) return;
    const tx = await nftrout.value['safeTransferFrom(address,address,uint256)'](
      eth.address,
      transferRecipient.value,
      BigInt(props.showingTrout),
    );
    console.log('sending', tx.hash);
    await tx.wait();
    troutStore.trout[props.showingTrout!].owner = transferRecipient.value as `0x{string}`;
  } finally {
    transferring.value = false;
  }
}

const renaming = ref(false);
const name = ref(props.showingTrout ? troutStore.trout[props.showingTrout].name : '');

async function renameTrout(e: Event) {
  if (e.target instanceof HTMLFormElement) {
    e.target.checkValidity();
    e.target.reportValidity();
  }
  e.preventDefault();

  if (!props.showingTrout) return;
  try {
    renaming.value = true;
    await troutStore.setTroutName(props.showingTrout, name.value);
  } finally {
    renaming.value = false;
  }
}
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
      class="w-4/5 max-w-[800px] h-fit bg-gray-100 m-auto p-8 rounded-sm text-left"
      @click.stop
      v-if="showingTrout"
    >
      <header class="flex justify-between mb-8 text-xl">
        <h1>{{ troutStore.trout[showingTrout].name }}</h1>
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
            :disabled="transferring"
          >
            <span v-if="transferring">Sending</span>
            <span v-else>Send</span>
          </button>
        </form>
        <form @submit="renameTrout" class="my-4">
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
            :disabled="renaming || name === troutStore.trout[showingTrout].name"
          >
            <span v-if="renaming">Sending</span>
            <span v-else>Rename</span>
          </button>
        </form>
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
