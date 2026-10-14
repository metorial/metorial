import { Slate } from 'slates';
import { spec } from './spec';
import {
  aiDesignAssistantTool,
  generateImageTool,
  generateSignedImageTool,
  listDesignsTool
} from './tools';

export let provider = Slate.create({
  spec,
  tools: [generateImageTool, listDesignsTool, aiDesignAssistantTool, generateSignedImageTool],
  triggers: []
});
