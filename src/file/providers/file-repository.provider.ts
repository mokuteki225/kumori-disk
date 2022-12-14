import { Provider } from '@nestjs/common';
import { FILE_REPOSITORY_TOKEN } from '../constants/file.constants';
import { TypeOrmFileRepositoryImplementation } from '../repositories/typeorm-file.repository';

export const FileRepositoryProvider: Provider = {
  provide: FILE_REPOSITORY_TOKEN,
  useClass: TypeOrmFileRepositoryImplementation,
};
