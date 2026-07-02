import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'mxtoolbox',
  name: 'MXToolbox',
  description:
    'Network diagnostic and DNS lookup platform for checking domain health, DNS records, blacklist status, and email authentication.',
  metadata: {},
  config,
  auth
});
