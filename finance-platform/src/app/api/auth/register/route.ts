import { hash } from "bcryptjs";
import { NextResponse } from "next/server";
import { ensureDefaultAccounts } from "@/lib/default-accounts";
import { ensureDefaultCategories } from "@/lib/default-categories";
import { prisma } from "@/lib/prisma";
import { isValidEmail, isValidPassword } from "@/lib/auth-validation";

const BCRYPT_MAX_BYTES = 72;

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  const { email: rawEmail, password } = body as Record<string, unknown>;
  const email = typeof rawEmail === "string" ? rawEmail.trim().toLowerCase() : "";

  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }
  if (typeof password !== "string" || !isValidPassword(password)) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters and include uppercase, lowercase, a number, and a special character (!@#$%^&*)." },
      { status: 400 },
    );
  }
  if (Buffer.byteLength(password, "utf8") > BCRYPT_MAX_BYTES) {
    return NextResponse.json({ error: "Password must be 72 bytes or fewer." }, { status: 400 });
  }

  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (existingUser) {
    return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
  }

  try {
    const passwordHash = await hash(password, 12);
    const user = await prisma.$transaction(async (transaction) => {
      const createdUser = await transaction.user.create({
        data: { email, password: passwordHash },
        select: { id: true, email: true },
      });
      await ensureDefaultCategories(transaction, createdUser.id);
      await ensureDefaultAccounts(transaction, createdUser.id);
      return createdUser;
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
    }
    console.error("User registration failed.", error);
    return NextResponse.json({ error: "Unable to create your account right now." }, { status: 500 });
  }
}