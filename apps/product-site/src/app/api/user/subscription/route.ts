import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSubscriptionByUserId } from "@/lib/queries/users";
import { headers } from "next/headers";

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({
    headers: headers(),
  });

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const subscription = await getSubscriptionByUserId(session.user.id);
  
  if (!subscription) {
    return NextResponse.json({ error: "No subscription found" }, { status: 404 });
  }

  return NextResponse.json({ subscription });
}
