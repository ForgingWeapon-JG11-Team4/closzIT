import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { ItemsService } from './items.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('items')
@UseGuards(JwtAuthGuard)
export class ItemsController {
  constructor(private readonly itemsService: ItemsService) {}

  @Get()
  async getItems(
    @Request() req,
    @Query('category') category?: string,
  ) {
    const userId = req.user.userId;
    return this.itemsService.getItemsByUser(userId, category);
  }

  @Get('by-category')
  async getItemsByCategory(@Request() req) {
    const userId = req.user.userId;
    return this.itemsService.getItemsGroupedByCategory(userId);
  }
}
