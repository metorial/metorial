import { Slate } from 'slates';
import { spec } from './spec';
import {
  encryptValue,
  getBuildHistory,
  getBuildLogAndArtifacts,
  getProject,
  getProjectSettings,
  listProjects,
  manageBuild,
  manageCollaborators,
  manageDeployment,
  manageEnvironment,
  manageProject,
  manageRoles,
  manageUsers,
  startBuild
} from './tools';
import { buildEvents } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listProjects,
    getProject,
    manageProject,
    getProjectSettings,
    getBuildHistory,
    startBuild,
    manageBuild,
    getBuildLogAndArtifacts,
    manageEnvironment,
    manageDeployment,
    manageUsers,
    manageCollaborators,
    manageRoles,
    encryptValue
  ],
  triggers: [buildEvents]
});
