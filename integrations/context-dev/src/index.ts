import { Slate } from 'slates';
import { spec } from './spec';
import {
  batchTools,
  diagnosticTools,
  getFileUrl,
  intelligenceTools,
  monitorTools,
  webhookTools,
  webTools
} from './tools';

export const provider = Slate.create({
  spec,
  triggers: [],
  tools: [
    ...webTools,
    ...intelligenceTools,
    ...batchTools,
    ...monitorTools,
    ...webhookTools,
    ...diagnosticTools,
    getFileUrl
  ]
});
