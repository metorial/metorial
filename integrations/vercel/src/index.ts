import { Slate } from '@slates/provider';
import { spec } from './spec';
import {
  cancelDeploymentTool,
  createDeploymentTool,
  createProjectTool,
  deleteProjectTool,
  getDeploymentEventsTool,
  getDeploymentTool,
  getProjectTool,
  listDeploymentsTool,
  listProjectsTool,
  manageAliasesTool,
  manageDeployHooksTool,
  manageDnsTool,
  manageDomainsTool,
  manageEdgeConfigTool,
  manageEnvVarsTool,
  manageTeamsTool,
  promoteDeploymentTool,
  updateProjectTool
} from './tools';
import {
  deploymentEventsTrigger,
  domainEventsTrigger,
  projectEventsTrigger
} from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listProjectsTool,
    getProjectTool,
    createProjectTool,
    updateProjectTool,
    deleteProjectTool,
    listDeploymentsTool,
    getDeploymentTool,
    getDeploymentEventsTool,
    createDeploymentTool,
    cancelDeploymentTool,
    manageAliasesTool,
    manageDomainsTool,
    manageEnvVarsTool,
    manageDnsTool,
    manageTeamsTool,
    manageEdgeConfigTool,
    manageDeployHooksTool,
    promoteDeploymentTool
  ],
  triggers: [deploymentEventsTrigger, projectEventsTrigger, domainEventsTrigger]
});
