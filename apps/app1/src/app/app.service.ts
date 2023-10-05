import { Injectable } from '@nestjs/common';
import { StringUtil } from '@monorepo-release-string';

@Injectable()
export class AppService {
  getData(): { message: string } {
    return ({ message: StringUtil.hello() });
  }
}
