<script setup lang="ts">
import type { Element } from '@svgdotjs/svg.js';
import { SVG } from '@svgdotjs/svg.js';
import { onBeforeMount, onBeforeUnmount, onMounted, ref, watch } from 'vue';

import { useTroutStore } from '../stores/nftrout';

const troutStore = useTroutStore();

const renderer = SVG();
const canvas = ref<HTMLElement>();
const cbox = ref(canvas.value?.getBoundingClientRect());
watch(canvas, (canvas) => (cbox.value = canvas?.getBoundingClientRect()));

const latch = ref<ReturnType<typeof setTimeout>>();
function updateWindowSize() {
  if (latch.value) clearTimeout(latch.value);
  latch.value = setTimeout(() => {
    if (canvas.value) cbox.value = canvas.value.getBoundingClientRect();
  }, 500);
}
onBeforeMount(() => window.addEventListener('resize', updateWindowSize));
onBeforeUnmount(() => window.removeEventListener('resize', updateWindowSize));

const SCALE = 0.4;
const TROUT_AREA = 458 * 234 * Math.pow(SCALE, 2);
const count = ref(0);
watch(cbox, updateCount);
function updateCount() {
  const density = 0.25;
  count.value = Math.round(
    (((cbox.value?.width ?? 0) * (cbox.value?.height ?? 0)) / TROUT_AREA) * density,
  );
}

const fishOfTheDay = ref<number[]>([]);
watch([troutStore], populateFishOfTheDay);
function populateFishOfTheDay() {
  if (troutStore.count === 0 || fishOfTheDay.value.length > 0) return;
  const day = Math.floor(new Date().getTime() / (1000 * 60 * 60 * 24));
  const random = lcg(day, troutStore.count * 2);
  const count = 30;
  const fish = new Set<number>();
  for (let i = 0; fish.size < count && i < count * 4; i++) fish.add(random() % troutStore.count);
  fishOfTheDay.value = [...fish];
}

const sprites = ref<Element[]>([]);
watch([fishOfTheDay, canvas], async ([fishOfTheDay, canvas]) => {
  if (!canvas || fishOfTheDay.length === 0) return;

  updateCount();
  const rendered = await Promise.allSettled(fishOfTheDay.map((id, i) => renderFish(i, id)));
  for (const r of rendered) {
    if (r.status != 'fulfilled') continue;
    sprites.value.push(r.value);
  }
});

async function renderFish(i: number, id: number): Promise<Element> {
  if (!canvas.value) throw new Error('no canvas');

  const sprite = getSprite(await getFishImage(troutStore.trout[id].imageUrl));

  if (i >= count.value) sprite.hide();
  placeInitial(sprite);
  sprite.addTo(canvas.value);
  if (sprite.visible()) applyAnimations(sprite);

  return sprite;
}

function getSbox(sprite: Element): { width: number; height: number } {
  try {
    return sprite.rbox();
  } catch {
    return sprite.bbox();
  }
}

function placeInitial(sprite: Element) {
  const sbox = getSbox(sprite);
  sprite
    .move(0, 0)
    .first()
    .move(0, 0)
    .transform({
      translateX: Math.random() * (cbox.value!.width - sbox.width - PAD),
      translateY: Math.random() * (cbox.value!.height - sbox.height - PAD),
    });
}

watch(count, (count) => {
  sprites.value.forEach((sprite, i) => {
    if (i >= count) {
      if (sprite.visible()) {
        clearAnimations(sprite);
        sprite.hide();
      }
    } else {
      if (!sprite.visible()) {
        placeInitial(sprite);
        sprite.show();
        applyAnimations(sprite);
      }
    }
  });
});

function applyAnimations(sprite: Element) {
  applyFloatingAnimation(sprite.first().first());
  applyMovingAnimation(sprite.first());
}

function clearAnimations(sprite: Element) {
  sprite.first().first().timeline().finish();
  sprite.first().timeline().finish();
}

function applyMovingAnimation(sprite: Element) {
  function animateMove() {
    const f = sprite.first().first();
    const facing = -(f.transform().scaleX ?? 1);

    let dx = 0;
    let dy = 0;
    const r = Math.random();
    if (r < 0.03) {
      dx = gaussianRandom() * 500;
      dy = gaussianRandom() * 500;
    } else if (r < 0.2) {
      dx = gaussianRandom() * 200;
      dy = gaussianRandom() * 200;
    } else if (r < 0.7) {
      dx = gaussianRandom() * 100;
      dy = gaussianRandom() * 100;
    }
    const { translateX, translateY } = sprite.transform();

    if (!((facing > 0 && dx >= 0) || (facing < 0 && dx <= 0)))
      (f.animate(Math.random() * 200 + 200) as any).flip('x');

    const cb = cbox.value!;
    const sbox = getSbox(sprite);
    const dest = {
      translateX: Math.min(Math.max(PAD, (translateX ?? 0) + dx), cb.width - sbox.width - PAD),
      translateY: Math.min(Math.max(PAD, (translateY ?? 0) + dy), cb.height - sbox.height - PAD),
    };
    sprite
      .animate(Math.random() * 5000 + 5000)
      .transform(dest)
      .ease('<>')
      .after(animateMove);
  }
  animateMove();
}

function lcg(seed: number, max: number): () => number {
  const a = 16807;
  const m = Math.pow(2, 31) - 1;
  let state = seed;
  return () => {
    state = (state * a) % m;
    return state % max;
  };
}

function gaussianRandom(): number {
  let u = 0,
    v = 0;
  while (u === 0) u = Math.random(); //Converting [0,1) to (0,1)
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

const PAD = 20;

function applyFloatingAnimation(sprite: Element) {
  const makeOffset = () => Math.random() * PAD;
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
  animateUpDown(sprite);
}

function getSprite(imageSvg: string) {
  const pfp = SVG(imageSvg);

  let g = renderer.group();
  let gg = g.group();
  let ggg = gg.group();
  let gggg = ggg.group();
  pfp.each(function (this: Element) {
    if (this.type === 'rect') return;
    gggg.add(this);
  });
  if (Math.random() < 0.5) gggg.flip('x');
  gggg.scale(SCALE);

  return g;
}

async function getFishImage(url: string): Promise<string> {
  const res = await fetch(url);
  let resText = await res.text();
  resText = resText.replace(/ {2}Z/g, '');
  if (!res.ok) throw new Error(resText);
  const lines: string[] = [];
  for (let line of resText.split('\n')) {
    lines.push(line.trim());
  }
  return lines.join(' ').replace(/( "|" )/g, '"');
}

onMounted(() => populateFishOfTheDay());
</script>

<template>
  <svg ref="canvas" class="flex-grow" />
</template>
