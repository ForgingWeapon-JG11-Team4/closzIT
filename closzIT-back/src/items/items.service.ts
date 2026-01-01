import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ItemsService {
    private readonly logger = new Logger(ItemsService.name);

    constructor(private readonly prismaService: PrismaService) {}

    /**
     * COMPLETED 상태인 아이템을 카테고리별로 그룹화하여 반환합니다.
     * @param isAdminItem - true: 관리자 샘플 아이템, false: 사용자 아이템
     */
    async findAllGroupedByCategory(isAdminItem: boolean = false) {
        this.logger.log(`Fetching completed items (isAdminItem: ${isAdminItem})`);
        
        const items = await this.prismaService.item.findMany({
            where: {
                status: 'COMPLETED',
                isAdminItem: isAdminItem,
            },
            orderBy: {
                id: 'desc',
            },
        });

        this.logger.log(`Found ${items.length} completed items (isAdminItem: ${isAdminItem})`);

        // 카테고리별로 그룹화
        const grouped = {
            outerwear: [],
            tops: [],
            bottoms: [],
            shoes: [],
        };

        for (const item of items) {
            const category = this.mapCategoryToGroup(item.category);
            if (category && grouped[category]) {
                grouped[category].push({
                    id: item.id,
                    name: item.sub_category || item.category,
                    image: item.image_url,
                    category: item.category,
                    sub_category: item.sub_category,
                    tpo: item.tpo,
                    season: item.season,
                });
            }
        }

        return grouped;
    }

    /**
     * DB의 category를 프론트엔드 카테고리 그룹으로 매핑합니다.
     */
    private mapCategoryToGroup(category: string): string | null {
        const categoryLower = category?.toLowerCase() || '';

        // 외투
        if (['outer', 'jacket', 'coat', 'outerwear', 'blazer', '자켓', '코트', '외투', '아우터'].some(c => categoryLower.includes(c))) {
            return 'outerwear';
        }

        // 상의
        if (['top', 'shirt', 'blouse', 'sweater', 't-shirt', 'tshirt', 'hoodie', '상의', '셔츠', '티셔츠', '니트', '맨투맨', '후드', 'clothing'].some(c => categoryLower.includes(c))) {
            return 'tops';
        }

        // 하의
        if (['bottom', 'pants', 'trousers', 'jeans', 'skirt', 'shorts', '바지', '하의', '청바지', '스커트', '치마', '반바지'].some(c => categoryLower.includes(c))) {
            return 'bottoms';
        }

        // 신발
        if (['shoes', 'sneakers', 'boots', 'sandals', '신발', '운동화', '구두', '부츠'].some(c => categoryLower.includes(c))) {
            return 'shoes';
        }

        // 기본값: 상의로 분류
        return 'tops';
    }

    /**
     * 아이템을 삭제합니다.
     */
    async deleteItem(id: number) {
        this.logger.log(`Deleting item with id: ${id}`);
        
        return this.prismaService.item.delete({
            where: { id },
        });
    }
}
