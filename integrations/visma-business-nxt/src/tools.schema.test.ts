import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { provider } from './index';

describeMcpCompatibleToolSchemas('Visma Business NXT tool input schemas', provider.actions);
