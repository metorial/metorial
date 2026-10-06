import { Slate } from 'slates';
import { spec } from './spec';
import {
  batchUploadContactsTool,
  manageNewsletterTool,
  manageProductTool,
  sendCustomEventTool,
  upsertCartTool,
  upsertCustomerTool,
  upsertOrderTool
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    upsertCustomerTool,
    upsertOrderTool,
    manageProductTool,
    upsertCartTool,
    manageNewsletterTool,
    sendCustomEventTool,
    batchUploadContactsTool
  ],
  triggers: []
});
