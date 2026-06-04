"use client";
import { getJudge0languageId } from "@/lib/judge0";
import { useEffect, useState } from "react";
import { toast } from "sonner";


export function useEditor(problem: any, initialLanguage = "JAVASCRIPT") {
  const [selectedLanguage, setSelectedLanguage] = useState(initialLanguage);
  const [code, setCode] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [executionResponse, setExecutionResponse] = useState(null);

  useEffect(() => {
    if (problem?.codeSnippets?.[selectedLanguage]) {
      setCode(problem?.codeSnippets?.[selectedLanguage]);
    }
  }, [selectedLanguage, problem]);

  const handleRun = () => {
    toast.success("This is your assignment");
  };

  const handleSubmit = async () => {};

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