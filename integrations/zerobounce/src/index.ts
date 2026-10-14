import { Slate } from 'slates';
import { spec } from './spec';
import {
  findEmail,
  getAccountInfo,
  getActivityData,
  scoreEmail,
  searchDomain,
  validateEmail
} from './tools';

export let provider = Slate.create({
  spec,
  tools: [validateEmail, scoreEmail, findEmail, getActivityData, getAccountInfo, searchDomain],
  triggers: []
});
