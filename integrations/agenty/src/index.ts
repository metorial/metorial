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
  getFileUrl,
  getJobLogs,
  getJobResults,
  getJobStatus,
  getPageContent,
  listAgents,
  listJobs,
  listListRows,
  manageAgentInput,
  manageList,
  manageListRow,
  manageSchedule,
  startJob,
  stopJob
} from './tools';
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
    listListRows,
    exportJobResult,
    manageAgentInput,
    manageSchedule,
    manageList,
    manageListRow,
    captureScreenshot,
    generatePdf,
    getPageContent,
    extractStructuredData,
    getFileUrl
  ],
  triggers: []
});
