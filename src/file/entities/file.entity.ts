import { User } from 'src/user/entities/user.entity';
import { Column, Entity, ManyToMany, PrimaryGeneratedColumn } from 'typeorm';
import { FileConsumer } from '../enums/file-consumer.enum';

@Entity('file')
export class File {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'key', type: 'varchar', length: 320 })
  key: string;

  @Column({ name: 'size_in_bytes', type: 'bigint' })
  sizeInBytes: number;

  @ManyToMany(() => User, (user: User) => user.files)
  users: User[];

  @Column({ name: 'owner_id', type: 'uuid' })
  ownerId: string;

  @Column({ name: 'owner_type', type: 'enum', enum: FileConsumer })
  ownerType: FileConsumer;
}