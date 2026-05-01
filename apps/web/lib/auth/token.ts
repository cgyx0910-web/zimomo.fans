import { jwtVerify, SignJWT } from "jose";

const HS256_ALG = "HS256";

export function encodedJwtSecret(secret: string) {
  return new TextEncoder().encode(secret);
}

export async function signAdminJwt(params: {
  secret: string;
  expiresIn: string | number | Date;
}): Promise<string> {
  const key = encodedJwtSecret(params.secret);

  const token = await new SignJWT({ role: "admin" })
    .setProtectedHeader({ alg: HS256_ALG })
    .setIssuedAt()
    .setExpirationTime(params.expiresIn)
    .sign(key);

  return token;
}

export async function verifyAdminJwt(params: {
  token: string;
  secret: string;
}): Promise<void> {
  const key = encodedJwtSecret(params.secret);
  await jwtVerify(params.token, key, { algorithms: [HS256_ALG] });
}
