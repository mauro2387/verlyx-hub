import { Module } from '@nestjs/common';
import { MyCompaniesController } from './my-companies.controller';
import { MyCompaniesService } from './my-companies.service';

@Module({
  controllers: [MyCompaniesController],
  providers: [MyCompaniesService],
  exports: [MyCompaniesService],
})
export class MyCompaniesModule {}
