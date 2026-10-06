import { Slate } from 'slates';
import { spec } from './spec';
import {
  batchCreateOrUpdateTool,
  createEntityTool,
  deleteEntityTool,
  getSchemaTool,
  manageCollectionTool,
  manageDocumentTool,
  queryEntitiesTool,
  updateEntityTool,
  uploadFileTool
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    getSchemaTool,
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
