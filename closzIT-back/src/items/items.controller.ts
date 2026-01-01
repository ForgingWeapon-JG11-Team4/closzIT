import { Controller, Get, Delete, Param, Query, Logger } from '@nestjs/common';
import { ItemsService } from './items.service';

@Controller('items')
export class ItemsController {
    private readonly logger = new Logger(ItemsController.name);

    constructor(private readonly itemsService: ItemsService) {}

    /**
     * GET /items
     * 옷 목록을 카테고리별로 그룹화하여 반환합니다.
     * @query isAdmin - true: 관리자 샘플, false: 사용자 아이템 (기본값: true)
     */
    @Get()
    async getAllItems(@Query('isAdmin') isAdmin?: string) {
        const useAdminItems = isAdmin !== 'false'; // 기본값 true
        this.logger.log(`[GET /items] Fetching items (isAdmin: ${useAdminItems})`);

        const groupedItems = await this.itemsService.findAllGroupedByCategory(useAdminItems);

        this.logger.log(`[GET /items] Returning items: outerwear=${groupedItems.outerwear.length}, tops=${groupedItems.tops.length}, bottoms=${groupedItems.bottoms.length}, shoes=${groupedItems.shoes.length}`);

        return groupedItems;
    }

    /**
     * DELETE /items/:id
     * 특정 아이템을 삭제합니다.
     */
    @Delete(':id')
    async deleteItem(@Param('id') id: string) {
        this.logger.log(`[DELETE /items/${id}] Deleting item`);

        await this.itemsService.deleteItem(parseInt(id));

        this.logger.log(`[DELETE /items/${id}] Item deleted successfully`);

        return { message: 'Item deleted successfully' };
    }
}
