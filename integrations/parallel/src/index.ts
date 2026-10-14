import { Slate } from 'slates';
import { spec } from './spec';
import {
  cancelFindall,
  chatCompletion,
  createMonitor,
  deepResearch,
  enrichFindall,
  extendFindall,
  extractContent,
  findEntities,
  getFindallResults,
  getFindallSchema,
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
    manageMonitor,
    cancelFindall,
    extendFindall,
    getFindallSchema
  ],
  triggers: []
});
