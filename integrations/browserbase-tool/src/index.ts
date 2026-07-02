import { Slate } from 'slates';
import { spec } from './spec';
import {
  completeSession,
  createContext,
  createSession,
  deleteContext,
  deleteDownload,
  deleteExtension,
  fetchPage,
  getContext,
  getDownload,
  getExtension,
  getProject,
  getProjectUsage,
  getSession,
  getSessionDebugInfo,
  getSessionLogs,
  getSessionRecording,
  listDownloads,
  listProjects,
  listSessions,
  updateContext,
  uploadExtension,
  uploadSessionFile,
  webSearch
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
    updateContext,
    deleteContext,
    uploadExtension,
    getExtension,
    deleteExtension,
    listProjects,
    getProject,
    getProjectUsage,
    fetchPage,
    webSearch,
    uploadSessionFile,
    listDownloads,
    getDownload,
    deleteDownload
  ],
  triggers: [inboundWebhook, sessionStatusChange]
});
