import { Slate } from 'slates';
import { spec } from './spec';
import {
  completeSession,
  createContext,
  createSession,
  deleteContext,
  deleteExtension,
  fetchPage,
  getContext,
  getExtension,
  getProjectUsage,
  getSession,
  getSessionDebugInfo,
  getSessionLogs,
  getSessionRecording,
  listProjects,
  listSessions
} from './tools';
import { inboundWebhook, sessionStatusChange } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    createSession,
    listSessions,
    getSession,
    completeSession,
    getSessionDebugInfo,
    getSessionLogs,
    getSessionRecording,
    createContext,
    getContext,
    deleteContext,
    getExtension,
    deleteExtension,
    listProjects,
    getProjectUsage,
    fetchPage
  ],
  triggers: [inboundWebhook, sessionStatusChange]
});
