<script setup lang="ts">
import type { Element } from '@svgdotjs/svg.js';
import { SVG } from '@svgdotjs/svg.js';
import { computed, onBeforeMount, onBeforeUnmount, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
// import type { Trout } from '../stores/nftrout';

const route = useRoute();

const { race } = route.params;

const renderer = SVG();
const canvas = ref<HTMLElement>();
const canvasWidth = ref(5000);
const canvasHeight = ref(0);

const contestants = [1, 2, 3, 4, 5, 6];
const contestantImages = ref<string[]>([]);
const SCALE = 0.333333;

const sprites = computed<ReturnType<typeof SVG>[]>(() => {
  return contestantImages.value.map((img) => {
    const pfp = SVG(img);

    let g = renderer.group();
    let gg = g.group();
    let ggg = gg.group();
    pfp.each(function (this: Element) {
      if (this.type === 'rect') return;
      ggg.add(this);
    });
    ggg.flip('x').scale(SCALE);

    return g;
  });
});

watch([canvas, sprites], ([canvas, sprites]) => {
  if (!canvas || !sprites.length) return;
  console.log('canvas or sprites reloaded');

  let maxFishLength = 0;
  for (const sprite of sprites) {
    maxFishLength = Math.max(maxFishLength, Number(sprite.width()));
  }

  const pad = 30;

  let pattern = SVG()
    .pattern(40, 40, function (add) {
      add.rect(20, 20).fill('#000');
      add.rect(20, 20).move(20, 20).fill('#000');
      add.rect(20, 20).move(0, 20).fill('#fff');
      add.rect(20, 20).move(20, 0).fill('#fff');
    })
    .addTo(canvas);
  const startLine = renderer
    .rect(40, 0)
    .fill(pattern)
    .addTo(canvas)
    .translate(maxFishLength + 10, 0);

  let y = pad;
  for (const sprite of sprites) {
    sprite.y(y).addTo(canvas);
    y += Number(sprite.height()) + 2 * pad;
  }
  canvasHeight.value = y - pad;

  for (const sprite of sprites) {
    const { x, width } = sprite.rbox();
    const nose = x + width;
    sprite.translate(maxFishLength - nose, 0);

    const makeOffset = () => Math.random() * (pad / 4) + pad / 3;
    const direction = Math.random() > 0.5 ? -1 : 1;
    function animateUpDown(sprite: Element) {
      const duration = 1000 * Math.random() + 1000;
      const offset = makeOffset();
      sprite
        .animate(duration)
        .ease('>')
        .transform({ translateY: direction * offset })
        .loop(2, true)
        .after(function () {
          sprite
            .animate(duration)
            .ease('>')
            .transform({ translateY: -direction * offset })
            .loop(2, true)
            .after(() => animateUpDown(sprite));
        });
    }
    animateUpDown(sprite.first());
  }

  startLine.height(canvasHeight.value);
});

const error = ref();

onBeforeMount(async () => {
  try {
    contestantImages.value = await Promise.all(
      contestants.map(async (id) => {
        const res = await fetch(`http://127.0.0.1:3474/trout/23294/${id}/image.svg`);
        let resText = await res.text();
        resText = resText.replace(/  Z/g, '');
        if (!res.ok) throw new Error(resText);
        const lines: string[] = [];
        for (let line of resText.split('\n')) {
          // if (line.startsWith('<path') && line.endsWith('/>')) continue;
          lines.push(line.trim());
        }
        return lines.join(' ').replace(/( "|" )/g, '"');
      }),
    );
  } catch (e: any) {
    error.value = e;
  }
});

onBeforeUnmount(async () => {
  sprites.value.forEach((s) => {
    console.log('unmounting');
    s.first().timeline().finish();
    s.timeline().finish();
  });
});

const countdown = ref<number | undefined>();
const countingDown = ref(false);

async function go() {
  if (countingDown.value) return;

  countdown.value = 3;
  countingDown.value = true;
  while (countdown.value > 0) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    countdown.value -= 1;
  }
  setTimeout(() => {
    countdown.value = undefined;
    countingDown.value = false;
  }, 500);

  sprites.value.forEach((sprite) => {
    sprite
      .animate(Math.random() * 1000 + 20000)
      .ease('-')
      .transform({ translateX: 5000 });
  });
}
</script>

<template>
  <div class="" @click="go">
    <div v-if="countdown !== undefined" class="fixed inset-0 flex items-center justify-center">
      <span
        :class="`countdown ${countdown > 10 ? '' : countdown <= 5 ? `t${countdown}` : 'soon'}`"
        >{{ countdown === 0 ? 'GO' : countdown }}</span
      >
    </div>
    <svg ref="canvas" class="" :style="`height: ${canvasHeight}px; width: ${canvasWidth}px`" />
  </div>
</template>

<style scoped lang="postcss">
.countdown.t3 {
  font-size: 6em;
  color: red;
}
.countdown.t2 {
  font-size: 7em;
  color: orangered;
}
.countdown.t1 {
  font-size: 8em;
  color: yellow;
}
.countdown.t0 {
  font-size: 9em;
  color: #00ff00;
}
</style>
