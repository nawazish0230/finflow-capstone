import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';

export interface TokenResult {
  accessToken: string;
}

const SALT_ROUNDS = 10;

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    @InjectRepository(User) private readonly userRepository: Repository<User>,
  ) {}

  async signToken(payload: {
    sub: string;
    email?: string;
  }): Promise<TokenResult> {
    const accessToken = this.jwtService.sign(payload);
    return { accessToken };
  }

  /** Save new user (email + hashed password) to DB and return JWT. */
  async register(email: string, password: string): Promise<TokenResult> {
    const normalizedEmail = email.toLowerCase().trim();
    const existing = await this.userRepository.findOne({
      where: { email: normalizedEmail },
    });
    if (existing) {
      throw new ConflictException('User with this email already exists');
    }
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await this.userRepository.save({
      email: normalizedEmail,
      password: hashedPassword,
    });
    return this.signToken({
      sub: user.id,
      email: user.email,
    });
  }

  /** Load user from DB by email, verify password, return JWT. */
  async loginWithEmailPassword(
    email: string,
    password: string,
  ): Promise<TokenResult> {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await this.userRepository.findOne({
      where: { email: normalizedEmail },
      select: ['id', 'email', 'password'], // Explicitly select password
    });
    if (!user || !user.password) {
      throw new UnauthorizedException('Invalid email or password');
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid email or password');
    }
    return this.signToken({ sub: user.id, email: user.email });
  }
}
