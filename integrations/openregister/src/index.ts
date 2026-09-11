import { Slate } from 'slates';
import { spec } from './spec';
import * as tools from './tools';

export const provider = Slate.create({ spec, tools: Object.values(tools), triggers: [] });
