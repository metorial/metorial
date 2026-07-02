import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { provider } from './index';

describeMcpCompatibleToolSchemas('Opsgenie tool input schemas', provider.actions);
