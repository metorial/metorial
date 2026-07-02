import { Slate } from 'slates';
import { spec } from './spec';
import { enrichCompany, resolveIp } from './tools';
import { companyEnriched } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [enrichCompany, resolveIp],
  triggers: [companyEnriched]
});
