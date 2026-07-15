import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from '../products/product.entity';
import { ChatbotService } from './chatbot.service';
import { ChatbotController } from './chatbot.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Product])],
  controllers: [ChatbotController],
  providers: [ChatbotService],
})
export class ChatbotModule {}
