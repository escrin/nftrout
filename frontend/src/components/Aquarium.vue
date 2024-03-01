<script setup lang="ts">
import type { Element } from '@svgdotjs/svg.js';
import { SVG } from '@svgdotjs/svg.js';
import { computed, onMounted, ref, watch } from 'vue';

import { useTroutStore } from '../stores/nftrout';

const troutStore = useTroutStore();

const renderer = SVG();
const canvas = ref<HTMLElement>();
const cbox = computed(() => canvas.value?.getBoundingClientRect());

function lcg(seed: number, max: number): () => number {
  const a = 16807;
  const m = Math.pow(2, 31) - 1;
  let state = seed;
  return () => {
    state = (state * a) % m;
    return state % max;
  };
}

const SCALE = 0.4;
const TROUT_AREA = 458 * 234 * Math.pow(SCALE, 2);

const fishOfTheDay = ref(new Set<number>());
watch([troutStore], populateFishOfTheDay);
function populateFishOfTheDay() {
  if (troutStore.count === 0 || fishOfTheDay.value.size > 0) return;
  const day = Math.floor(new Date().getTime() / (1000 * 60 * 60 * 24));
  const random = lcg(day, troutStore.count);
  const density = 0.25;
  const count = Math.round(((window.innerWidth * window.innerHeight) / TROUT_AREA) * density);
  const fish = new Set<number>();
  for (let i = 0; fish.size < count && i < count * 4; i++) fish.add(random()); // Trade time for memory.
  fishOfTheDay.value = fish;
}

watch([fishOfTheDay, canvas], async ([fishOfTheDay, canvas]) => {
  if (!canvas || fishOfTheDay.size === 0) return;
  const renderings = [];
  for (const id of fishOfTheDay) {
    renderings.push(renderFish(id));
  }
  await Promise.allSettled(renderings);
});

async function renderFish(id: number): Promise<void> {
  if (!canvas.value) throw new Error('no canvas');

  const sprite = getSprite(await getFishImage(troutStore.trout[id].imageUrl));

  const sbox = sprite.bbox();
  sprite
    .move(0, 0)
    .transform({
      translateX: Math.random() * (cbox.value!.width - sbox.width),
      translateY: Math.random() * (cbox.value!.height - sbox.height),
    })
    .addTo(canvas.value);
  if (Math.random() < 0.5) sprite.first().first().flip('x');

  applyFloatingAnimation(sprite.first());
  applyMovingAnimation(sprite);
}

function applyMovingAnimation(sprite: Element) {
  function animateMove() {
    const f = sprite.first().first();
    const facing = -(f.transform().scaleX ?? 1);

    const dx = gaussianRandom() * 200;
    const dy = gaussianRandom() * 200;
    const { translateX, translateY } = sprite.transform();

    if (!((facing > 0 && dx > 0) || (facing < 0 && dx < 0))) (f.animate(300) as any).flip('x');

    const sbox = sprite.bbox();
    sprite
      .animate(Math.random() * 5000 + 5000)
      .transform({
        translateX: Math.min(Math.max(0, (translateX ?? 0) + dx), cbox.value!.width - sbox.width),
        translateY: Math.min(Math.max(0, (translateY ?? 0) + dy), cbox.value!.height - sbox.height),
      })
      .ease('<>')
      .after(animateMove);
  }
  animateMove();
}

function gaussianRandom(): number {
  let u = 0,
    v = 0;
  while (u === 0) u = Math.random(); //Converting [0,1) to (0,1)
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

function applyFloatingAnimation(sprite: Element) {
  const makeOffset = () => Math.random() * 8;
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
  pfp.each(function (this: Element) {
    if (this.type === 'rect') return;
    ggg.add(this);
  });
  ggg.scale(SCALE);

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
