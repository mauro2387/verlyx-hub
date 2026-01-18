import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '@/common/supabase/supabase.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private supabaseService: SupabaseService,
  ) {}

  async register(registerDto: RegisterDto) {
    const { email, password, fullName } = registerDto;
    
    // Create user in Supabase Auth
    const { data, error } = await this.supabaseService
      .getClient()
      .auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });
    
    if (error) {
      throw new BadRequestException(error.message);
    }
    
    // Create profile
    await this.supabaseService.getClient()
      .from('profiles')
      .insert({
        id: data.user.id,
        full_name: fullName,
        role: 'user',
      });
    
    // Generate tokens
    const tokens = await this.generateTokens({
      sub: data.user.id,
      email: data.user.email,
      role: 'user',
    });
    
    return {
      user: {
        id: data.user.id,
        email: data.user.email,
        fullName: fullName,
        role: 'user',
      },
      ...tokens,
    };
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;
    
    // Authenticate with Supabase
    const { data, error } = await this.supabaseService
      .getClient()
      .auth.signInWithPassword({
        email,
        password,
      });
    
    if (error) {
      throw new UnauthorizedException('Invalid credentials');
    }
    
    // Get user profile
    const profile = await this.supabaseService.getUserProfile(data.user.id);
    
    // Generate tokens
    const tokens = await this.generateTokens({
      sub: data.user.id,
      email: data.user.email,
      role: profile.role,
    });
    
    return {
      user: {
        id: data.user.id,
        email: data.user.email,
        fullName: profile.full_name,
        role: profile.role,
        avatarUrl: profile.avatar_url,
      },
      ...tokens,
    };
  }

  async refreshTokens(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });
      
      const profile = await this.supabaseService.getUserProfile(payload.sub);
      
      const tokens = await this.generateTokens({
        sub: payload.sub,
        email: payload.email,
        role: profile.role,
      });
      
      return tokens;
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(userId: string) {
    // Revoke session in Supabase
    await this.supabaseService.getClient().auth.signOut();
    return { message: 'Logged out successfully' };
  }

  async validateUser(userId: string) {
    const profile = await this.supabaseService.getUserProfile(userId);
    return profile;
  }

  private async generateTokens(payload: any) {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: this.configService.get<string>('JWT_EXPIRES_IN'),
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN'),
      }),
    ]);
    
    return {
      accessToken,
      refreshToken,
    };
  }
}
