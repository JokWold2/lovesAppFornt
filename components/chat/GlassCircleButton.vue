<template>
  <button class="glass-circle-button" :disabled="disabled" :aria-label="label" hover-class="glass-circle-button--pressed" :hover-start-time="0" :hover-stay-time="80" @tap="emit('tap', $event)"><slot /></button>
</template>

<script setup>
defineProps({ label: String, disabled: Boolean })
const emit = defineEmits(['tap'])
</script>

<style scoped>
.glass-circle-button{display:inline-flex;align-items:center;justify-content:center;flex:0 0 44px;width:44px;height:44px;margin:0;padding:0;box-sizing:border-box;border:1px solid rgba(255,255,255,.88);border-radius:50%;background:rgba(255,255,255,.88);color:#292825;font-size:22px;line-height:1;overflow:visible;box-shadow:inset 0 1px 0 rgba(255,255,255,.8),0 4px 16px rgba(65,59,48,.1);transform-origin:center;transition:transform 140ms cubic-bezier(.23,1,.32,1),background-color 140ms ease,box-shadow 140ms ease;}
.glass-circle-button::after{border:0;}
@supports ((-webkit-backdrop-filter:blur(1px)) or (backdrop-filter:blur(1px))){.glass-circle-button{background:rgba(255,255,255,.56);-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px);}}
.glass-circle-button--pressed:not([disabled]),.glass-circle-button:active:not([disabled]){transform:scale(1.12);background:#fff;box-shadow:inset 0 1px 0 #fff,0 6px 20px rgba(65,59,48,.13);}
.glass-circle-button:focus-visible{outline:2px solid #ac945b;outline-offset:3px;}
.glass-circle-button[disabled]{opacity:.45;}
@media(prefers-reduced-motion:reduce){.glass-circle-button{transition:none;}.glass-circle-button--pressed:not([disabled]),.glass-circle-button:active:not([disabled]){transform:none;}}
</style>
