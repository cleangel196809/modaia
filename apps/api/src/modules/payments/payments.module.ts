import { Module } from '@nestjs/common';
import { OrdersModule } from '../orders/orders.module';
import { UsersModule } from '../users/users.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { WompiService } from './wompi.service';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';

@Module({
  imports: [OrdersModule, UsersModule, NotificationsModule],
  controllers: [PaymentsController],
  providers: [WompiService, PaymentsService],
})
export class PaymentsModule {}
