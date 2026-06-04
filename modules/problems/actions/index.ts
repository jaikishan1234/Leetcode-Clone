"use server";
import { prisma } from "@/lib/db";
import { getCurrentUserData } from "@/modules/auth/actions";

export const getAllProblems = async () => {
  try {
    const problems = await prisma.problem.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });

    return {
      success: true,
      data: problems,
    };
  } catch (error) {
    console.error("❌ Error fetching problems:", error);
    return { success: false, error: "Failed to fetch problems" };
  }
};

export const getProblemById = async (id: string) => {
  try {
    const problem = await prisma.problem.findUnique({
      where: {
        id: id,
      },
    });

    return {
      success: true,
      data: problem,
    };
  } catch (error) {
    console.error("❌ Error fetching problem:", error);
    return { success: false, error: "Failed to fetch problem" };
  }
};
