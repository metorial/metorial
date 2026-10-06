import { Slate } from 'slates';
import { spec } from './spec';
import {
  createDeployment,
  createProject,
  getDataset,
  getDeployment,
  getDeploymentMonitoring,
  getModel,
  getProject,
  listDatasets,
  listDeployments,
  listModelPackages,
  listModels,
  listProjects,
  makePredictions,
  manageDataset,
  manageDeployment,
  manageProject,
  registerModel,
  startAutopilot
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    listProjects,
    getProject,
    createProject,
    manageProject,
    startAutopilot,
    listModels,
    getModel,
    listDatasets,
    getDataset,
    manageDataset,
    listDeployments,
    getDeployment,
    createDeployment,
    manageDeployment,
    makePredictions,
    getDeploymentMonitoring,
    listModelPackages,
    registerModel
  ],
  triggers: []
});
