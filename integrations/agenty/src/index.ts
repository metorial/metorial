import { Slate } from 'slates';
import { spec } from './spec';
import {
  captureScreenshot,
  cloneAgent,
  deleteAgent,
  exportJobResult,
  extractStructuredData,
  generatePdf,
  getAgent,
  getJobLogs,
  getJobResults,
  getJobStatus,
  getPageContent,
  listAgents,
  listJobs,
  manageAgentInput,
  manageList,
  manageSchedule,
  startJob,
  stopJob
} from './tools';
import { inboundWebhook, jobCompleted } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listAgents,
    getAgent,
    cloneAgent,
    deleteAgent,
    startJob,
    stopJob,
    getJobStatus,
    getJobResults,
    getJobLogs,
    listJobs,
    exportJobResult,
    manageAgentInput,
    manageSchedule,
    manageList,
    captureScreenshot,
    generatePdf,
    getPageContent,
    extractStructuredData
  ],
  triggers: [inboundWebhook, jobCompleted]
});
