import { Slate } from 'slates';
import { spec } from './spec';
import {
  adhocExtraction,
  getCrawlResults,
  getDataChanges,
  getWorkflowData,
  getWorkflowDetails,
  listWorkflows,
  manageWorkflow,
  runWorkflow,
  startCrawl
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    listWorkflows,
    getWorkflowDetails,
    getWorkflowData,
    runWorkflow,
    manageWorkflow,
    startCrawl,
    getCrawlResults,
    adhocExtraction,
    getDataChanges
  ],
  triggers: []
});
