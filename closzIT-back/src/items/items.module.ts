import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ItemsService } from './items.service';
import { ItemsController } from './items.controller';

@Module({
    imports: [PrismaModule],
    controllers: [ItemsController],
    providers: [ItemsService],
    exports: [ItemsService],
})
export class ItemsModule { }
