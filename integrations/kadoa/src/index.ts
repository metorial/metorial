import { Slate } from 'slates';
import { spec } from './spec';
import {
  adhocExtraction,
  createWorkflow,
  getCrawlResults,
  getDataChanges,
  getWorkflowData,
  getWorkflowDetails,
  listLocations,
  listWorkflows,
  manageWorkflow,
  runWorkflow,
  startCrawl
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    listWorkflows,
    createWorkflow,
    getWorkflowDetails,
    getWorkflowData,
    runWorkflow,
    manageWorkflow,
    startCrawl,
    getCrawlResults,
    adhocExtraction,
    getDataChanges,
    listLocations
  ],
  triggers: []
});
