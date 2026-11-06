import { IsIn, IsOptional, IsString, Length } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
export class CreateTicketDto {
  @ApiProperty() @IsString() @Length(3, 160) subject: string;
  @ApiProperty() @IsString() @Length(10, 8000) description: string;
  @ApiPropertyOptional() @IsString() @IsOptional() clientId?: string;
  @ApiPropertyOptional({ enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] }) @IsIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT']) @IsOptional() priority?: any;
}
export class UpdateTicketDto {
  @ApiPropertyOptional({ enum: ['OPEN', 'IN_PROGRESS', 'WAITING_CLIENT', 'RESOLVED', 'CLOSED'] }) @IsIn(['OPEN', 'IN_PROGRESS', 'WAITING_CLIENT', 'RESOLVED', 'CLOSED']) @IsOptional() status?: any;
  @ApiPropertyOptional() @IsString() @IsOptional() assigneeId?: string | null;
  @ApiPropertyOptional({ enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] }) @IsIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT']) @IsOptional() priority?: any;
}
