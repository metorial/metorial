import { Slate } from 'slates';
import { spec } from './spec';
import { createMonitor, deleteMonitor, getUsage, listMonitors, runLookup } from './tools';
export let provider = Slate.create({
  spec,
  tools: [runLookup, listMonitors, createMonitor, deleteMonitor, getUsage],
  triggers: []
});
