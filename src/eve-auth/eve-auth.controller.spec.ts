import { Test, TestingModule } from '@nestjs/testing';
import { EveAuthController } from './eve-auth.controller';

describe('EveAuthController', () => {
  let controller: EveAuthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EveAuthController],
    }).compile();

    controller = module.get<EveAuthController>(EveAuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
