import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AuthResponse, AuthUser, UserRole } from '@rideflow/shared-types';
import { PrismaService } from '../common/prisma.service';
import { DemoLoginDto } from './dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  private demoEnabled(): boolean {
    // Force-disabled in production regardless of flag.
    if (this.config.get('NODE_ENV') === 'production') return false;
    return this.config.get('DEMO_LOGIN_ENABLED') === 'true';
  }

  private normalizePhone(phone: string): string {
    return phone.replace(/^\+91/, '');
  }

  /**
   * DEVELOPMENT-ONLY demo login. This is NOT real phone verification.
   * It looks up (or, for customers, creates) a demo account by phone + role
   * and issues a JWT. Guarded by DEMO_LOGIN_ENABLED and never active in production.
   */
  async demoLogin(dto: DemoLoginDto): Promise<AuthResponse> {
    if (!this.demoEnabled()) {
      throw new ForbiddenException(
        'Demo login is disabled. Set DEMO_LOGIN_ENABLED=true in a non-production environment.',
      );
    }
    const phone = this.normalizePhone(dto.phone);

    let user = await this.prisma.user.findUnique({
      where: { phone },
      include: { driver: true },
    });

    if (!user) {
      // Only auto-create demo CUSTOMER accounts. Drivers/admins must be seeded.
      if (dto.role !== 'CUSTOMER') {
        throw new NotFoundException(
          `No seeded ${dto.role.toLowerCase()} with that phone. Use a seeded demo account.`,
        );
      }
      user = await this.prisma.user.create({
        data: {
          phone,
          name: dto.name?.trim() || `Demo Rider ${phone.slice(-4)}`,
          role: 'CUSTOMER',
          isDemo: true,
        },
        include: { driver: true },
      });
    }

    if (user.role !== dto.role) {
      throw new ForbiddenException(
        `This phone is registered as ${user.role}, not ${dto.role}.`,
      );
    }
    if (user.status === 'SUSPENDED') {
      throw new ForbiddenException('This account is suspended.');
    }

    return this.issue(user.id, user.role, user.driver?.id ?? null, this.toAuthUser(user));
  }

  async me(userId: string): Promise<AuthUser> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('User no longer exists');
    return this.toAuthUser(user);
  }

  private async issue(
    userId: string,
    role: UserRole,
    driverId: string | null,
    user: AuthUser,
  ): Promise<AuthResponse> {
    const accessToken = await this.jwt.signAsync({ userId, role, driverId });
    return { accessToken, user };
  }

  private toAuthUser(u: {
    id: string;
    name: string;
    phone: string;
    email: string | null;
    role: UserRole;
    status: 'ACTIVE' | 'SUSPENDED';
  }): AuthUser {
    return {
      id: u.id,
      name: u.name,
      phone: u.phone,
      email: u.email,
      role: u.role,
      status: u.status,
    };
  }
}
