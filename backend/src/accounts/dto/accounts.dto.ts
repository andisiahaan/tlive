import { IsBoolean, IsNotEmpty, IsOptional, IsString, IsUrl } from 'class-validator';

export class AddAccountDto {
  @IsString({ message: 'Username must be a string' })
  @IsNotEmpty({ message: 'Username is required' })
  username!: string;
}

export class SetWebhookDto {
  @IsUrl({ require_tld: false }, { message: 'Invalid URL format' })
  @IsNotEmpty({ message: 'Endpoint URL is required' })
  endpointUrl!: string;

  @IsString({ message: 'Secret key must be a string' })
  @IsNotEmpty({ message: 'Secret key is required' })
  secretKey!: string;

  @IsBoolean({ message: 'isEnabled must be a boolean' })
  isEnabled!: boolean;
}
