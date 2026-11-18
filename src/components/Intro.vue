<script setup lang="ts">
import { t } from '../i18n'
import { ABOUT } from '../about'

defineEmits<{ enter: [] }>()

const stampSrc = `${import.meta.env.BASE_URL}icon-192.png`

const steps = [
  { icon: '✉', title: 'introFindTitle', text: 'introFind' },
  { icon: '➤', title: 'introGoTitle', text: 'introGo' },
  { icon: '€', title: 'introStampsTitle', text: 'introStamps' },
] as const
</script>

<template>
  <div class="intro" role="dialog" aria-modal="true" aria-labelledby="intro-title">
    <article class="letter">
      <div class="airmail" aria-hidden="true" />
      <div class="paper">
        <header class="head">
          <img class="stamp" :src="stampSrc" alt="" width="84" height="84" />
          <div>
            <h1 id="intro-title" class="wordmark">POSTAL</h1>
            <p class="hello">{{ t('introHello') }}</p>
          </div>
        </header>

        <p class="lead">{{ t('introLead') }}</p>

        <ol class="steps">
          <li v-for="s in steps" :key="s.title">
            <span class="badge" aria-hidden="true">{{ s.icon }}</span>
            <span>
              <strong>{{ t(s.title) }}</strong>
              {{ t(s.text) }}
            </span>
          </li>
        </ol>

        <p class="small">{{ t('introData') }}</p>
        <p class="small">{{ t('introLocation') }}</p>

        <footer class="sign">
          <span class="hand">{{ ABOUT.author.split(' ')[0] }}</span>
          <span class="credit">
            {{ t('introAuthor') }}
            <a :href="ABOUT.url" target="_blank" rel="noopener">{{ ABOUT.author }}</a>
            · {{ t('introProject', { company: ABOUT.company }) }}
          </span>
        </footer>

        <button class="enter" type="button" @click="$emit('enter')">{{ t('introEnter') }} →</button>
      </div>
      <div class="airmail" aria-hidden="true" />
    </article>
  </div>
</template>

<style scoped>
.intro {
  position: fixed;
  inset: 0;
  z-index: 10;
  overflow-y: auto;
  display: grid;
  place-items: center;
  padding: calc(env(safe-area-inset-top, 0px) + 18px) 16px calc(env(safe-area-inset-bottom, 0px) + 18px);
  background: var(--paper);
  background-image: var(--riso-grain);
}
.letter {
  width: 100%;
  max-width: 520px;
  border: 1.5px solid var(--ink);
  box-shadow: 7px 7px 0 var(--primary), 7px 7px 0 1.5px var(--ink);
  background: var(--paper);
  animation: arrive 0.6s cubic-bezier(.2, .8, .2, 1);
}
@keyframes arrive {
  from { transform: translateY(24px) rotate(-1.5deg); opacity: 0; }
  to { transform: none; opacity: 1; }
}
@media (prefers-reduced-motion: reduce) { .letter { animation: none; } }
.airmail { height: 10px; background: var(--airmail-stripes); background-size: 36px 10px; }
.paper { padding: 22px 22px 20px; color: var(--ink); }
.head { display: flex; align-items: center; gap: 16px; }
.stamp { border-radius: 18px; transform: rotate(-4deg); box-shadow: 3px 3px 0 rgb(0 0 0 / .15); }
.wordmark {
  margin: 0;
  font-family: var(--font-display);
  font-weight: 800;
  font-size: 40px;
  line-height: 1;
  letter-spacing: 0.1em;
  text-shadow: 2.5px 2px 0 var(--primary);
}
.hello { margin: 6px 0 0; font-family: var(--font-hand); font-size: 28px; line-height: 1; }
.lead { margin: 18px 0 14px; font-family: var(--font-display); font-size: 18px; line-height: 1.45; font-weight: 500; }
.steps { list-style: none; margin: 0 0 14px; padding: 0; display: grid; gap: 10px; }
.steps li { display: flex; gap: 12px; align-items: flex-start; font-size: 15px; line-height: 1.4; }
.steps strong { display: block; font-family: var(--font-display); font-size: 16px; }
.badge {
  flex: none;
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  background: var(--primary);
  color: var(--on-primary);
  font-weight: 800;
  outline: 2px dotted var(--primary);
  outline-offset: 2px;
}
.small { margin: 8px 0; font-family: var(--font-mono); font-size: 12px; line-height: 1.5; color: var(--ink-soft); }
.sign {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
  margin: 18px 0 16px;
  padding-top: 12px;
  border-top: 1px dashed var(--ink-soft);
}
.hand { font-family: var(--font-hand); font-size: 36px; line-height: 1; transform: rotate(-3deg); }
.credit { font-family: var(--font-mono); font-size: 11.5px; color: var(--ink-soft); text-align: right; }
.credit a { color: var(--ink); }
.enter {
  width: 100%;
  padding: 15px 18px;
  border: 1.5px solid var(--ink);
  background: var(--ink);
  color: var(--paper);
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 18px;
  box-shadow: 4px 4px 0 var(--primary);
}
.enter:active { transform: translate(3px, 3px); box-shadow: 1px 1px 0 var(--primary); }
</style>
