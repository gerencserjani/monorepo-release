import { Controller, Get } from '@nestjs/common';

import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getData() {
    console.log("sasddssd2s2assasdsddd")
    return this.appService.getData();
  }
}
