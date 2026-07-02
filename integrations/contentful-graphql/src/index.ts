import { Slate } from 'slates';
import { spec } from './spec';
import { introspectSchema, listContentTypes, previewContent, queryContent } from './tools';
import { assetEvents, contentTypeEvents, entryEvents } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [queryContent, previewContent, introspectSchema, listContentTypes],
  triggers: [entryEvents, assetEvents, contentTypeEvents]
});
