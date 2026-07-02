import { Slate } from 'slates';
import { spec } from './spec';
import {
  createRecordsTool,
  deleteRecordsTool,
  getBaseSchemaTool,
  getRecordTool,
  listBasesTool,
  listRecordsTool,
  manageCommentTool,
  manageFieldTool,
  manageTableTool,
  updateRecordsTool,
  uploadAttachmentTool,
  upsertRecordsTool
} from './tools';
import { baseChangesTrigger } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listRecordsTool,
    getRecordTool,
    createRecordsTool,
    updateRecordsTool,
    deleteRecordsTool,
    upsertRecordsTool,
    getBaseSchemaTool,
    manageTableTool,
    manageFieldTool,
    manageCommentTool,
    listBasesTool,
    uploadAttachmentTool
  ],
  triggers: [baseChangesTrigger]
});
