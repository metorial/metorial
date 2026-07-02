import { Slate } from 'slates';
import { spec } from './spec';
import {
  createHeadlessImport,
  createSchema,
  deleteHeadlessImport,
  deleteSchema,
  deleteUpload,
  getHeadlessImport,
  getSchema,
  getUpload,
  listHeadlessImports,
  listSchemas,
  listUploads,
  updateSchema
} from './tools';
import { importEvents } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listUploads,
    getUpload,
    deleteUpload,
    listSchemas,
    getSchema,
    createSchema,
    updateSchema,
    deleteSchema,
    createHeadlessImport,
    getHeadlessImport,
    listHeadlessImports,
    deleteHeadlessImport
  ],
  triggers: [importEvents]
});
