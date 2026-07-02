import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ServiceOrderDecision } from './service-order-decision.enum';

export class ManagerDecisionDto {
  @IsEnum(ServiceOrderDecision)
  decision: ServiceOrderDecision;

  @IsOptional()
  @IsString()
  note?: string;
}
