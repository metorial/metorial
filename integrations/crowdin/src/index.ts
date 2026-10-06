import { Slate } from 'slates';
import { spec } from './spec';
import {
  buildTranslationsTool,
  downloadFileTool,
  getProjectTool,
  listFilesTool,
  listMembersTool,
  listProjectsTool,
  manageGlossaryTool,
  manageProjectTool,
  manageSourceFileTool,
  manageStringsTool,
  manageTasksTool,
  manageTMTool,
  manageTranslationsTool,
  translationStatusTool
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    listProjectsTool,
    getProjectTool,
    manageProjectTool,
    listFilesTool,
    manageSourceFileTool,
    downloadFileTool,
    manageStringsTool,
    translationStatusTool,
    buildTranslationsTool,
    manageTranslationsTool,
    manageTMTool,
    manageGlossaryTool,
    manageTasksTool,
    listMembersTool
  ],
  triggers: []
});
