import { Slate } from 'slates';
import { spec } from './spec';
import {
  getBalance,
  getTaskResult,
  reportSolution,
  solveCaptcha,
  solveImageCaptcha
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [solveCaptcha, solveImageCaptcha, getTaskResult, reportSolution, getBalance],
  triggers: []
});
