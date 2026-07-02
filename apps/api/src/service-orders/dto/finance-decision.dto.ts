import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { ServiceOrderDecision } from './service-order-decision.enum';

export class FinanceDecisionDto {
  @IsEnum(ServiceOrderDecision)
  decision: ServiceOrderDecision;

  @IsOptional()
  @IsString()
  note?: string;

  // Correção de valor que o Financeiro pode aplicar ao aprovar (spec 4.5: "Financeiro
  // aprova, recusa ou ajusta valores"). Só tem efeito quando decision = APPROVE.
  @IsOptional()
  @IsNumber()
  adjustments?: number;
}
