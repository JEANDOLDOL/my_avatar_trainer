import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from './auth/auth.module';
import { WorkoutModule } from './workout/workout.module';
import { SocauthModule } from './socauth/socauth.module';
import { ConfigModule } from '@nestjs/config';
import { MultiplayerGateway } from './multiplay/multiplayer.gateway';
import { MyPageModule } from './my-page/my-page.module';
import { TierModule } from './tier/tier.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', '..', 'pose', 'build'), // 정적 파일 경로
    }),
    MongooseModule.forRoot('mongodb://localhost:27017/m_a_t'),
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    AuthModule,
    WorkoutModule,
    SocauthModule,
    MyPageModule,
    TierModule,
  ],
  providers: [MultiplayerGateway], // GatewayModule 대신 MultiplayerGateway 추가
})
export class AppModule {}