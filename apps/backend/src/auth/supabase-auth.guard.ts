import { CanActivate, ExecutionContext, Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { SupabaseAuthService } from "./supabase-auth.service.js";
import type { AuthenticatedUser } from "./auth.types.js";

type RequestWithAuth = {
  headers: Record<string, string | string[] | undefined>;
  user?: AuthenticatedUser;
};

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  constructor(@Inject(SupabaseAuthService) private readonly auth: SupabaseAuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithAuth>();
    const token = getBearerToken(request.headers.authorization);

    if (!token) {
      throw new UnauthorizedException("Missing bearer token.");
    }

    request.user = await this.auth.getUser(token);
    return true;
  }
}

function getBearerToken(header: string | string[] | undefined) {
  const value = Array.isArray(header) ? header[0] : header;
  const [scheme, token] = value?.split(" ") ?? [];

  return scheme?.toLowerCase() === "bearer" && token ? token : null;
}
