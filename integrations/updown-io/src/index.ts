import { Slate } from 'slates';
import { spec } from './spec';
import {
  createCheck,
  createPulseCheck,
  createRecipient,
  createStatusPage,
  deleteCheck,
  deleteRecipient,
  deleteStatusPage,
  getCheck,
  getDowntimes,
  getMetrics,
  listChecks,
  listNodeIps,
  listNodes,
  listRecipients,
  listStatusPages,
  updateCheck,
  updateStatusPage
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    listChecks,
    getCheck,
    createCheck,
    createPulseCheck,
    updateCheck,
    deleteCheck,
    getDowntimes,
    getMetrics,
    listRecipients,
    createRecipient,
    deleteRecipient,
    listStatusPages,
    createStatusPage,
    updateStatusPage,
    deleteStatusPage,
    listNodes,
    listNodeIps
  ],
  triggers: []
});
