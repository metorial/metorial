import { Slate } from 'slates';
import { spec } from './spec';
import {
  introspectSchema,
  listContentTypes,
  listSpaces,
  previewContent,
  queryContent
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [queryContent, previewContent, introspectSchema, listContentTypes, listSpaces],
  triggers: []
});
