import { Slate } from 'slates';
import { spec } from './spec';
import { getLanguages, sendTestInvitation } from './tools';
import { placementTestCompleted } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [getLanguages, sendTestInvitation],
  triggers: [placementTestCompleted]
});
