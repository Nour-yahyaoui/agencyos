import { Type } from 'class-transformer';
import { IsDateString, IsIn, IsInt, IsNumber, IsOptional, IsString, Length, MaxLength, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../common/dto/pagination.dto';
export class CreateTaskDto {
  @ApiProperty() @IsString() projectId: string;
  @ApiProperty() @IsString() @Length(2, 160) title: string;
  @ApiPropertyOptional() @IsString() @MaxLength(5000) @IsOptional() description?: string;
  @ApiPropertyOptional({ enum: ['BACKLOG', 'TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'] }) @IsIn(['BACKLOG', 'TODO', 'IN_PROGRESS', 'REVIEW', 'DONE']) @IsOptional() status?: any;
  @ApiPropertyOptional({ enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] }) @IsIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT']) @IsOptional() priority?: any;
  @ApiPropertyOptional() @IsString() @IsOptional() assigneeId?: string | null;
  @ApiPropertyOptional() @IsString() @IsOptional() milestoneId?: string | null;
  @ApiPropertyOptional() @IsDateString() @IsOptional() dueDate?: string | null;
  @ApiPropertyOptional() @Type(() => Number) @IsNumber() @Min(0) @IsOptional() estimatedHours?: number;
}
export class UpdateTaskDto extends CreateTaskDto {}
export class MoveTaskDto {
  @ApiProperty({ enum: ['BACKLOG', 'TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'] }) @IsIn(['BACKLOG', 'TODO', 'IN_PROGRESS', 'REVIEW', 'DONE']) status: any;
  @ApiProperty() @Type(() => Number) @IsInt() @Min(0) position: number;
}
export class DependencyDto { @ApiProperty() @IsString() prerequisiteId: string; }

/**
 * Query filters for `GET /tasks`.
 *
 * The global ValidationPipe runs with `forbidNonWhitelisted`, so every accepted query parameter
 * has to be declared on the DTO that `@Query()` binds. Reading them with separate `@Query('x')`
 * decorators while binding the whole query to `PaginationDto` made the pipe reject the filters
 * ("property status should not exist") even though the controller understood them.
 */
export class TaskQueryDto extends PaginationDto {
  @ApiPropertyOptional() @IsString() @IsOptional() projectId?: string;
  @ApiPropertyOptional({ enum: ['BACKLOG', 'TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'] }) @IsIn(['BACKLOG', 'TODO', 'IN_PROGRESS', 'REVIEW', 'DONE']) @IsOptional() status?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() assigneeId?: string;
  @ApiPropertyOptional({ enum: ['true', 'false'] }) @IsIn(['true', 'false']) @IsOptional() overdue?: string;
}
