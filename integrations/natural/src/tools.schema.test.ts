import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { provider } from './index';

describeMcpCompatibleToolSchemas('Natural tool input schemas', provider.actions);
