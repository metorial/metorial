import { Slate } from 'slates';
import { spec } from './spec';
import {
  generateContentTool,
  generateFromTemplateTool,
  getGammaTool,
  getGenerationStatusTool,
  listFoldersTool,
  listThemesTool,
  searchGammasTool,
  searchTemplatesTool
} from './tools';

export let provider = Slate.create({
  spec,
  tools: [
    generateContentTool.build(),
    generateFromTemplateTool.build(),
    getGenerationStatusTool.build(),
    listThemesTool.build(),
    listFoldersTool.build(),
    searchGammasTool.build(),
    searchTemplatesTool.build(),
    getGammaTool.build()
  ],
  triggers: []
});
