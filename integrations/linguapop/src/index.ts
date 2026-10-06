import { Slate } from 'slates';
import { spec } from './spec';
import { getLanguages, sendTestInvitation } from './tools';
export let provider = Slate.create({
  spec,
  tools: [getLanguages, sendTestInvitation],
  triggers: []
});
