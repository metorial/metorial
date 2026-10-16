import { Slate } from 'slates';
import { spec } from './spec';
import {
  createPodioItem,
  deletePodioItem,
  filterPodioItems,
  getAccountUsage,
  getLastError,
  getPodioAppInfo,
  getPodioItem,
  listPodioOrganizations,
  managePodioComment,
  manageVariables,
  podioRawApi,
  queryMysql,
  runProcScript,
  searchPodioItems,
  sendOauthApiRequest,
  triggerPwaFlow,
  updatePodioItem,
  whoAmI
} from './tools';

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
    sendOauthApiRequest,
    whoAmI,
    getAccountUsage,
    getLastError,
    listPodioOrganizations
  ],
  triggers: []
});
