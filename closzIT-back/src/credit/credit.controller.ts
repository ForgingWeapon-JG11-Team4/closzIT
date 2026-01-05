import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { CreditService } from './credit.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('credit')
@UseGuards(JwtAuthGuard)
export class CreditController {
  constructor(private readonly creditService: CreditService) {}

  /**
   * 현재 사용자의 크레딧 조회
   */
  @Get()
  async getMyCredit(@Request() req) {
    const userId = req.user.userId;
    const credit = await this.creditService.getCredit(userId);
    return { credit };
  }

  /**
   * 현재 사용자의 크레딧 이력 조회
   */
  @Get('history')
  async getMyCreditHistory(@Request() req) {
    const userId = req.user.userId;
    const history = await this.creditService.getCreditHistory(userId);
    return { history };
  }
}
