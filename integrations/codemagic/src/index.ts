import { Slate } from 'slates';
import { spec } from './spec';
import {
  addApplication,
  addVariables,
  cancelBuild,
  createArtifactUrl,
  getApplication,
  getBuild,
  listApplications,
  listBuilds,
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
    manageCaches,
    addVariables
  ],
  triggers: []
});
