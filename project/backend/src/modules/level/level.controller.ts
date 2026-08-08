import { Controller, Get, Param, Query } from '@nestjs/common';
import { LevelService } from './level.service';
import { LevelDetail, LevelListResult } from './level.types';
import { LevelIdParamDto, ListLevelDto } from './dto/level.dto';

@Controller('levels')
export class LevelController {
  constructor(private readonly levelService: LevelService) {}

  /** GET /api/v1/levels */
  @Get()
  list(@Query() query: ListLevelDto): LevelListResult {
    return this.levelService.list({
      chapterId: query.chapter_id,
      puzzleType: query.puzzle_type,
      page: query.page,
      pageSize: query.page_size,
    });
  }

  /** GET /api/v1/levels/:id */
  @Get(':id')
  getDetail(@Param() param: LevelIdParamDto): LevelDetail {
    return this.levelService.getDetail(String(param.id));
  }
}
