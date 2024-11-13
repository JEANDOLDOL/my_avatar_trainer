import { Controller, Get, Post, Req, Res, Body, UseGuards, InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SocauthService } from './socauth.service';
import axios from 'axios';
import { JwtService } from '@nestjs/jwt';

import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from '../auth/schemas/user.schema'; // Update this path to where your User schema is defined

import { access } from 'fs';

@Controller('socauth')
export class SocauthController {
  constructor(
    @InjectModel(User.name) private userModel:Model<User>,
    private readonly socauthService: SocauthService,
    private readonly jwtService: JwtService // Inject JwtService to decode token,
  ) {}

  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleLogin() {
    // Initiates Google OAuth login
  }


  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleLoginCallback(@Req() req, @Res() res) {    

    // Check if user exists; if not, route to signup
    const userExists = await this.socauthService.userExists(req.user.id);
    if (!userExists) {
      // 소셜 미디어를 통해서 회원가입에 필요한 providerId, email, accessToken을 담은 JWT 토큰을 발행한다.
      const result = await this.socauthService.handleLogin(req.user);

      // 쿠키에 `token` 저장 (유효기간 1시간, Secure, SameSite 설정 추가)
      res.cookie('token', result.token, {
        maxAge: 3600 * 1000, // 1시간 (밀리초 단위)
        secure: false, // HTTPS에서만 작동
        sameSite: 'Lax', // SameSite 설정
        path: '/',
      });

      // 소셜 미디어로 로그인 후 최초로 회원 가입 시, 이용자의 정보를 가져오기 위해 req에 담긴 accessToken을 쿠키에 저장한다.
      // const accessToken = req.user?.accessToken;

      // 소셜 로그인 정보로 로그인한 적이 없다면, 해당 정보로 회원 가입한다.
        try{
          // Request에 담긴 정보를 이용해서 socUserDto를 형성한다.
          const user = req.user;

          // 소셜 미디어 종류를 google로 지정한다.
          const socUserCredentialDto = {
            providerId: user.id, 
            email: user.email, 
            provider: 'google',
          }
  
          // 소셜 로그인 데이터를 이용해서 회원 가입한다.
          await this.socauthService.signUp(socUserCredentialDto);
          
          return res.redirect('https://techn0.shop/socauth/additional-data');

        }catch(error){
          console.error('Token verification failed:', error);
          return res.status(401).send('Unauthorized');
        }

    }

    // User, provider 정보만을 담은 JWT Token을 이용해서 로그인한다.
    const userRecord = await this.userModel.findOne({providerId:req.user.id});
    const username = userRecord.username;
    const result = await this.socauthService.newHandleLogin(username, req.user);

    // req.session.userId = username;
    // console.log('userRecord', userRecord);
    // console.log('sessiondata', req.session.userId);

    res.cookie('token', result.token, {
      maxAge: 3600 * 1000, // 1시간 (밀리초 단위)
      secure: false, // HTTPS에서만 작동
      sameSite: 'Lax', // SameSite 설정
      path: '/',
    });
    
    // Redirect to localhost:3000 after successful login
    return res.redirect('https://techn0.shop');
  }

  @Post('additional-data')
  // Username을 additional-data 페이지에서 변수로 받고, providerId와 provider를 동시에 일치하는 조건의 사용자 username을 업데이트 한다.
  async Addadditionaldata(@Body() body: {username:string}, @Req() req, @Res() res){
    //providerId, provider에 해당하는 정보를 받아야 한다.
    // providerId, provider 변수를 어떻게 받을 것인가?
    try{
      const {username} = body;

      // console.log('REQ', req);

      const token = req.cookies.token;
      if(!token){
        throw new UnauthorizedException('AccessToken is missing');
      }

      const decodedUserInfo = this.jwtService.decode(token);
      // console.log('token',token);
      console.log(decodedUserInfo);

      // const userInfo = req.cookies.token;

      const{id : providerId, email, provider:provider} = decodedUserInfo;
      console.log('#1',providerId, email);
      // const domainPart = email.split('@')[1];
      // const provider = domainPart.split('.')[0];
      console.log('#2', provider)
      const result = await this.socauthService.updateUsername(providerId, provider, username);

      console.log('Username successfully changed');

      // Cookie에 담긴 Token 정보를 없애고, username을 id로 담는 Token을 형성한다. 
      const newToken = await this.socauthService.newHandleLogin(username, provider);

      res.clearCookie('token');
      res.cookie('token', newToken.token,{
        maxAge: 3600 * 1000, // 1 hour in milliseconds
        secure: false, // HTTPS only if true
        sameSite: 'Lax',
        path: '/',
      });
      
      // return res.redirect('https://techn0.shop/')
      return res.status(200).json({message:"Username updated successfully!", redirect:true});

    }catch(error){
      console.error(error);
      throw new InternalServerErrorException('Failed to update username information');
    }
  }



  @Get('kakao')
  @UseGuards(AuthGuard('kakao'))
  async kakaoLogin() {
    // Initiates Kakao OAuth login
  }

