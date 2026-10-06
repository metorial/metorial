import { Slate } from 'slates';
import { spec } from './spec';
import {
  getCurrentUser,
  getSpaceInfo,
  getStory,
  listActivities,
  listAssets,
  listComponents,
  listSpaces,
  listStories,
  manageAsset,
  manageCollaborator,
  manageComponent,
  manageDatasource,
  manageDatasourceEntry,
  manageRelease,
  manageStory
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    getCurrentUser,
    listSpaces,
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
  triggers: []
});
