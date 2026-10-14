import { Slate } from 'slates';
import { spec } from './spec';
import {
  encryptValue,
  getBuildHistory,
  getBuildLogAndArtifacts,
  getProject,
  getProjectDeployments,
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
export let provider = Slate.create({
  spec,
  tools: [
    listProjects,
    getProject,
    getProjectDeployments,
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
  triggers: []
});
