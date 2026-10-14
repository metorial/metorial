import { Slate } from 'slates';
import { spec } from './spec';
import {
  batchCreateOrUpdateTool,
  createEntityTool,
  deleteEntityTool,
  getCurrentUserTool,
  getSchemaTool,
  listUsersTool,
  manageCollectionTool,
  manageDocumentTool,
  queryEntitiesTool,
  updateEntityTool,
  uploadFileTool
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    getCurrentUserTool,
    getSchemaTool,
    listUsersTool,
    queryEntitiesTool,
    createEntityTool,
    updateEntityTool,
    deleteEntityTool,
    manageDocumentTool,
    manageCollectionTool,
    uploadFileTool,
    batchCreateOrUpdateTool
  ],
  triggers: []
});
