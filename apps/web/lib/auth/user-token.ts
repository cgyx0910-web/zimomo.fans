import { jwtVerify, SignJWT } from "jose";

import { encodedJwtSecret } from "@/lib/auth/token";

const HS256_ALG = "HS256";

export async function signUserJwt(params: {
  secret: string;
  userId: string;
  email: string;
  expiresIn: string | number | Date;
}): Promise<string> {
  const key = encodedJwtSecret(params.secret);

  return new SignJWT({ email: params.email })
    .setProtectedHeader({ alg: HS256_ALG })
    .setSubject(params.userId)
    .setIssuedAt()
    .setExpirationTime(params.expiresIn)
    .sign(key);
}

export async function verifyUserJwt(params: {
  token: string;
  secret: string;
}): Promise<{ userId: string; email: string }> {
  const key = encodedJwtSecret(params.secret);
  const { payload } = await jwtVerify(params.token, key, {
    algorithms: [HS256_ALG],
  });

  const userId = typeof payload.sub === "string" ? payload.sub : "";
  const email =
    typeof payload.email === "string" ? payload.email : "";

  if (!userId || !email) {
    throw new Error("Invalid user token payload");
  }

  return { userId, email };
}
