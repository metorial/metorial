import { Slate } from 'slates';
import { spec } from './spec';
import {
  createDevResource,
  deleteComment,
  deleteDevResource,
  exportImages,
  getComponents,
  getDevResources,
  getFile,
  getFileVersions,
  getImageFills,
  getStyles,
  getUser,
  getVariables,
  listComments,
  listProjectFiles,
  listTeamProjects,
  postComment,
  updateVariables
} from './tools';
import { commentEvents, devModeStatusEvents, fileEvents, libraryPublish } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    getFile,
    exportImages,
    getImageFills,
    listComments,
    postComment,
    deleteComment,
    getFileVersions,
    listTeamProjects,
    listProjectFiles,
    getComponents,
    getStyles,
    getUser,
    getVariables,
    updateVariables,
    getDevResources,
    createDevResource,
    deleteDevResource
  ],
  triggers: [fileEvents, commentEvents, libraryPublish, devModeStatusEvents]
});
