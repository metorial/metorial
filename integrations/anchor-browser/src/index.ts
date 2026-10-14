import { Slate } from 'slates';
import { spec } from './spec';
import {
  browserControl,
  checkWebTaskStatus,
  createSession,
  endSession,
  fetchWebpage,
  getActiveSessions,
  getPagePdf,
  getSession,
  getSessionPages,
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
export let provider = Slate.create({
  spec,
  tools: [
    createSession,
    listSessions,
    getSession,
    getActiveSessions,
    getSessionPages,
    getPagePdf,
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
  triggers: []
});
