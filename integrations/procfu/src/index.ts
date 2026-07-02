import { Slate } from 'slates';
import { spec } from './spec';
import {
  createPodioItem,
  deletePodioItem,
  filterPodioItems,
  getPodioAppInfo,
  getPodioItem,
  managePodioComment,
  manageVariables,
  podioRawApi,
  queryMysql,
  runProcScript,
  searchPodioItems,
  sendOauthApiRequest,
  triggerPwaFlow,
  updatePodioItem
} from './tools';

import { inboundWebhook } from './triggers/inbound-webhook';

export let provider = Slate.create({
  spec,
  tools: [
    getPodioItem,
    createPodioItem,
    updatePodioItem,
    deletePodioItem,
    searchPodioItems,
    filterPodioItems,
    managePodioComment,
    runProcScript,
    manageVariables,
    triggerPwaFlow,
    queryMysql,
    getPodioAppInfo,
    podioRawApi,
    sendOauthApiRequest
  ],
  triggers: [inboundWebhook]
});
