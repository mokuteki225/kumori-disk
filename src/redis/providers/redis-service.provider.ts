import { Provider } from '@nestjs/common';
import { REDIS_SERVICE_TOKEN } from '../constants/redis.constants';
import { RedisServiceImplementation } from '../redis.service';

export const RedisServiceProvider: Provider = {
  provide: REDIS_SERVICE_TOKEN,
  useClass: RedisServiceImplementation,
};
