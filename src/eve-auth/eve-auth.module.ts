import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { EveAuthController } from './eve-auth.controller';
import { EveAuthService } from './eve-auth.service';

@Module({
  controllers: [EveAuthController],
  providers: [EveAuthService],
  imports: [HttpModule],
})
export class EveAuthModule {}
