import { Slate } from 'slates';
import { spec } from './spec';
import {
  createAnomalyDetector,
  createBatchPrediction,
  createCluster,
  createDataset,
  createEvaluation,
  createOptiml,
  createPrediction,
  createSource,
  deleteResource,
  executeWhizzml,
  getResource,
  listResources,
  manageProject,
  trainModel,
  updateResource
} from './tools';
import { inboundWebhook, newResource, resourceCompleted } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    createSource,
    createDataset,
    trainModel,
    createPrediction,
    createBatchPrediction,
    createEvaluation,
    createCluster,
    createAnomalyDetector,
    createOptiml,
    executeWhizzml,
    listResources,
    getResource,
    updateResource,
    deleteResource,
    manageProject
  ],
  triggers: [inboundWebhook, newResource, resourceCompleted]
});
