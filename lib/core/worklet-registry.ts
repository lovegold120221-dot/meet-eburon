/**
 * @fileoverview Registry for AudioWorklets to prevent double-loading.
 */

// Use WeakMap to associate registry with specific AudioContext
export const registeredWorklets = new WeakMap();
