import { toolCategory } from 'slates';
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

export let toolCategories = [
  toolCategory({
    key: 'discovery',
    name: 'Discovery API',
    description: 'Search events, attractions, venues, and classification hierarchies.',
    tools: [
      searchEventsTool,
      getEventDetailsTool,
      searchAttractionsTool,
      getAttractionDetailsTool,
      searchVenuesTool,
      getVenueDetailsTool,
      browseClassificationsTool,
      getClassificationDetailsTool,
      suggestSearchTool
    ]
  }),
  toolCategory({
    key: 'commerce',
    name: 'Commerce API',
    description: 'Retrieve event offers using authorized Commerce access.',
    tools: [getEventOffersTool]
  }),
  toolCategory({
    key: 'inventory-status',
    name: 'Inventory Status API',
    description: 'Check primary and resale availability using separately authorized access.',
    tools: [checkInventoryStatusTool]
  })
];
