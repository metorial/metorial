import { Slate } from 'slates';
import { spec } from './spec';
import {
  callConnector,
  createAuthentication,
  createSolutionInstance,
  createUser,
  deleteAuthentication,
  deleteSolutionInstance,
  deleteUser,
  generateUserToken,
  getConnectorOperations,
  getSolutionInstance,
  listAuthentications,
  listConnectors,
  listSolutionInstances,
  listSolutions,
  listUsers,
  updateSolutionInstance,
  upgradeSolutionInstance
} from './tools';
import { solutionInstanceChanges, workflowWebhook } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listConnectors,
    getConnectorOperations,
    callConnector,
    listUsers,
    createUser,
    deleteUser,
    generateUserToken,
    listSolutions,
    listSolutionInstances,
    getSolutionInstance,
    createSolutionInstance,
    updateSolutionInstance,
    deleteSolutionInstance,
    upgradeSolutionInstance,
    listAuthentications,
    createAuthentication,
    deleteAuthentication
  ],
  triggers: [workflowWebhook, solutionInstanceChanges]
});
