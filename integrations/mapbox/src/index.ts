import { Slate } from 'slates';
import { spec } from './spec';
import {
  directionsTool,
  geocodeTool,
  geocodeV6Tool,
  isochroneTool,
  listFontsTool,
  manageDatasetFeaturesTool,
  manageDatasetsTool,
  manageStylesTool,
  manageTilesetsTool,
  manageTokensTool,
  manageUploadsTool,
  mapMatchingTool,
  matrixTool,
  optimizeRouteTool,
  staticImageTool,
  tilequeryTool,
  whoAmITool
} from './tools';

export let provider = Slate.create({
  spec,
  tools: [
    geocodeTool.build(),
    geocodeV6Tool.build(),
    whoAmITool.build(),
    directionsTool.build(),
    manageStylesTool.build(),
    manageDatasetsTool.build(),
    manageDatasetFeaturesTool.build(),
    staticImageTool.build(),
    isochroneTool.build(),
    matrixTool.build(),
    mapMatchingTool.build(),
    optimizeRouteTool.build(),
    tilequeryTool.build(),
    manageTokensTool.build(),
    manageTilesetsTool.build(),
    manageUploadsTool.build(),
    listFontsTool.build()
  ],
  triggers: []
});
