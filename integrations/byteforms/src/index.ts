import { Slate } from 'slates';
import { spec } from './spec';
import { getFormTool, listFormsTool, listSubmissionsTool } from './tools';
export let provider = Slate.create({
  spec,
  tools: [listFormsTool, getFormTool, listSubmissionsTool],
  triggers: []
});
