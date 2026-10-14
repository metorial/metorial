import { Slate } from 'slates';
import { spec } from './spec';
import {
  addApplication,
  addVariables,
  cancelBuild,
  createArtifactUrl,
  downloadArtifact,
  getApplication,
  getBuild,
  getCurrentUser,
  listApplications,
  listBuilds,
  listVariableGroups,
  manageCaches,
  startBuild
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    listApplications,
    getApplication,
    addApplication,
    startBuild,
    getBuild,
    listBuilds,
    cancelBuild,
    createArtifactUrl,
    downloadArtifact,
    manageCaches,
    addVariables,
    listVariableGroups,
    getCurrentUser
  ],
  triggers: []
});
