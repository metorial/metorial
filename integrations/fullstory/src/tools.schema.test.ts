import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { provider } from './index';

describeMcpCompatibleToolSchemas('FullStory tool input schemas', provider.actions);
