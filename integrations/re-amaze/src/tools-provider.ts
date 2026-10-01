import { Slate } from 'slates';
import { spec } from './spec';
import { tools } from './tools/registry';

// Live tools tests use this entrypoint while legacy trigger migration is tracked separately.
export const provider = Slate.create({ spec, tools, triggers: [] });
