import { JwtService } from '@nestjs/jwt';
import { Model } from 'mongoose';
import { JwtPayload } from '../../common/decorators/current-user.decorator';
import { UserDocument } from './schemas/user.schema';
export interface TokenResult {
    accessToken: string;
}
export declare class AuthService {
    private readonly jwtService;
    private readonly userModel;
    constructor(jwtService: JwtService, userModel: Model<UserDocument>);
    signToken(payload: {
        sub: string;
        email?: string;
    }): Promise<TokenResult>;
    register(email: string, password: string): Promise<TokenResult>;
    loginWithEmailPassword(email: string, password: string): Promise<TokenResult>;
    validatePayload(payload: JwtPayload): Promise<JwtPayload>;
}
