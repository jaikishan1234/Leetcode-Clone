"use client";

import { getJudge0languageId } from "@/lib/judge0";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { executeCode, runCode } from "../actions";

export function useEditor(problem: any, initialLanguage = "JAVASCRIPT") {
  const [selectedLanguage, setSelectedLanguage] = useState(initialLanguage);
  const [code, setCode] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [executionResponse, setExecutionResponse] = useState<any | null>(null);
  useEffect(() => {
    if (problem?.codeSnippets?.[selectedLanguage]) {
      setCode(problem.codeSnippets[selectedLanguage]);
    }
  }, [selectedLanguage, problem]);

  // Run — only sample test case, no DB save
  const handleRun = async () => {
    if (!problem) return;

    try {
      setIsRunning(true);
      const language_id = getJudge0languageId(selectedLanguage);
      const sampleTestCase = problem.testCases[0];

      const res = await runCode(
        code,
        language_id,
        [sampleTestCase.input],
        [sampleTestCase.output],
      );

      setExecutionResponse(res);

      if (res.success && res.allPassed) {
        toast.success("Sample test case passed!");
      } else {
        toast.error("Wrong answer on sample test case");
      }
    } catch (error) {
      console.error("Error running code:", error);
      toast.error("Error running code");
    } finally {
      setIsRunning(false);
    }
  };

  // Submit — all test cases, saves to DB
  const handleSubmit = async () => {
    if (!problem) return;

    try {
      setIsSubmitting(true);
      const language_id = getJudge0languageId(selectedLanguage);
      const stdin = problem.testCases.map((tc: any) => tc.input);
      const expected_outputs = problem.testCases.map((tc: any) => tc.output);

      const res = await executeCode(code, language_id, stdin, expected_outputs, problem.id);
      setExecutionResponse(res);

      if (res.success) {
        toast.success("All test cases passed!");
      } else {
        toast.error("Some test cases failed");
      }
    } catch (error) {
      console.error("Error submitting code:", error);
      toast.error("Error submitting code");
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    selectedLanguage,
    setSelectedLanguage,
    code,
    setCode,
    isRunning,
    isSubmitting,
    executionResponse,
    handleRun,
    handleSubmit,
  };
}