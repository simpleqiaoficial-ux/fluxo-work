import { IsEnum } from 'class-validator';
import { SignatureStatus } from '@prisma/client';

export class UpdateContractSignatureDto {
  @IsEnum(SignatureStatus)
  signatureStatus: SignatureStatus;
}
