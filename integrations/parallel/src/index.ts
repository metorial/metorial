import { Slate } from 'slates';
import { spec } from './spec';
import {
  chatCompletion,
  createMonitor,
  deepResearch,
  enrichFindall,
  extractContent,
  findEntities,
  getFindallResults,
  getTaskRun,
  ingestFindall,
  manageMonitor,
  webSearch
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    webSearch,
    extractContent,
    deepResearch,
    getTaskRun,
    chatCompletion,
    findEntities,
    getFindallResults,
    ingestFindall,
    enrichFindall,
    createMonitor,
    manageMonitor
  ],
  triggers: []
});
