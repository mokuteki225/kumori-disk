import { FileConsumer } from '../enums/file-consumer.enum';

export interface CreateFile {
  readonly key: string;
  readonly sizeInBytes: number;
  readonly ownerId: string;
  readonly ownerType: FileConsumer;
}
