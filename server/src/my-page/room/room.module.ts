import { Module } from '@nestjs/common';
import {MongooseModule} from '@nestjs/mongoose';
import {Room, RoomSchema} from './schema/room.schema';
import { RoomService } from './room.service';
import { RoomController } from './room.controller';


@Module({
  imports:[
    MongooseModule.forFeature([
      {name:Room.name, schema:RoomSchema}
    ])
  ],
  providers: [RoomService],
  controllers: [RoomController], 
  exports:[RoomService],
})
export class RoomModule {}
