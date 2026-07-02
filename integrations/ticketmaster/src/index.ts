import { Slate } from 'slates';
import { spec } from './spec';
import {
  browseClassificationsTool,
  checkInventoryStatusTool,
  getAttractionDetailsTool,
  getEventDetailsTool,
  getEventOffersTool,
  getVenueDetailsTool,
  searchAttractionsTool,
  searchEventsTool,
  searchVenuesTool,
  suggestSearchTool
} from './tools';
import { eventStatusChangesTrigger, inboundWebhook, newEventsTrigger } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    searchEventsTool,
    getEventDetailsTool,
    searchAttractionsTool,
    getAttractionDetailsTool,
    searchVenuesTool,
    getVenueDetailsTool,
    getEventOffersTool,
    checkInventoryStatusTool,
    browseClassificationsTool,
    suggestSearchTool
  ],
  triggers: [inboundWebhook, newEventsTrigger, eventStatusChangesTrigger]
});
