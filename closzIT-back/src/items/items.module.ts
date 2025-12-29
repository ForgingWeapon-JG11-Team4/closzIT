import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
// import { ItemsService } from './items.service'; // Service가 있다면

@Module({
    imports: [PrismaModule],
    controllers: [],
    providers: [],
})
export class ItemsModule { }
