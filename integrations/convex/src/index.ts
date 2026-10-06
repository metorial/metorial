import { Slate } from 'slates';
import { spec } from './spec';
import {
  downloadFile,
  generateUploadUrl,
  getDeploymentInfo,
  getDocumentDeltas,
  listDocuments,
  manageEnvironmentVariables,
  runAction,
  runMutation,
  runQuery
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    runQuery,
    runMutation,
    runAction,
    listDocuments,
    getDocumentDeltas,
    manageEnvironmentVariables,
    generateUploadUrl,
    getDeploymentInfo,
    downloadFile
  ],
  triggers: []
});
