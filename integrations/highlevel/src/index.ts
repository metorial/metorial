import { Slate } from 'slates';
import { toolCategories } from './categories';
import { spec } from './spec';
import { tools } from './tools';

export const provider = Slate.create({ spec, tools, toolCategories, triggers: [] });
