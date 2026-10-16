import { Slate } from 'slates';
import { spec } from './spec';
import {
  createTask,
  getBalance,
  getTaskResult,
  reportSolution,
  solveCaptcha,
  solveImageCaptcha
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    solveCaptcha,
    solveImageCaptcha,
    getTaskResult,
    reportSolution,
    getBalance,
    createTask
  ],
  triggers: []
});
