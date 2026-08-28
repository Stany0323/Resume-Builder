import { Injectable, InternalServerErrorException, UnauthorizedException } from "@nestjs/common";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { AuthenticatedUser } from "./auth.types.js";

@Injectable()
export class SupabaseAuthService {
  private readonly client: SupabaseClient;

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
    }

    this.client = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  async getUser(accessToken: string): Promise<AuthenticatedUser> {
    const { data, error } = await this.client.auth.getUser(accessToken);

    if (error || !data.user) {
      throw new UnauthorizedException("Invalid or expired session.");
    }

    return {
      id: data.user.id,
      email: data.user.email ?? null,
    };
  }

  async createUser(input: { email: string; password: string; name?: string }) {
    const { data, error } = await this.client.auth.admin.createUser({
      email: input.email,
      password: input.password,
      email_confirm: true,
      user_metadata: input.name ? { name: input.name } : undefined,
    });

    if (error || !data.user) {
      throw new InternalServerErrorException(error?.message ?? "Could not create user.");
    }

    return {
      id: data.user.id,
      email: data.user.email ?? input.email,
    };
  }

  async deleteUser(userId: string) {
    const { error } = await this.client.auth.admin.deleteUser(userId);

    if (error) {
      throw new InternalServerErrorException(error.message);
    }
  }
}
