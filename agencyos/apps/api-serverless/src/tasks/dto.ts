import { Type } from 'class-transformer';
import { IsDateString, IsIn, IsInt, IsNumber, IsOptional, IsString, Length, MaxLength, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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
