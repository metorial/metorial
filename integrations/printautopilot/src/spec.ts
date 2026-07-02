import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'printautopilot',
  name: 'PrintAutopilot',
  description:
    'Cloud-based service that connects applications to physical printers, enabling automated PDF document printing via remote print queues.',
  metadata: {},
  config,
  auth
});
