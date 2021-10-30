import { Test, TestingModule } from '@nestjs/testing';
import { EveAuthService } from './eve-auth.service';

describe('EveAuthService', () => {
  let service: EveAuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EveAuthService],
    }).compile();

    service = module.get<EveAuthService>(EveAuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
