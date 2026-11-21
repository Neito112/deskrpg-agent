import type { NextRequest } from "next/server";
import { handleSkillRoute } from "@/lib/skill-routes";

type RouteProps = {
  params: Promise<{
    id: string;
    npcId: string;
    path?: string[];
  }>;
};

export async function GET(req: NextRequest, { params }: RouteProps) {
  const p = await params;
  return handleSkillRoute(req, p);
}

export async function POST(req: NextRequest, { params }: RouteProps) {
  const p = await params;
  return handleSkillRoute(req, p);
}

export async function PUT(req: NextRequest, { params }: RouteProps) {
  const p = await params;
  return handleSkillRoute(req, p);
}

export async function DELETE(req: NextRequest, { params }: RouteProps) {
  const p = await params;
  return handleSkillRoute(req, p);
}
