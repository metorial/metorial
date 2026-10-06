import { Slate } from 'slates';
import { spec } from './spec';
import {
  cancelEsignSession,
  createAutomation,
  deleteAutomation,
  duplicateAutomation,
  duplicateTemplate,
  generateDocument,
  getAutomation,
  getEsignSession,
  getJobStatus,
  getQueueStats,
  listAutomations,
  listEsignSessions,
  listPlaceholders,
  resendEsignInvitation,
  updateAutomation
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    generateDocument,
    getJobStatus,
    getQueueStats,
    listAutomations,
    getAutomation,
    createAutomation,
    updateAutomation,
    deleteAutomation,
    duplicateAutomation,
    listPlaceholders,
    duplicateTemplate,
    listEsignSessions,
    getEsignSession,
    cancelEsignSession,
    resendEsignInvitation
  ],
  triggers: []
});
