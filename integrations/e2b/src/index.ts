import { Slate } from 'slates';
import { spec } from './spec';
import {
  createSandbox,
  createSnapshot,
  createVolume,
  createWebhook,
  deleteTemplate,
  deleteVolume,
  deleteWebhook,
  getLifecycleEvents,
  getSandbox,
  getWebhook,
  killSandbox,
  listSandboxes,
  listSnapshots,
  listTemplates,
  listVolumes,
  listWebhooks,
  pauseSandbox,
  resumeSandbox,
  setSandboxTimeout,
  updateWebhook
} from './tools';

export let provider = Slate.create({
  spec,
  triggers: [],
  tools: [
    createSandbox,
    listSandboxes,
    getSandbox,
    killSandbox,
    pauseSandbox,
    resumeSandbox,
    setSandboxTimeout,
    createSnapshot,
    listSnapshots,
    listTemplates,
    deleteTemplate,
    getLifecycleEvents,
    listWebhooks,
    getWebhook,
    createWebhook,
    updateWebhook,
    deleteWebhook,
    listVolumes,
    createVolume,
    deleteVolume
  ]
});
