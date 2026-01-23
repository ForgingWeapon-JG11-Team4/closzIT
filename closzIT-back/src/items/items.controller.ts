import { Controller, Get, Patch, Delete, Query, Param, Body, UseGuards, Request } from '@nestjs/common';
import { ItemsService } from './items.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('items')
@UseGuards(JwtAuthGuard)
export class ItemsController {
  constructor(private readonly itemsService: ItemsService) { }

  @Get()
  async getItems(
    @Request() req,
    @Query('category') category?: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    const userId = req.user.id;
    return this.itemsService.getItemsByUser(userId, category, +page, +limit);
  }

  @Get('by-category')
  async getItemsByCategory(
    @Request() req,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    const userId = req.user.id;
    return this.itemsService.getItemsGroupedByCategory(userId, +page, +limit);
  }

  @Get('by-category/:userId')
  async getPublicItemsByCategory(@Param('userId') userId: string) {
    return this.itemsService.getPublicItemsGroupedByCategory(userId);
  }

  @Get(':id')
  async getItemById(
    @Request() req,
    @Param('id') id: string,
  ) {
    const userId = req.user.id;
    return this.itemsService.getItemById(userId, id);
  }

  @Patch(':id')
  async updateItem(
    @Request() req,
    @Param('id') id: string,
    @Body() updateData: {
      category?: string;
      subCategory?: string;
      colors?: string[];
      patterns?: string[];
      details?: string[];
      styleMoods?: string[];
      tpos?: string[];
      seasons?: string[];
      note?: string;
    },
  ) {
    const userId = req.user.id;
    return this.itemsService.updateItem(userId, id, updateData);
  }

  @Patch(':id/visibility')
  async updateItemVisibility(
    @Request() req,
    @Param('id') id: string,
    @Body() body: { isPublic: boolean },
  ) {
    const userId = req.user.id;
    return this.itemsService.updateItemVisibility(userId, id, body.isPublic);
  }

  @Delete(':id')
  async deleteItem(
    @Request() req,
    @Param('id') id: string,
  ) {
    const userId = req.user.id;
    return this.itemsService.deleteItem(userId, id);
  }
}
