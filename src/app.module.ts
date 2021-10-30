import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { EveAuthModule } from './eve-auth/eve-auth.module';

@Module({
  imports: [EveAuthModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
