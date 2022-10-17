import { MimeType } from '../enums/mime-type.enum';

export interface UploadFile {
  readonly userId: string;

  readonly name: string;

  readonly extension: MimeType;

  readonly path: string;

  readonly buffer: Buffer;
}
