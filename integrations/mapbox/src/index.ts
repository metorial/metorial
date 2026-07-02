import { Slate } from 'slates';
import { spec } from './spec';
import {
  directionsTool,
  geocodeTool,
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
  tilequeryTool
} from './tools';

import { inboundWebhook } from './triggers/inbound-webhook';

export let provider = Slate.create({
  spec,
  tools: [
    geocodeTool.build(),
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
  triggers: [inboundWebhook]
});
