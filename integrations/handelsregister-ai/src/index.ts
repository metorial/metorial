import { Slate } from 'slates';
import { spec } from './spec';
import { tools } from './tools';

export const provider = Slate.create({ spec, tools, triggers: [] });
