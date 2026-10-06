import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'loom',
  name: 'Loom',
  description:
    'Retrieve anonymous Loom oEmbed metadata, generate embed snippets and replace supported video links in text. Existing video privacy remains in effect.',
  metadata: {},
  config,
  auth
});
