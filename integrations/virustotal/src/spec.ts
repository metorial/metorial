import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'virustotal',
  name: 'VirusTotal',
  description:
    'Retrieve VirusTotal indicator reports, request file rescans and URL analysis, explore relationships, and manage licensed hunting workflows.',
  metadata: {},
  config,
  auth
});
