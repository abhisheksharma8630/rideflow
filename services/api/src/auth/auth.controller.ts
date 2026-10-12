import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { DemoLoginDto } from './dto';
import { CurrentUser, JwtUser, Public } from '../common/decorators';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('demo-login')
  @HttpCode(200)
  @ApiOperation({ summary: 'DEV-ONLY demo login (not real phone verification)' })
  demoLogin(@Body() dto: DemoLoginDto) {
    return this.auth.demoLogin(dto);
  }

  @Post('logout')
  @HttpCode(200)
  @ApiOperation({ summary: 'Stateless logout (client discards token)' })
  logout() {
    return { ok: true };
  }

  @Get('me')
  @ApiOperation({ summary: 'Current authenticated user' })
  me(@CurrentUser() user: JwtUser) {
    return this.auth.me(user.userId);
  }
}
