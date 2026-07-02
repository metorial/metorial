import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'triggercmd',
  name: 'TRIGGERcmd',
  description:
    'TRIGGERcmd is a cloud service that allows you to securely and remotely run commands on your computers. Users install a TRIGGERcmd agent on their computers, configure commands locally, and then trigger those commands remotely via the web, REST API, or voice assistants.',
  metadata: {},
  config,
  auth
});
