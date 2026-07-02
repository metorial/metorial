import { Slate } from 'slates';
import { spec } from './spec';
import {
  analyzeTextTool,
  createKeyTool,
  deleteKeyTool,
  deleteProjectTool,
  getBalancesTool,
  getModelTool,
  getProjectTool,
  getUsageTool,
  listKeysTool,
  listMembersTool,
  listModelsTool,
  listProjectsTool,
  removeMemberTool,
  sendInvitationTool,
  textToSpeechTool,
  transcribeAudioTool,
  updateMemberScopesTool,
  updateProjectTool
} from './tools';
import { transcriptionCallbackTrigger } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    transcribeAudioTool,
    textToSpeechTool,
    analyzeTextTool,
    listProjectsTool,
    getProjectTool,
    updateProjectTool,
    deleteProjectTool,
    listMembersTool,
    removeMemberTool,
    updateMemberScopesTool,
    sendInvitationTool,
    listKeysTool,
    createKeyTool,
    deleteKeyTool,
    listModelsTool,
    getModelTool,
    getUsageTool,
    getBalancesTool
  ],
  triggers: [transcriptionCallbackTrigger]
});
