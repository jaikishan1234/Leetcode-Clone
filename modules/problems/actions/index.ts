"use server";

import { prisma } from "@/lib/db";
import { getLanguageName, pollBatchResults, submitBatch } from "@/lib/judge0";
import { getCurrentUserData } from "@/modules/auth/actions";

// ─── Fetch all problems ───────────────────────────────────────────────────────

export const getAllProblems = async () => {
  try {
    const user = await getCurrentUserData();

    const problems = await prisma.problem.findMany({
      include: { solvedBy: true },
      orderBy: { createdAt: "desc" },
    });

    return { success: true, data: problems };
  } catch (error) {
    console.error("❌ Error fetching problems:", error);
    return { success: false, error: "Failed to fetch problems" };
  }
};

// ─── Fetch single problem ─────────────────────────────────────────────────────

export const getProblemById = async (id: string) => {
  try {
    const problem = await prisma.problem.findUnique({ where: { id } });
    return { success: true, data: problem };
  } catch (error) {
    console.error("❌ Error fetching problem:", error);
    return { success: false, error: "Failed to fetch problem" };
  }
};

// ─── Shared: run code against test cases (no DB save) ────────────────────────

async function runCodeAgainstTestCases(
  source_code: string,
  language_id: number,
  stdin: string[],
  expected_outputs: string[],
) {
  if (
    !Array.isArray(stdin) ||
    stdin.length === 0 ||
    !Array.isArray(expected_outputs) ||
    expected_outputs.length !== stdin.length
  ) {
    throw new Error("Invalid test cases");
  }

  const submissions = stdin.map((input) => ({
    source_code,
    language_id,
    stdin: input,
    base64_encoded: false,
    wait: false,
  }));

  const submitResponse = await submitBatch(submissions);
  const tokens = submitResponse.map((res: any) => res.token);
  const results = await pollBatchResults(tokens);

  let allPassed = true;

  const detailedResults = results.map((result: any, i: number) => {
    const stdout = result.stdout?.trim() ?? null;
    const expected = expected_outputs[i]?.trim();
    const passed = stdout === expected;

    if (!passed) allPassed = false;

    return {
      testCase: i + 1,
      passed,
      stdout,
      expected,
      stderr: result.stderr ?? null,
      compile_output: result.compile_output ?? null,
      status: result.status.description,
      memory: result.memory ? `${result.memory} KB` : undefined,
      time: result.time ? `${result.time} s` : undefined,
    };
  });

  return { allPassed, detailedResults };
}

// ─── Run (sample test cases only — no DB save) ───────────────────────────────

export const runCode = async (
  source_code: string,
  language_id: number,
  stdin: string[],
  expected_outputs: string[],
) => {
  try {
    const { allPassed, detailedResults } = await runCodeAgainstTestCases(
      source_code,
      language_id,
      stdin,
      expected_outputs,
    );

    return { success: true, allPassed, detailedResults };
  } catch (error) {
    console.error("❌ Error running code:", error);
    return { success: false, error: "Failed to run code" };
  }
};

// ─── Submit (all test cases — saves to DB) ───────────────────────────────────

export const executeCode = async (
  source_code: string,
  language_id: number,
  stdin: string[],
  expected_outputs: string[],
  problemId: string,
) => {
  try {
    const user = await getCurrentUserData();

    if (!user) {
      return {
        success: false,
        error: "User not found",
      };
    }

    const { allPassed, detailedResults } = await runCodeAgainstTestCases(
      source_code,
      language_id,
      stdin,
      expected_outputs,
    );

    // Save submission to DB
    const submission = await prisma.submission.create({
      data: {
        userId: user.id,
        problemId,
        sourceCode: source_code,
        language: getLanguageName(language_id),
        stdin: stdin.join("\n"),
        stdout: JSON.stringify(detailedResults.map((r: any) => r.stdout)),
        stderr: detailedResults.some((r: any) => r.stderr)
          ? JSON.stringify(detailedResults.map((r: any) => r.stderr))
          : null,

        compileOutput: detailedResults.some((r: any) => r.compile_output)
          ? JSON.stringify(detailedResults.map((r: any) => r.compile_output))
          : null,

        status: allPassed ? "Accepted" : "Wrong Answer",

        memory: detailedResults.some((r: any) => r.memory)
          ? JSON.stringify(detailedResults.map((r: any) => r.memory))
          : null,

        time: detailedResults.some((r: any) => r.time)
          ? JSON.stringify(detailedResults.map((r: any) => r.time))
          : null,
      },
    });

    // Mark problem as solved if all passed
    if (allPassed) {
      await prisma.problemSolved.upsert({
        where: { userId_problemId: { userId: user.id, problemId } },
        update: {},
        create: { userId: user.id, problemId },
      });
    }

    // Save individual test case results
    await prisma.testCaseResult.createMany({
      data: detailedResults.map((result: any) => ({
        submissionId: submission.id,
        testCase: result.testCase,
        passed: result.passed,
        stdout: result.stdout,
        expected: result.expected,
        stderr: result.stderr,
        compileOutput: result.compile_output,
        status: result.status,
        memory: result.memory,
        time: result.time,
      })),
    });

    const submissionWithTestCases = await prisma.submission.findUnique({
      where: { id: submission.id },
      include: { testCases: true },
    });

    return { success: allPassed, submission: submissionWithTestCases };
  } catch (error) {
    console.error("❌ Error submitting code:", error);
    return { success: false, error: "Failed to submit code" };
  }
};

// ─── Get submissions for current user + problem ───────────────────────────────

export const getAllSubmissionByCurrentUserForProblem = async (
  problemId: string,
) => {
  const user = await getCurrentUserData();

  if (!user) {
    return {
      success: false,
      data: [],
      error: "User not found",
    };
  }

  const submissions = await prisma.submission.findMany({
    where: {
      problemId,
      userId: user.id,
    },
  });

  return {
    success: true,
    data: submissions,
  };
};
