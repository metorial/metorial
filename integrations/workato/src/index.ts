import { Slate } from 'slates';
import { spec } from './spec';
import {
  deployProjectTool,
  exportPackageTool,
  getRecipeTool,
  getRecipeVersionsTool,
  getWorkspaceInfoTool,
  listConnectionsTool,
  listDeploymentsTool,
  listJobsTool,
  listProjectsTool,
  listRecipesTool,
  manageApiEndpointsTool,
  manageConnectionTool,
  manageDataTableTool,
  manageEnvironmentPropertiesTool,
  manageEventTopicTool,
  manageFolderTool,
  manageLookupTableTool,
  manageRecipeTool,
  startStopRecipeTool
} from './tools';
import {
  eventStreamMessagesTrigger,
  inboundWebhook,
  newJobTrigger,
  recipeChangesTrigger
} from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listRecipesTool.build(),
    getRecipeTool.build(),
    manageRecipeTool.build(),
    startStopRecipeTool.build(),
    getRecipeVersionsTool.build(),
    listConnectionsTool.build(),
    manageConnectionTool.build(),
    listJobsTool.build(),
    listProjectsTool.build(),
    manageFolderTool.build(),
    deployProjectTool.build(),
    listDeploymentsTool.build(),
    exportPackageTool.build(),
    manageLookupTableTool.build(),
    manageEventTopicTool.build(),
    manageDataTableTool.build(),
    manageEnvironmentPropertiesTool.build(),
    manageApiEndpointsTool.build(),
    getWorkspaceInfoTool.build()
  ],
  triggers: [
    inboundWebhook,
    recipeChangesTrigger.build(),
    newJobTrigger.build(),
    eventStreamMessagesTrigger.build()
  ]
});
