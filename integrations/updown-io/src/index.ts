import { Slate } from 'slates';
import { spec } from './spec';
import {
  createCheck,
  createRecipient,
  createStatusPage,
  deleteCheck,
  deleteRecipient,
  deleteStatusPage,
  getCheck,
  getDowntimes,
  getMetrics,
  listChecks,
  listNodes,
  listRecipients,
  listStatusPages,
  updateCheck,
  updateStatusPage
} from './tools';
import { monitoringEvents } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listChecks,
    getCheck,
    createCheck,
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
    listNodes
  ],
  triggers: [monitoringEvents]
});
