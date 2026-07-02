import { Slate } from 'slates';
import { spec } from './spec';
import {
  browserControl,
  checkWebTaskStatus,
  createSession,
  endSession,
  fetchWebpage,
  getActiveSessions,
  getSession,
  listSessions,
  manageAgent,
  manageApplication,
  manageBatch,
  manageExtension,
  manageIdentity,
  manageIntegration,
  manageProfile,
  manageRecording,
  performWebTask,
  screenshotWebpage,
  signalEvent
} from './tools';
import { inboundWebhook, sessionStatusChange } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    createSession,
    listSessions,
    getSession,
    getActiveSessions,
    endSession,
    manageProfile,
    performWebTask,
    checkWebTaskStatus,
    fetchWebpage,
    screenshotWebpage,
    browserControl,
    manageExtension,
    manageBatch,
    signalEvent,
    manageRecording,
    manageApplication,
    manageIdentity,
    manageIntegration,
    manageAgent
  ],
  triggers: [inboundWebhook, sessionStatusChange]
});
