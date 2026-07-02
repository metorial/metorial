import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'virustotal',
  name: 'VirusTotal',
  description:
    "Analyze files, URLs, domains, and IP addresses for malware and security threats using VirusTotal's 70+ antivirus engines and security tools.",
  metadata: {},
  config,
  auth
});
