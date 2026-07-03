import { IsEnum, IsOptional, IsString } from 'class-validator';
import { FinancialEntryDecision } from './financial-entry-decision.enum';

export class StepDecisionDto {
  @IsEnum(FinancialEntryDecision)
  decision: FinancialEntryDecision;

  @IsOptional()
  @IsString()
  note?: string;
}
