import { Slate } from 'slates';
import { spec } from './spec';
import { createMonitor, deleteMonitor, getUsage, listMonitors, runLookup } from './tools';
import { inboundWebhook, monitorStatusChanged } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [runLookup, listMonitors, createMonitor, deleteMonitor, getUsage],
  triggers: [inboundWebhook, monitorStatusChanged]
});
