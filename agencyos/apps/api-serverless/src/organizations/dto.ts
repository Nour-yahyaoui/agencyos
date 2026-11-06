import { IsOptional, IsString, Length, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
export class CreateOrganizationDto { @ApiProperty() @IsString() @Length(2, 80) name: string; @ApiPropertyOptional() @IsString() @MaxLength(500) @IsOptional() description?: string; }
export class UpdateOrganizationDto extends CreateOrganizationDto {}
