import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ActingUser } from '../../common/types/acting-user';
import { RecommendSizeDto } from './dto/recommend-size.dto';
import { SizeAdvisorService } from './size-advisor.service';

@ApiTags('size-advisor')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('size-advisor')
export class SizeAdvisorController {
  constructor(private readonly sizeAdvisorService: SizeAdvisorService) {}

  @Post('recommend')
  recommend(@CurrentUser() user: ActingUser, @Body() dto: RecommendSizeDto) {
    return this.sizeAdvisorService.recommend(user.userId, dto);
  }
}
