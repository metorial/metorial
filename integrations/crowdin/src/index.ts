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
import {
  commentEventsTrigger,
  fileEventsTrigger,
  projectEventsTrigger,
  stringEventsTrigger,
  suggestionEventsTrigger,
  taskEventsTrigger
} from './triggers';

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
  triggers: [
    fileEventsTrigger,
    projectEventsTrigger,
    stringEventsTrigger,
    suggestionEventsTrigger,
    taskEventsTrigger,
    commentEventsTrigger
  ]
});
