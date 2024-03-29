import { UserConfirmationStatuses } from '../enums/user-confirmation-statuses.enum';

export interface IUserEntity {
  readonly id: string;

  readonly email: string;

  readonly username: string;

  readonly password: string;

  readonly githubId?: number;

  readonly diskSpace: number;

  readonly confirmationStatus: UserConfirmationStatuses;
}
