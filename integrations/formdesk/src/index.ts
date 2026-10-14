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
  getVisitor,
  getVisitorResults,
  listFiles,
  listFormItems,
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
export let provider = Slate.create({
  spec,
  tools: [
    listForms,
    listFormItems,
    getVisitor,
    listFiles,
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
  triggers: []
});
