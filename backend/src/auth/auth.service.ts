import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

import {
  ConflictError,
  ForbiddenError,
} from '../common/exceptions/domain.exceptions';
import { PrismaService } from '../prisma/prisma.service';

const BCRYPT_ROUNDS = 12;

type TokenType = 'access' | 'refresh';

interface JwtPayload {
  sub: string;
  type: TokenType;
}

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  token_type: 'bearer';
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(
    email: string,
    name: string,
    password: string,
  ): Promise<Omit<User, 'passwordHash'>> {
    const normalized = email.toLowerCase();
    const existing = await this.prisma.user.findUnique({
      where: { email: normalized },
    });
    if (existing) {
      throw new ConflictError('Email already registered');
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const user = await this.prisma.user.create({
      data: { email: normalized, name, passwordHash },
    });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash: _, ...safe } = user;
    return safe;
  }

  async login(email: string, password: string): Promise<TokenPair> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new ForbiddenError('Invalid email or password');
    }
    if (!user.isActive) {
      throw new ForbiddenError('Account is disabled');
    }

    return {
      access_token: this.signToken(user.id, 'access'),
      refresh_token: this.signToken(user.id, 'refresh'),
      token_type: 'bearer',
    };
  }

  async refresh(refreshToken: string): Promise<TokenPair> {
    let payload: JwtPayload;
    try {
      payload = this.jwt.verify<JwtPayload>(refreshToken, {
        secret: this.config.get<string>('jwt.secret'),
      });
    } catch {
      throw new ForbiddenError('Invalid or expired refresh token');
    }

    if (payload.type !== 'refresh') {
      throw new ForbiddenError('Wrong token type');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });
    if (!user || !user.isActive) {
      throw new ForbiddenError('User not found or inactive');
    }

    return {
      access_token: this.signToken(user.id, 'access'),
      refresh_token: refreshToken,
      token_type: 'bearer',
    };
  }

  private signToken(userId: string, type: TokenType): string {
    const expiresIn =
      type === 'access'
        ? this.config.get<string>('jwt.expiresIn')
        : this.config.get<string>('jwt.refreshExpiresIn');

    return this.jwt.sign({ sub: userId, type } satisfies JwtPayload, {
      expiresIn,
    });
  }
}
