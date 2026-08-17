import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface RateLimitOptions {
  /** Número de tentativas permitidas dentro da janela antes de bloquear. */
  maxAttempts: number;
  /** Duração da janela de contagem, em milissegundos. */
  windowMs: number;
  /** Por quanto tempo bloquear depois de estourar o limite, em milissegundos. */
  blockMs: number;
}

const TOO_MANY_ATTEMPTS_MESSAGE =
  'Muitas tentativas. Tente novamente mais tarde.';

/**
 * Rate limiting de tentativas de autenticação, persistido no Postgres.
 *
 * Não usa memória do processo de propósito: a API roda em Cloud Run com
 * múltiplas instâncias e scale-to-zero, então um contador em memória seria
 * zerado a cada reciclagem de instância e não protegeria nada de fato.
 */
@Injectable()
export class AuthRateLimiterService {
  constructor(private readonly prisma: PrismaService) {}

  /** Lança 429 se a chave já estiver bloqueada por uma janela anterior. */
  async assertNotBlocked(key: string): Promise<void> {
    const record = await this.prisma.authAttempt.findUnique({
      where: { key },
    });

    if (record?.blockedUntil && record.blockedUntil > new Date()) {
      throw new HttpException(
        TOO_MANY_ATTEMPTS_MESSAGE,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  /**
   * Registra uma tentativa para a chave e lança 429 se isso estourar o limite
   * configurado. Deve ser chamado a cada tentativa que deve "contar" contra o
   * limite (ex.: cada login com senha errada, cada chamada de registro).
   */
  async registerAttempt(key: string, options: RateLimitOptions): Promise<void> {
    const now = new Date();
    const record = await this.prisma.authAttempt.findUnique({
      where: { key },
    });

    const windowExpired =
      !record ||
      now.getTime() - record.firstAttemptAt.getTime() > options.windowMs;

    if (windowExpired) {
      await this.prisma.authAttempt.upsert({
        where: { key },
        create: { key, count: 1, firstAttemptAt: now },
        update: { count: 1, firstAttemptAt: now, blockedUntil: null },
      });
      return;
    }

    const nextCount = record.count + 1;
    const blockedUntil =
      nextCount >= options.maxAttempts
        ? new Date(now.getTime() + options.blockMs)
        : record.blockedUntil;

    await this.prisma.authAttempt.update({
      where: { key },
      data: { count: nextCount, blockedUntil },
    });

    if (blockedUntil && blockedUntil > now) {
      throw new HttpException(
        TOO_MANY_ATTEMPTS_MESSAGE,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  /** Limpa o contador de uma chave — chamar após uma tentativa bem-sucedida. */
  async reset(key: string): Promise<void> {
    await this.prisma.authAttempt.deleteMany({ where: { key } });
  }
}
