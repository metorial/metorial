import { Slate } from 'slates';
import { spec } from './spec';
import {
  checkConnection,
  protectData,
  protectValue,
  unprotectData,
  unprotectValue
} from './tools';

export let provider = Slate.create({
  spec,
  tools: [protectData, unprotectData, protectValue, unprotectValue, checkConnection],
  triggers: []
});
