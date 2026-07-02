import { Slate } from 'slates';
import { spec } from './spec';
import {
  createEnvelopeTool,
  deleteEnvelopeTool,
  distributeEnvelopeTool,
  duplicateEnvelopeTool,
  findEnvelopesTool,
  getAuditLogTool,
  getEnvelopeTool,
  manageFieldsTool,
  manageFoldersTool,
  manageRecipientsTool,
  updateEnvelopeTool,
  useTemplateTool
} from './tools';
import { documentEventTrigger } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    findEnvelopesTool,
    getEnvelopeTool,
    createEnvelopeTool,
    updateEnvelopeTool,
    deleteEnvelopeTool,
    distributeEnvelopeTool,
    duplicateEnvelopeTool,
    manageRecipientsTool,
    manageFieldsTool,
    useTemplateTool,
    manageFoldersTool,
    getAuditLogTool
  ],
  triggers: [documentEventTrigger]
});
