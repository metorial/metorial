import { Slate } from 'slates';
import { spec } from './spec';
import {
  getSpaceInfo,
  getStory,
  listActivities,
  listAssets,
  listComponents,
  listStories,
  manageAsset,
  manageCollaborator,
  manageComponent,
  manageDatasource,
  manageDatasourceEntry,
  manageRelease,
  manageStory
} from './tools';
import {
  assetEvents,
  datasourceEvents,
  releaseEvents,
  storyEvents,
  userEvents,
  workflowEvents
} from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    manageStory,
    listStories,
    getStory,
    manageComponent,
    listComponents,
    manageAsset,
    listAssets,
    manageDatasource,
    manageDatasourceEntry,
    manageCollaborator,
    manageRelease,
    getSpaceInfo,
    listActivities
  ],
  triggers: [
    storyEvents,
    assetEvents,
    userEvents,
    releaseEvents,
    workflowEvents,
    datasourceEvents
  ]
});
