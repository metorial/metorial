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
import { sandboxLifecycleTrigger } from './triggers';

export let provider = Slate.create({
  spec,
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
    createWebhook,
    updateWebhook,
    deleteWebhook,
    listVolumes,
    createVolume,
    deleteVolume
  ],
  triggers: [sandboxLifecycleTrigger]
});
