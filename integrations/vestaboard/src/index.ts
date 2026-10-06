import { Slate } from 'slates';
import { spec } from './spec';
import {
  composeVbml,
  formatText,
  getTransition,
  listSubscriptions,
  readMessage,
  sendMessage,
  setTransition
} from './tools';

export let provider = Slate.create({
  spec,
  tools: [
    sendMessage,
    readMessage,
    setTransition,
    getTransition,
    composeVbml,
    formatText,
    listSubscriptions
  ],
  triggers: []
});
