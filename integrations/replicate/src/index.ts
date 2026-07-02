import { Slate } from 'slates';
import { spec } from './spec';
import {
  cancelPrediction,
  cancelTraining,
  createDeployment,
  createModel,
  createTraining,
  deleteDeployment,
  deleteFile,
  deleteModel,
  getAccount,
  getCollection,
  getDeployment,
  getFile,
  getModel,
  getPrediction,
  getTraining,
  listCollections,
  listDeployments,
  listFiles,
  listHardware,
  listModelVersions,
  listPredictions,
  listTrainings,
  runPrediction,
  searchModels,
  updateDeployment,
  updateModel
} from './tools';
import { inboundWebhook, predictionCompleted, trainingCompleted } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    runPrediction,
    getPrediction,
    listPredictions,
    cancelPrediction,
    getModel,
    createModel,
    updateModel,
    deleteModel,
    searchModels,
    listModelVersions,
    createTraining,
    getTraining,
    listTrainings,
    cancelTraining,
    createDeployment,
    getDeployment,
    listDeployments,
    updateDeployment,
    deleteDeployment,
    listCollections,
    getCollection,
    listFiles,
    getFile,
    deleteFile,
    listHardware,
    getAccount
  ],
  triggers: [inboundWebhook, predictionCompleted, trainingCompleted]
});
