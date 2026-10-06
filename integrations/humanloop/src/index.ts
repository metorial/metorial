import { Slate } from 'slates';
import { spec } from './spec';
import {
  callPrompt,
  deployPrompt,
  logPromptResult,
  manageDataset,
  manageDirectory,
  manageEvaluator,
  manageFlow,
  manageLogs,
  managePrompt,
  manageTool,
  runEvaluation
} from './tools';

export let provider = Slate.create({
  spec,
  triggers: [],
  tools: [
    managePrompt,
    callPrompt,
    manageDataset,
    manageEvaluator,
    runEvaluation,
    manageFlow,
    manageTool,
    manageLogs,
    logPromptResult,
    deployPrompt,
    manageDirectory
  ]
});
