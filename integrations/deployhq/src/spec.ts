import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'deployhq',
  name: 'DeployHQ',
  description:
    'Deployment service that automates deploying code from version control repositories to servers via SSH/SFTP, FTP, S3, and other protocols.',
  metadata: {},
  config,
  auth
});