  @Get('kakao/callback')
  @UseGuards(AuthGuard('kakao'))
  async kakaoLoginCallback(@Req() req, @Res() res) {

    // Check if user exists; if not, route to signup
    const userExists = await this.socauthService.userExists(req.user.id);
    if (!userExists) {
      // 소셜 미디어를 통해서 회원가입에 필요한 providerId, email, accessToken을 담은 JWT 토큰을 발행한다.
      const result = await this.socauthService.handleLogin(req.user);

      // 쿠키에 `token` 저장 (유효기간 1시간, Secure, SameSite 설정 추가)
      res.cookie('token', result.token, {
        maxAge: 3600 * 1000, // 1시간 (밀리초 단위)
        secure: false, // HTTPS에서만 작동
        sameSite: 'Lax', // SameSite 설정
        path: '/',
      });

      // 소셜 미디어로 로그인 후 최초로 회원 가입 시, 이용자의 정보를 가져오기 위해 req에 담긴 accessToken을 쿠키에 저장한다.
      const accessToken = req.user?.accessToken;
  
      try{
        const response = await axios.get('https://kapi.kakao.com/v2/user/me', {
          headers: {
            Authorization: `Bearer ${accessToken}`, // Send the accessToken as Bearer token
          },
        });

        const user = response.data;
  
        // 소셜 미디어 종류를 google로 지정한다.
        const socUserCredentialDto = {
          providerId: user.id, 
          email: user.email, 
          provider: 'kakao',
        }

        // 소셜 로그인 데이터를 이용해서 회원 가입한다.
        await this.socauthService.signUp(socUserCredentialDto);

        
        return res.redirect('https://techn0.shop/socauth/additional-data');

      }catch(error){
        console.error('Token verification failed:', error);
        return res.status(401).send('Unauthorized');
      }

    }

    // User, provider 정보만을 담은 JWT Token을 이용해서 로그인한다.
    const userRecord = await this.userModel.findOne({providerId:req.user.id});
    const username = userRecord.username;
    const result = await this.socauthService.newHandleLogin(username, req.user);

    res.cookie('token', result.token, {
      maxAge: 3600 * 1000, // 1시간 (밀리초 단위)
      secure: false, // HTTPS에서만 작동
      sameSite: 'Lax', // SameSite 설정
      path: '/',
    });

    // Redirect to localhost:3000 after successful login
    return res.redirect('https://techn0.shop') 

  }

  @Get('naver')
  @UseGuards(AuthGuard('naver'))
  async naverLogin() {
    // Initiates Naver OAuth login
  }

  @Get('naver/callback')
  @UseGuards(AuthGuard('naver'))
  async naverLoginCallback(@Req() req, @Res() res) {
    // Check if user exists; if not, route to signup
    const userExists = await this.socauthService.userExists(req.user.id);
    if (!userExists) {
      // 소셜 미디어를 통해서 회원가입에 필요한 providerId, email, accessToken을 담은 JWT 토큰을 발행한다.
      const result = await this.socauthService.handleLogin(req.user);

      // 쿠키에 `token` 저장 (유효기간 1시간, Secure, SameSite 설정 추가)
      res.cookie('token', result.token, {
        maxAge: 3600 * 1000, // 1시간 (밀리초 단위)
        secure: false, // HTTPS에서만 작동
        sameSite: 'Lax', // SameSite 설정
        path: '/',
      });

      // 소셜 미디어로 로그인 후 최초로 회원 가입 시, 이용자의 정보를 가져오기 위해 req에 담긴 accessToken을 쿠키에 저장한다.
      const accessToken = req.user?.accessToken;
      try{
      const response = await axios.get('https://openapi.naver.com/v1/nid/me', {
        headers: {
          Authorization: `Bearer ${accessToken}`, // Use the main token directly
        },
      });

      const user = response.data.response;
      console.log('******', user);

      // 소셜 미디어 종류를 google로 지정한다.
      const socUserCredentialDto = {
        providerId: user.id, 
        email: user.email, 
        provider: 'naver',
      }
      
      console.log('//////', socUserCredentialDto);

      // 소셜 로그인 데이터를 이용해서 회원 가입한다.
      const returnmessage = await this.socauthService.signUp(socUserCredentialDto);
      console.log(returnmessage);

      return res.redirect('https://techn0.shop/socauth/additional-data');

    }catch(error){
      console.error('Token verification failed:', error);
      return res.status(401).send('Unauthorized');
    }

  }

    // User, provider 정보만을 담은 JWT Token을 이용해서 로그인한다.
    const userRecord = await this.userModel.findOne({providerId:req.user.id});
    const username = userRecord.username;
    const result = await this.socauthService.newHandleLogin(username, req.user);
    console.log(req.user);

    res.cookie('token', result.token, {
      maxAge: 3600 * 1000, // 1시간 (밀리초 단위)
      secure: false, // HTTPS에서만 작동
      sameSite: 'Lax', // SameSite 설정
      path: '/',
    });

    
    
    return res.redirect('https://techn0.shop');
  }
  
}


