import { Global, Module } from '@nestjs/common';

import { ProcessorService } from './processor.service';

@Global()
@Module({
  providers: [ProcessorService],
  exports: [ProcessorService],
})
export class ProcessorModule {}
