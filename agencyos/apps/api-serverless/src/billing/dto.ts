import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsDateString, IsIn, IsInt, IsNumber, IsOptional, IsString, Length, MaxLength, Min, ValidateNested } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
export class InvoiceItemDto { @ApiProperty() @IsString() @Length(1, 200) description: string; @ApiProperty() @Type(() => Number) @IsInt() @Min(1) quantity: number; @ApiProperty() @Type(() => Number) @IsNumber() @Min(0) unitPrice: number; }
export class CreateInvoiceDto {
  @ApiProperty() @IsString() clientId: string;
  @ApiPropertyOptional() @IsString() @IsOptional() projectId?: string;
  @ApiProperty() @IsDateString() dueDate: string;
  @ApiPropertyOptional() @Type(() => Number) @IsNumber() @Min(0) @IsOptional() taxRate?: number;
  @ApiPropertyOptional() @IsString() @Length(3, 3) @IsOptional() currency?: string;
  @ApiPropertyOptional() @IsString() @MaxLength(2000) @IsOptional() notes?: string;
  @ApiProperty({ type: [InvoiceItemDto] }) @IsArray() @ArrayMinSize(1) @ValidateNested({ each: true }) @Type(() => InvoiceItemDto) items: InvoiceItemDto[];
}
export class UpdateInvoiceDto extends CreateInvoiceDto { @ApiPropertyOptional({ enum: ['DRAFT', 'SENT', 'VOID'] }) @IsIn(['DRAFT', 'SENT', 'VOID']) @IsOptional() status?: any; }
