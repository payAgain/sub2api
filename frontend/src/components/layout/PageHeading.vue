<template>
  <div class="page-heading">
    <div class="min-w-0">
      <h1 class="page-heading-title">{{ pageTitle }}</h1>
      <p v-if="pageDescription" class="page-heading-description">{{ pageDescription }}</p>
    </div>
    <div v-if="$slots.actions" class="page-heading-actions">
      <slot name="actions" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { usePageHeading } from '@/composables/usePageHeading'

const { pageTitle, pageDescription } = usePageHeading()
</script>
