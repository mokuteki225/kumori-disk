import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UseGuards,
} from '@nestjs/common';
import { Args, Context, Mutation, Resolver } from '@nestjs/graphql';
import { FileNotAccessibleError } from 'src/file/errors/file-not-accessible.error';
import { FileNotCreatedInDatabaseError } from 'src/file/errors/file-not-created-in-database.error';
import { FileNotUploadedToStorageError } from 'src/file/errors/file-not-uploaded-to-storage.error';
import { convertGraphQLFileToFile } from 'src/file/file.utils';
import { UploadFileSchema } from 'src/file/schema/upload-file.schema';
import { GraphQLContext } from 'src/graphql/interfaces/graphql-context.interface';
import { UserNotFoundByIdError } from './errors/user-not-found-by-uuid.error';
import { UserService } from './user.service';
import { UserShareAccessSchema } from './schema/user-share-access.schema';
import { UserRevokeAccessSchema } from './schema/user-revoke-access.schema';
import { JwtAuthGuard } from 'src/jwt/guards/jwt-auth.guard';
import { JwtPayloadDecorator } from 'src/jwt/decorators/jwt-payload.decorator';
import { JwtPayload } from 'src/jwt/interfaces/jwt-payload.interface';

@Resolver()
export class UserResolver {
  constructor(private readonly userService: UserService) {}

  @UseGuards(JwtAuthGuard)
  @Mutation(() => String, { name: 'uploadSingleFile' })
  public async uploadSingleFile(
    @Args('schema') schema: UploadFileSchema,
  ): Promise<string> {
    try {
      const userId = '123e4567-e89b-12d3-a456-426655440000';
      const file = await convertGraphQLFileToFile(schema);

      const key = await this.userService.uploadSingleFileWithException(
        userId,
        file,
      );

      return key;
    } catch (err) {
      if (
        err instanceof FileNotUploadedToStorageError ||
        err instanceof FileNotCreatedInDatabaseError
      ) {
        throw new ConflictException(err);
      }

      throw new BadRequestException();
    }
  }

  @UseGuards(JwtAuthGuard)
  @Mutation(() => Boolean, { name: 'userShareAccess' })
  public async shareAccess(
    @JwtPayloadDecorator() jwtPayload: JwtPayload,
    @Args('schema') schema: UserShareAccessSchema,
  ): Promise<boolean> {
    try {
      const shared = await this.userService.shareAccessWithException(
        jwtPayload.id,
        schema,
      );

      return shared;
    } catch (err) {
      if (err instanceof FileNotAccessibleError) {
        throw new ForbiddenException(err);
      }
      if (err instanceof UserNotFoundByIdError) {
        throw new NotFoundException(err);
      }

      throw new BadRequestException();
    }
  }

  @UseGuards(JwtAuthGuard)
  @Mutation(() => Boolean, { name: 'userRevokeAccess' })
  public async revokeAccess(
    @JwtPayloadDecorator() jwtPayload: JwtPayload,
    @Args('schema') schema: UserRevokeAccessSchema,
  ): Promise<boolean> {
    try {
      const revoked = await this.userService.revokeAccessWithException(
        jwtPayload.id,
        schema,
      );

      return revoked;
    } catch (err) {
      if (err instanceof FileNotAccessibleError) {
        throw new ForbiddenException(err);
      }

      throw new BadRequestException();
    }
  }
}
