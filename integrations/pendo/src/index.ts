import { Slate } from 'slates';
import { spec } from './spec';
import {
  bulkDelete,
  createSegment,
  deleteSegment,
  getAccount,
  getGuide,
  getMetadataSchema,
  getReport,
  getVisitor,
  listFeatures,
  listGuides,
  listPages,
  listSegments,
  runAggregation,
  updateAccountMetadata,
  updateVisitorMetadata
} from './tools';
import { pendoEvents } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    getVisitor,
    getAccount,
    updateVisitorMetadata,
    updateAccountMetadata,
    listGuides,
    getGuide,
    listSegments,
    createSegment,
    deleteSegment,
    runAggregation,
    listPages,
    listFeatures,
    bulkDelete,
    getReport,
    getMetadataSchema
  ],
  triggers: [pendoEvents]
});
