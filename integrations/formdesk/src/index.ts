import { Slate } from 'slates';
import { spec } from './spec';
import {
  addResult,
  addVisitor,
  authenticateVisitor,
  exportResults,
  getFile,
  getFormFilters,
  getFormResults,
  getResultDetails,
  getResultPdf,
  getVisitorResults,
  listForms,
  listVisitors,
  markResultProcessed,
  parkData,
  removeResult,
  removeVisitor,
  signOn,
  updateResult,
  updateVisitor
} from './tools';
import { inboundWebhook, newFormSubmission } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listForms,
    getFormResults,
    getResultDetails,
    addResult,
    updateResult,
    removeResult,
    markResultProcessed,
    exportResults,
    getResultPdf,
    getFile,
    getFormFilters,
    listVisitors,
    addVisitor,
    updateVisitor,
    removeVisitor,
    getVisitorResults,
    authenticateVisitor,
    signOn,
    parkData
  ],
  triggers: [inboundWebhook, newFormSubmission]
});
