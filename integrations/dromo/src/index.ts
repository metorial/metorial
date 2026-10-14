import { Slate } from 'slates';
import { spec } from './spec';
import {
  createHeadlessImport,
  createSchema,
  deleteHeadlessImport,
  deleteSchema,
  deleteUpload,
  downloadHeadlessImport,
  downloadUpload,
  getFileUrl,
  getHeadlessImport,
  getSchema,
  getUpload,
  listHeadlessImports,
  listSchemas,
  listUploads,
  updateSchema
} from './tools';
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
    deleteHeadlessImport,
    downloadUpload,
    downloadHeadlessImport,
    getFileUrl
  ],
  triggers: []
});
