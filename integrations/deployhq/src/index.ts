import { Slate } from 'slates';
import { spec } from './spec';
import {
  createConfigFile,
  createDeployment,
  createProject,
  createServer,
  createSshCommand,
  deleteConfigFile,
  deleteProject,
  deleteServer,
  deleteSshCommand,
  getDeployment,
  getProject,
  listConfigFiles,
  listDeployments,
  listProjects,
  listScheduledDeployments,
  listServerGroups,
  listServers,
  listSshCommands,
  updateConfigFile
} from './tools';
import { deploymentEvents, inboundWebhook } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listProjects,
    getProject,
    createProject,
    deleteProject,
    listServers,
    createServer,
    deleteServer,
    listServerGroups,
    createDeployment,
    getDeployment,
    listDeployments,
    listScheduledDeployments,
    listConfigFiles,
    createConfigFile,
    updateConfigFile,
    deleteConfigFile,
    listSshCommands,
    createSshCommand,
    deleteSshCommand
  ],
  triggers: [inboundWebhook, deploymentEvents]
});
