import { Body, Controller, Get, Post, Query, UseGuards, Req } from '@nestjs/common';
import { WorkoutService } from './workout.service';
import { CreateWorkoutDto } from './dto/create-workout.dto';
import { AuthGuard } from '@nestjs/passport';
import { WorkOut } from './schemas/workout.schema';

@Controller('workout')
// @UseGuards(AuthGuard())
export class WorkoutController {
  constructor(private readonly workoutService: WorkoutService) {}

  // userId와 duration에 따른 운동 기록 가져오기
  @Get()
  async getWorkouts(@Req() req:any , @Query('duration') duration: number) {
    return this.workoutService.findWorkoutsByUserAndDuration(req.user._id, duration);
  }

  @Post('/start_exercise')
    getRecord(@Req() req:any, @Body() body: { exercise: string, duration: number} ): Promise<{ count?: number; date?: string; message?: string }> {
        return this.workoutService.getRecord(req.user._id, body.exercise, body.duration);
    }
  
    // 운동 기록 생성 (end_exercise)
  @Post('/end_exercise')
  createRecord(@Body() body: { exercise: string, duration: number, count: number, date: string },
              @Req() req:any,
            ): Promise<{ message: string }> {
            return this.workoutService.createRecord(body.exercise, Number(body.duration), body.count, body.date, req.user._id);
          }
  
  @Get('/get_ranking')
  getRanking(@Query('exercise') exercise: string , @Query('duration') duration: number): Promise<WorkOut[]>{
    try {
      return this.workoutService.getRanking(exercise, duration)
    } catch (error){
      console.error(error.message);
      throw new Error('랭킹이 존재하지 않습니다!');
    }
  }
}
