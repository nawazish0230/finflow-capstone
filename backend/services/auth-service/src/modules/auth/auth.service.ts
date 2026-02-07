import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User, UserDocument } from './schemas/user.schema';

export interface TokenResult {
  accessToken: string;
}

const SALT_ROUNDS = 10;

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
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
    const existing = await this.userModel
      .findOne({ email: normalizedEmail })
      .exec();
    if (existing) {
      throw new ConflictException('User with this email already exists');
    }
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await this.userModel.create({
      email: normalizedEmail,
      password: hashedPassword,
    });
    return this.signToken({
      sub: user._id.toString(),
      email: user.email,
    });
  }

  /** Load user from DB by email, verify password, return JWT. */
  async loginWithEmailPassword(
    email: string,
    password: string,
  ): Promise<TokenResult> {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await this.userModel
      .findOne({ email: normalizedEmail })
      .select('+password')
      .exec();
    if (!user || !user.password) {
      throw new UnauthorizedException('Invalid email or password');
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid email or password');
    }
    return this.signToken({ sub: user._id.toString(), email: user.email });
  }
}
