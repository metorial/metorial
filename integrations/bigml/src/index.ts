import { Slate } from 'slates';
import { spec } from './spec';
import {
  createAnomalyDetector,
  createAnomalyScore,
  createBatchPrediction,
  createCentroid,
  createCluster,
  createDataset,
  createEvaluation,
  createForecast,
  createInlineSource,
  createOptiml,
  createPrediction,
  createSource,
  deleteResource,
  downloadBatchPrediction,
  executeWhizzml,
  getAccountStatus,
  getResource,
  listResources,
  manageProject,
  trainModel,
  trainUnsupervisedModel,
  updateResource
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    createInlineSource,
    trainUnsupervisedModel,
    createCentroid,
    createAnomalyScore,
    createForecast,
    getAccountStatus,
    downloadBatchPrediction,
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
  triggers: []
});
