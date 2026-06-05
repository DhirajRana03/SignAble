import { Module } from '@nestjs/common';

import { SigningModule } from '../signing/signing.module';
import { VerifyController } from './verify.controller';
import { VerifyService } from './verify.service';

@Module({
  imports: [SigningModule],
  controllers: [VerifyController],
  providers: [VerifyService],
})
export class VerifyModule {}
