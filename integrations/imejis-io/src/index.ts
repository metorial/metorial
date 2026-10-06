import { Slate } from 'slates';
import { spec } from './spec';
import { aiDesignAssistantTool, generateImageTool, listDesignsTool } from './tools';

export let provider = Slate.create({
  spec,
  tools: [generateImageTool, listDesignsTool, aiDesignAssistantTool],
  triggers: []
});
