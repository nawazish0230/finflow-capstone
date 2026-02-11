import { BadRequestException, Body, Controller, Post } from '@nestjs/common';
import { AuthService, TokenResult } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Controller({
  path: 'auth',
  version: '1',
})
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("register")
  async register(@Body() dto: RegisterDto): Promise<TokenResult> {
    return this.authService.register(dto.email, dto.password);
  }

  @Post("login")
  async login(@Body() dto: LoginDto): Promise<TokenResult> {
    if (dto.email && dto.password) {
      return this.authService.loginWithEmailPassword(dto.email, dto.password);
    }
    throw new BadRequestException(
      "Provide either email and password or userId"
    );
  }
}
