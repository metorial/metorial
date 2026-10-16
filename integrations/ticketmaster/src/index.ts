import { Slate } from 'slates';
import { toolCategories } from './categories';
import { spec } from './spec';
import {
  browseClassificationsTool,
  checkInventoryStatusTool,
  getAttractionDetailsTool,
  getClassificationDetailsTool,
  getEventDetailsTool,
  getEventOffersTool,
  getVenueDetailsTool,
  searchAttractionsTool,
  searchEventsTool,
  searchVenuesTool,
  suggestSearchTool
} from './tools';
export let provider = Slate.create({
  spec,
  toolCategories,
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
    getClassificationDetailsTool,
    suggestSearchTool
  ],
  triggers: []
});
