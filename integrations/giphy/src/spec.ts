import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'giphy',
  name: 'Giphy',
  description:
    "Search, discover, and retrieve GIFs, stickers, animated emoji, from GIPHY's content library, upload media, and register actual GIF interactions.",
  metadata: {},
  config,
  auth
});
