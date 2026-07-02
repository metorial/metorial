import { Slate } from 'slates';
import { spec } from './spec';
import { aiDesignAssistantTool, generateImageTool, listDesignsTool } from './tools';

import { inboundWebhook } from './triggers/inbound-webhook';

export let provider = Slate.create({
  spec,
  tools: [generateImageTool, listDesignsTool, aiDesignAssistantTool],
  triggers: [inboundWebhook]
});
