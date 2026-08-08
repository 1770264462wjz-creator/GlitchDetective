import { Module } from '@nestjs/common';
import { SaveModule } from '../save/save.module';
import { UserController } from './user.controller';
import { UserService } from './user.service';

@Module({
  imports: [SaveModule],
  controllers: [UserController],
  providers: [UserService],
})
export class UserModule {}
