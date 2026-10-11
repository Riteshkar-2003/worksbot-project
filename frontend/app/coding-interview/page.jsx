


"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

import {
  startCodingInterview,
  runCode,
  submitCodingAnswer,
  stopCodingInterview,
} from "../../lib/api";

import {
  Code2,
  Sparkles,
  Play,
  Send,
  Square,
  RotateCcw,
  Terminal,
  CheckCircle2,
  XCircle,
  Clock3,
  ChevronRight,
  LayoutDashboard,
  Brain,
  FileCode2,
  AlertCircle,
  X,
  Lock,
  Eye,
  Check,
  Copy,
  ShieldCheck,
} from "lucide-react";

const SUPPORTED_LANGUAGES = [
  { id: "python", name: "Python 3", ext: "py", file: "solution.py", compiler: "Python 3.11 Runtime" },
  { id: "javascript", name: "JavaScript", ext: "js", file: "solution.js", compiler: "Node.js 20 Runtime" },
  { id: "c", name: "C Programming", ext: "c", file: "solution.c", compiler: "GCC 13 C Runtime" },
  { id: "cpp", name: "C++", ext: "cpp", file: "solution.cpp", compiler: "G++ 13 C++ Runtime" },
  { id: "java", name: "Java", ext: "java", file: "Main.java", compiler: "OpenJDK 21 Runtime" },
];

const checkSkillsEligibility = (rdata) => {
  if (!rdata) return { isEligible: false, langs: [] };
  const skillsList = [
    ...(Array.isArray(rdata.skills) ? rdata.skills : []),
    ...(Array.isArray(rdata.programming_languages) ? rdata.programming_languages : []),
    ...(Array.isArray(rdata.technologies) ? rdata.technologies : []),
  ].map((s) => String(s).toLowerCase().trim());
  const text = skillsList.join(" ");

  const detected = [];
  if (/\bpython\b/.test(text)) detected.push("Python");
  const noJs = text.replace(/\bjavascript\b|\bjs\b/g, "");
  if (/\bjava\b/.test(noJs)) detected.push("Java");
  if (/\bjavascript\b|\bjs\b|\becmascript\b|\bnode(?:\.js)?\b/.test(text)) detected.push("JavaScript");
  if (/\bc\+\+|\bcpp\b/.test(text)) detected.push("C++");
  if (
    /\bc\s*programming|\blanguage\s*c\b|\bc\s*language\b|\bansi\s*c\b/.test(text) ||
    skillsList.some((s) => s === "c")
  )
    detected.push("C");

  return {
    isEligible: detected.length > 0,
    langs: Array.from(new Set(detected)),
  };
};

const STARTER_CODES = {
  python: `import sys

def solve():
    # Read input from stdin
    # Example: lines = sys.stdin.read().split()
    pass

if __name__ == "__main__":
    solve()
`,
  javascript: `const fs = require('fs');

function solve() {
    // Read input from stdin
    const input = fs.readFileSync(0, 'utf-8').trim();
    if (!input) return;
    
    // Your code here
}

solve();
`,
  c: `#include <stdio.h>
#include <stdlib.h>
#include <string.h>

int main() {
    // Read input from stdin
    // Your code here
    return 0;
}
`,
  cpp: `#include <iostream>
#include <vector>
#include <string>
#include <algorithm>

using namespace std;

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);
    
    // Read input from stdin
    // Your code here
    return 0;
}
`,
  java: `import java.util.*;
import java.io.*;

public class Main {
    public static void main(String[] args) throws Exception {
        Scanner scanner = new Scanner(System.in);
        // Read input from stdin
        // Your code here
    }
}
`,
};

export default function CodingInterviewPage() {
  const router = useRouter();

  // STATE

  const [userId, setUserId] = useState(null);
  const [question, setQuestion] = useState(null);
  const [questionNumber, setQuestionNumber] = useState(1);
  const [language, setLanguage] = useState(() => {
    if (typeof window !== "undefined") {
      return sessionStorage.getItem("selectedLanguage") || "python";
    }
    return "python";
  });
  const [code, setCode] = useState(() => {
    if (typeof window !== "undefined") {
      const savedLang = sessionStorage.getItem("selectedLanguage") || "python";
      return STARTER_CODES[savedLang] || STARTER_CODES.python;
    }
    return STARTER_CODES.python;
  });
  const [difficulty, setDifficulty] = useState("Easy");

  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [stopping, setStopping] = useState(false);

  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [ineligibleError, setIneligibleError] = useState("");
  const [statusNotification, setStatusNotification] = useState("");

  // Test Runner & Modal State
  const [activeConsoleTab, setActiveConsoleTab] = useState("sample_cases");
  const [selectedSampleIdx, setSelectedSampleIdx] = useState(0);
  const [copiedInputIdx, setCopiedInputIdx] = useState(null);
  const [copiedCandidateCode, setCopiedCandidateCode] = useState(false);
  const [copiedCorrectCode, setCopiedCorrectCode] = useState(false);
  const [submissionModalData, setSubmissionModalData] = useState(null);

  const textareaRef = useRef(null);
  const lineNumbersRef = useRef(null);

  // EDITOR FUNCTIONS

 

  const handleLanguageChange = (newLang) => {
    setLanguage(newLang);
    const isDefaultTemplate =
      Object.values(STARTER_CODES).some(
        (tpl) => tpl.trim() === code.trim()
      ) || !code.trim();

    if (isDefaultTemplate) {
      setCode(STARTER_CODES[newLang] || STARTER_CODES.python);
      setResult(null);
    } else {
      if (
        window.confirm(
          `Switch to ${newLang}? Replace editor content with the ${newLang} starter template?`
        )
      ) {
        setCode(STARTER_CODES[newLang] || STARTER_CODES.python);
        setResult(null);
      }
    }
  };

  const handleResetCode = () => {
    if (
      window.confirm(
        `Reset code editor to ${language} starter template?`
      )
    ) {
      setCode(STARTER_CODES[language] || STARTER_CODES.python);
      setResult(null);
    }
  };

  // =====================================================
// CODE EDITOR SCROLLING
// =====================================================

const handleScroll = () => {
  const textarea = textareaRef.current;
  const lineNumbers = lineNumbersRef.current;

  if (!textarea || !lineNumbers) return;

  // Keep line numbers vertically synchronized
  lineNumbers.scrollTop = textarea.scrollTop;
};


// =====================================================
// CODE EDITOR KEYBOARD
// =====================================================

const handleKeyDown = (e) => {
  const textarea = e.target;

  // ---------------------------------------------------
  // TAB = 4 SPACES
  // ---------------------------------------------------
  if (e.key === "Tab") {
    e.preventDefault();

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const value = textarea.value;

    const indent = "    ";

    const newCode =
      value.substring(0, start) +
      indent +
      value.substring(end);

    setCode(newCode);

    requestAnimationFrame(() => {
      if (!textareaRef.current) return;

      textareaRef.current.focus();

      const cursorPosition = start + indent.length;

      textareaRef.current.selectionStart = cursorPosition;
      textareaRef.current.selectionEnd = cursorPosition;

      // Keep cursor visible
      textareaRef.current.scrollIntoView({
        block: "nearest",
      });
    });

    return;
  }

  // ---------------------------------------------------
  // ENTER
  // ---------------------------------------------------
  if (e.key === "Enter") {
    // Let textarea insert the newline normally.
    // After React updates the code, scroll to the
    // current cursor position.
    requestAnimationFrame(() => {
      if (!textareaRef.current) return;

      const textarea = textareaRef.current;

      const cursor = textarea.selectionStart;

      // Get the current line number
      const textBeforeCursor = textarea.value.substring(
        0,
        cursor
      );

      const currentLine =
        textBeforeCursor.split("\n").length - 1;

      const lineHeight = 24;

      const targetScrollTop =
        currentLine * lineHeight -
        textarea.clientHeight +
        lineHeight * 2;

      if (targetScrollTop > textarea.scrollTop) {
        textarea.scrollTop = targetScrollTop;
      }

      handleScroll();
    });
  }
};


  // START INTERVIEW


  useEffect(() => {
    const startInterview = async () => {
      try {
        setLoading(true);
        setError("");

        const storedResume = sessionStorage.getItem("resumeData");
        const storedUser = localStorage.getItem("user");
        const storedDifficulty =
          sessionStorage.getItem("difficulty") || "Easy";

        setDifficulty(storedDifficulty);

        if (!storedResume) {
          setError(
            "Resume not found. Please upload your resume from the dashboard first."
          );
          return;
        }

        let parsedResume = null;
        try {
          parsedResume = JSON.parse(storedResume);
        } catch (e) {
          console.error("Error parsing resume:", e);
        }

        const elig = checkSkillsEligibility(parsedResume);
        if (!elig.isEligible) {
          setIneligibleError(
            "You are not skilled in Python, Java, JavaScript, C++, or C programming. You cannot attend the coding interview."
          );
          setLoading(false);
          return;
        }

        let user = null;

        if (storedUser) {
          try {
            user = JSON.parse(storedUser);
          } catch (e) {
            console.error("Error parsing user:", e);
          }
        }

        if (!user || !user.id) {
          user = { id: 1, name: "Candidate" };
          localStorage.setItem("user", JSON.stringify(user));
        }

        const activeLang =
          sessionStorage.getItem("selectedLanguage") || language || "python";
        setLanguage(activeLang);

        setUserId(user.id);
        sessionStorage.setItem(
          "codingUserId",
          String(user.id)
        );

        console.log(
          "Starting interview for user ID:",
          user.id,
          "with difficulty:",
          storedDifficulty,
          "language:",
          activeLang
        );

        const data = await startCodingInterview(
          user.id,
          storedResume,
          activeLang,
          storedDifficulty
        );

        console.log("START CODING RESPONSE:", data);

        if (!data.question) {
          throw new Error(
            "Backend did not return a coding question."
          );
        }

        setQuestion(data.question);
        if (data.question.starter_code) {
          setCode(data.question.starter_code);
        }

        if (data.difficulty) {
          setDifficulty(data.difficulty);
        }

        if (data.question_number) {
          setQuestionNumber(data.question_number);
        }
      } catch (error) {
        console.error("Start interview error:", error);
        setError(
          error.message || "Failed to start coding interview"
        );
      } finally {
        setLoading(false);
      }
    };

    startInterview();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  // RUN CODE (VISIBLE SAMPLE TESTS)


  const handleRunCode = async () => {
    try {
      setRunning(true);
      setError("");
      setResult(null);

      const currentUserId =
        userId || sessionStorage.getItem("codingUserId");

      const data = await runCode(
        code,
        language,
        currentUserId,
        question
      );

      console.log("RUN RESULT:", data);

      setResult(data);
      setActiveConsoleTab("sample_cases");
      setSelectedSampleIdx(0);
    } catch (error) {
      console.error("Run code error:", error);

      setError(
        error.message || "Failed to run code"
      );
    } finally {
      setRunning(false);
    }
  };


  // SUBMIT ANSWER (SAMPLE + HIDDEN TEST CASES)

  const handleSubmit = async () => {
    if (!question) {
      setError("Question not available.");
      return;
    }

    const currentUserId =
      userId ||
      sessionStorage.getItem("codingUserId");

    if (!currentUserId) {
      setError(
        "User ID not found. Please restart the interview."
      );
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      setStatusNotification("");

      const storedResume =
        sessionStorage.getItem("resumeData");

      const data = await submitCodingAnswer(
        currentUserId,
        question,
        code,
        language,
        result,
        difficulty,
        storedResume
      );

      console.log("SUBMIT RESPONSE:", data);

      if (data.test_summary || data.status === "success") {
        setSubmissionModalData({
          ...data,
          candidate_code: code,
          candidate_language: language,
          correct_answer:
            data.correct_answer ||
            data.reference_solution ||
            question.reference_solution ||
            "",
          reference_solution:
            data.reference_solution ||
            data.correct_answer ||
            question.reference_solution ||
            "",
          solution_explanation:
            data.solution_explanation ||
            question.solution_explanation ||
            "",
          submittedQuestionNumber: questionNumber,
          submittedTitle: question.title,
        });
      }

      if (data.next_question) {
        const prevNumber = questionNumber;

        const newNumber =
          data.question_number ||
          prevNumber + 1;

        const newDiff =
          data.next_difficulty ||
          difficulty;

        setQuestion(data.next_question);
        setDifficulty(newDiff);
        setQuestionNumber(newNumber);

        const summaryText = data.test_summary
          ? `Question ${prevNumber} submitted! Passed ${data.test_summary.total_passed}/${data.test_summary.total_tests} test cases (${data.test_summary.pass_rate}%). Next: Question ${newNumber} (${newDiff}).`
          : `Question ${prevNumber} submitted! Difficulty adapted to ${newDiff}. Now on Question ${newNumber}.`;

        setStatusNotification(summaryText);

        if (data.next_question.starter_code) {
          setCode(data.next_question.starter_code);
        } else {
          setCode(STARTER_CODES[language] || STARTER_CODES.python);
        }
        setResult(null);

        window.scrollTo({
          top: 0,
          behavior: "smooth",
        });
      }
    } catch (error) {
      console.error("Submit error:", error);

      setError(
        error.message ||
        "Failed to submit answer"
      );
    } finally {
      setSubmitting(false);
    }
  };


  // STOP INTERVIEW

  const handleStopInterview = async () => {
    const currentUserId =
      userId ||
      sessionStorage.getItem("codingUserId");

    if (!currentUserId) {
      setError(
        "User ID not found. Please login again."
      );
      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to stop the interview and generate your complete evaluation report?"
    );

    if (!confirmed) {
      return;
    }

    try {
      setStopping(true);
      setError("");

      console.log(
        "Stopping interview for user:",
        currentUserId
      );

      const data =
        await stopCodingInterview(
          currentUserId
        );

      console.log(
        "FINAL CODING REPORT:",
        data
      );

      const finalReport = {
        ...(data.report || data),
      };

      if (!finalReport.difficulty) {
        finalReport.difficulty =
          difficulty ||
          sessionStorage.getItem(
            "difficulty"
          ) ||
          "Easy";
      }

      if (!finalReport.language) {
        finalReport.language =
          language || "Python";
      }

      sessionStorage.setItem(
        "codingReport",
        JSON.stringify(finalReport)
      );

      router.push("/report_coding");
    } catch (error) {
      console.error(
        "Stop interview error:",
        error
      );

      setError(
        error.message ||
        "Failed to generate final report"
      );
    } finally {
      setStopping(false);
    }
  };


  // LOADING SCREEN

  if (loading) {
    return (
      <div className="min-h-screen relative overflow-hidden bg-[#f8f7ff] flex items-center justify-center">
        <AnimatedBackground />

        <motion.div
          initial={{
            opacity: 0,
            scale: 0.9,
            y: 20,
          }}
          animate={{
            opacity: 1,
            scale: 1,
            y: 0,
          }}
          transition={{
            duration: 0.6,
          }}
          className="relative z-10 text-center"
        >
          <div className="relative mx-auto mb-6 w-20 h-20">

            <motion.div
              animate={{
                rotate: 360,
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "linear",
              }}
              className="absolute inset-0 rounded-full border-4 border-violet-200 border-t-violet-600"
            />

            <div className="absolute inset-2 rounded-full bg-white/80 backdrop-blur flex items-center justify-center shadow-lg">
              <Code2 className="w-7 h-7 text-violet-600" />
            </div>
          </div>

          <h2 className="text-2xl font-bold text-slate-900">
            Generating coding question...
          </h2>

          <p className="text-slate-500 mt-2">
            AI is preparing your customized coding challenge.
          </p>
        </motion.div>
      </div>
    );
  }


  // INELIGIBLE SCREEN (LACKS PYTHON, JAVA, JAVASCRIPT, C++, C)
  if (ineligibleError) {
    return (
      <div className="min-h-screen relative overflow-hidden bg-[#f8f7ff] flex items-center justify-center p-6">
        <AnimatedBackground />

        <motion.div
          initial={{
            opacity: 0,
            y: 30,
            scale: 0.96,
          }}
          animate={{
            opacity: 1,
            y: 0,
            scale: 1,
          }}
          className="relative z-10 max-w-md w-full bg-white/90 backdrop-blur-xl rounded-3xl shadow-xl border border-amber-200 p-8 text-center space-y-4"
        >
          <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
            <Lock className="w-8 h-8" />
          </div>

          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Coding Interview Restricted
            </h2>
            <div className="mt-3 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 font-bold leading-relaxed">
              {ineligibleError}
            </div>
            <p className="text-slate-500 text-xs mt-3 leading-relaxed">
              Only candidates proficient in Python, Java, JavaScript, C++, or C programming may take this coding evaluation.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
            <button
              onClick={() => router.push("/dashboard")}
              className="flex-1 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white text-xs font-semibold rounded-xl shadow-md shadow-violet-200 transition"
            >
              Return to Dashboard
            </button>
            
          </div>
        </motion.div>
      </div>
    );
  }

  // ERROR SCREEN

  if (error && !question) {
    return (
      <div className="min-h-screen relative overflow-hidden bg-[#f8f7ff] flex items-center justify-center p-6">

        <AnimatedBackground />

        <motion.div
          initial={{
            opacity: 0,
            y: 30,
            scale: 0.96,
          }}
          animate={{
            opacity: 1,
            y: 0,
            scale: 1,
          }}
          className="relative z-10 max-w-md w-full bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl border border-white p-8 text-center"
        >
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <AlertCircle className="w-8 h-8" />
          </div>

          <h2 className="text-xl font-bold text-slate-900 mb-2">
            Coding Interview Notice
          </h2>

          <p className="text-slate-600 text-sm mb-6 leading-relaxed">
            {error}
          </p>

          <button
            onClick={() =>
              router.push("/dashboard")
            }
            className="w-full py-3.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-semibold rounded-xl shadow-lg shadow-violet-200 transition"
          >
            Go to Dashboard & Upload Resume
          </button>
        </motion.div>
      </div>
    );
  }

  const lineCount = code.split("\n").length;
  const lineNumbers = Array.from(
    {
      length: Math.max(
        lineCount,
        18
      ),
    },
    (_, i) => i + 1
  );

  const activeLangConfig =
    SUPPORTED_LANGUAGES.find((l) => l.id === language) ||
    SUPPORTED_LANGUAGES[0];


  // MAIN UI


  return (
    <div className="min-h-screen relative overflow-hidden bg-[#f8f7ff]">
      <AnimatedBackground />
      <div className="relative z-10">
        <motion.header
          initial={{
            opacity: 0,
            y: -25,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            duration: 0.6,
          }}
          className="border-b border-white/70 bg-white/70 backdrop-blur-xl sticky top-0 z-50"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">

            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">

              {/* Brand */}
              <div>
                <div className="flex items-center gap-3">

                  <motion.div
                    whileHover={{
                      rotate: 5,
                      scale: 1.05,
                    }}
                    className="w-11 h-11 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-200"
                  >
                    <Code2 className="w-5 h-5 text-white" />
                  </motion.div>

                  <div>
                    <div className="flex items-center gap-3 flex-wrap">

                      <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
                        Coding Interview
                      </h1>

                      <span className="px-3 py-1 bg-violet-100 text-violet-700 rounded-full text-xs font-bold">
                        Question {questionNumber}
                      </span>

                    </div>

                    <p className="text-slate-500 text-xs sm:text-sm mt-1">
                      Adaptive AI coding assessment
                    </p>
                  </div>
                </div>
              </div>

              {/* Header Actions */}
              <div className="flex flex-wrap items-center gap-2">

                {/* Language Selector Dropdown */}
               

                <span
                  className={`px-3 py-2 rounded-xl font-bold text-xs ${difficulty.toLowerCase() ===
                      "easy"
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : difficulty.toLowerCase() ===
                        "medium"
                        ? "bg-amber-50 text-amber-700 border border-amber-200"
                        : "bg-red-50 text-red-700 border border-red-200"
                    }`}
                >
                  {difficulty}
                </span>

                <button
                  onClick={() =>
                    router.push("/dashboard")
                  }
                  className="flex items-center gap-2 px-3.5 py-2 bg-white/80 hover:bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-semibold transition shadow-sm"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span className="hidden sm:inline">
                    Dashboard
                  </span>
                </button>

               

                <button
                  onClick={handleStopInterview}
                  disabled={
                    stopping ||
                    submitting ||
                    running
                  }
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white rounded-xl text-sm font-semibold shadow-lg shadow-red-100 transition disabled:opacity-50"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                  {stopping
                    ? "Generating..."
                    : "Stop Interview"}
                </button>

              </div>
            </div>
          </div>
        </motion.header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">

          <motion.div
            initial={{
              opacity: 0,
              y: 25,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              duration: 0.6,
              delay: 0.1,
            }}
            className="mb-7"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-100 text-violet-700 text-xs font-bold tracking-wider mb-4">
              <Sparkles className="w-3.5 h-3.5" />
              AI-POWERED CODING INTERVIEW
            </div>

            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
              Solve smarter.
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-indigo-600">
                {" "}
                Code better.
              </span>
            </h2>

            <p className="text-slate-500 mt-2 max-w-2xl">
              Solve the problem below and submit your solution.
              The AI automatically adapts the difficulty based on
              your performance.
            </p>
          </motion.div>


          <AnimatePresence>
            {statusNotification && (
              <motion.div
                initial={{
                  opacity: 0,
                  y: -15,
                  height: 0,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                  height: "auto",
                }}
                exit={{
                  opacity: 0,
                  y: -10,
                  height: 0,
                }}
                className="mb-6"
              >
                <div className="p-4 rounded-2xl bg-indigo-50/90 backdrop-blur border border-indigo-200 text-indigo-900 flex items-center justify-between gap-4 shadow-sm">

                  <div className="flex items-center gap-3 text-sm font-medium">
                    <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center">
                      <CheckCircle2 className="w-5 h-5 text-indigo-600" />
                    </div>

                    <span>
                      {statusNotification}
                    </span>
                  </div>

                  <button
                    onClick={() =>
                      setStatusNotification("")
                    }
                    className="w-8 h-8 rounded-lg hover:bg-indigo-100 flex items-center justify-center text-indigo-400 hover:text-indigo-700"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>


          <AnimatePresence mode="wait">
            {question && (
              <motion.section
                key={`${questionNumber}-${question.title}`}
                initial={{
                  opacity: 0,
                  y: 25,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                transition={{
                  duration: 0.5,
                }}
                className="mb-7"
              >

                <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white shadow-xl shadow-violet-100/40 overflow-hidden">

                  {/* Question Header */}
                  <div className="p-5 sm:p-7 border-b border-slate-100">

                    <div className="flex flex-col sm:flex-row justify-between gap-4">

                      <div>
                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-violet-600 mb-2">
                          <Brain className="w-4 h-4" />
                          Problem {questionNumber}
                        </div>

                        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
                          {question.title}
                        </h2>
                      </div>

                      <div
                        className={`self-start px-4 py-2 rounded-xl text-xs font-bold ${difficulty.toLowerCase() ===
                            "easy"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : difficulty.toLowerCase() ===
                              "medium"
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : "bg-red-50 text-red-700 border border-red-200"
                          }`}
                      >
                        {difficulty}
                      </div>

                    </div>

                    <p className="text-slate-600 whitespace-pre-line mt-5 leading-7">
                      {question.description}
                    </p>

                  </div>

                  {/* Question Details  */}
                  <div className="p-5 sm:p-7 grid grid-cols-1 lg:grid-cols-2 gap-5">

                    {question.input_format && (
                      <InfoCard
                        title="Input Format"
                        value={question.input_format}
                      />
                    )}

                    {question.output_format && (
                      <InfoCard
                        title="Output Format"
                        value={question.output_format}
                      />
                    )}

                    {Array.isArray(
                      question.constraints
                    ) &&
                      question.constraints.length >
                      0 && (
                        <div className="lg:col-span-2">
                          <div className="rounded-2xl bg-slate-50/80 border border-slate-100 p-5">

                            <div className="flex items-center gap-2 mb-3">
                              <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center">
                                <Sparkles className="w-4 h-4 text-violet-600" />
                              </div>

                              <h3 className="font-bold text-slate-900 text-sm">
                                Constraints
                              </h3>
                            </div>

                            <ul className="space-y-2 text-sm text-slate-600">
                              {question.constraints.map(
                                (c, i) => (
                                  <li
                                    key={i}
                                    className="flex gap-2"
                                  >
                                    <span className="text-violet-500">
                                      •
                                    </span>
                                    <span>{c}</span>
                                  </li>
                                )
                              )}
                            </ul>

                          </div>
                        </div>
                      )}

                  </div>

                  {/* Test Cases Overview: Visible Sample Tests vs. Hidden Test Cases */}
                  <div className="px-5 sm:px-7 pb-7 space-y-6">
                    {/* Header */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100">
                      <div className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center">
                          <Eye className="w-4 h-4 text-indigo-600" />
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900 text-base">
                            Visible Sample Test Cases
                          </h3>
                          <p className="text-xs text-slate-500">
                            Visible during the interview to test, run, and debug your logic
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold">
                        <Play className="w-3.5 h-3.5 fill-current text-blue-600" />
                        <span>Run Code tests against these sample cases</span>
                      </div>
                    </div>

                    {/* Visible Sample Cases Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {((question.sample_test_cases && question.sample_test_cases.length > 0)
                        ? question.sample_test_cases
                        : question.examples || []
                      ).map((example, index) => {
                        const inputVal = example.input;
                        const outputVal = example.expected_output || example.output;
                        return (
                          <motion.div
                            key={index}
                            whileHover={{ y: -3 }}
                            className="rounded-2xl bg-slate-50/90 border border-slate-200/80 p-5 shadow-sm"
                          >
                            <div className="flex items-center justify-between gap-2 mb-3">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-bold uppercase tracking-wider">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                Sample Case {index + 1}
                              </span>

                              <button
                                type="button"
                                onClick={() => {
                                  if (inputVal) {
                                    navigator.clipboard.writeText(inputVal);
                                    setCopiedInputIdx(index);
                                    setTimeout(() => setCopiedInputIdx(null), 1500);
                                  }
                                }}
                                className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 transition px-2 py-1 rounded-md hover:bg-slate-200/70"
                                title="Copy input"
                              >
                                {copiedInputIdx === index ? (
                                  <>
                                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                                    <span className="text-emerald-600 font-semibold">Copied</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3.5 h-3.5" />
                                    <span>Copy</span>
                                  </>
                                )}
                              </button>
                            </div>

                            <div className="space-y-3 font-mono text-xs">
                              <div>
                                <span className="block font-sans text-xs font-bold text-slate-500 mb-1">
                                  Input:
                                </span>
                                <pre className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-800 whitespace-pre-wrap overflow-x-auto leading-relaxed">
                                  {inputVal}
                                </pre>
                              </div>

                              <div>
                                <span className="block font-sans text-xs font-bold text-slate-500 mb-1">
                                  Expected Output:
                                </span>
                                <pre className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-200 text-emerald-900 font-semibold whitespace-pre-wrap overflow-x-auto leading-relaxed">
                                  {outputVal}
                                </pre>
                              </div>
                            </div>

                            {example.explanation && (
                              <p className="mt-3 pt-3 border-t border-slate-200 text-xs text-slate-600 leading-relaxed font-sans">
                                <strong className="text-slate-800">Explanation: </strong>
                                {example.explanation}
                              </p>
                            )}
                          </motion.div>
                        );
                      })}
                    </div>

                    {/* Hidden Test Cases Security Notice Banner */}
                    <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-violet-50/90 via-indigo-50/80 to-purple-50/90 border border-indigo-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
                      <div className="flex items-start gap-3.5">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-white shrink-0 shadow-md shadow-violet-200">
                          <Lock className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-bold text-slate-900 text-sm">
                              Hidden Test Cases
                            </h4>
                            <span className="px-2.5 py-0.5 rounded-full bg-violet-200/80 text-violet-800 font-bold text-xs">
                              {question.hidden_tests_count || 3} Private Test Cases
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                            Covers edge cases, constraint boundaries, zero/negative inputs, and stress limits.
                            Automatically evaluated when you click <strong>Submit Solution</strong>.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-xs font-bold text-indigo-700 bg-white/90 px-3.5 py-2 rounded-xl border border-indigo-100 shrink-0">
                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                        <span>Integrity Protected</span>
                      </div>
                    </div>
                  </div>

                </div>
              </motion.section>
            )}
          </AnimatePresence>


          <motion.section
            initial={{
              opacity: 0,
              y: 25,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              duration: 0.6,
              delay: 0.2,
            }}
            className="mb-6"
          >

            <div className="rounded-3xl overflow-hidden shadow-xl shadow-slate-200/50 border border-slate-200 bg-white ring-1 ring-slate-100">

              {/* Editor Header */}
             

              {/* Editor */}
              <div className="rounded-3xl overflow-hidden shadow-xl shadow-slate-200/50 border border-slate-200 bg-white ring-1 ring-slate-100">

                {/* =================================================
      EDITOR HEADER
  ================================================= */}

                <div className="px-4 sm:px-5 py-3.5 bg-slate-50/90 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200">

                  <div className="flex items-center gap-3">

                    {/* File name */}
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-white text-indigo-700 rounded-lg text-xs font-mono font-bold border border-slate-200 shadow-sm">

                      <FileCode2 className="w-3.5 h-3.5 text-indigo-600" />

                      {activeLangConfig.file}

                    </div>

                    {/* Language */}
                    <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-700 shadow-sm">

                      <span className="text-slate-400 text-[11px] font-medium hidden sm:inline">
                        Lang:
                      </span>

                      <select
                        value={language}
                        onChange={(e) =>
                          handleLanguageChange(e.target.value)
                        }
                        disabled={submitting || stopping}
                        className="bg-transparent text-slate-800 font-semibold focus:outline-none cursor-pointer text-xs"
                      >
                        {SUPPORTED_LANGUAGES.map((lang) => (
                          <option
                            key={lang.id}
                            value={lang.id}
                          >
                            {lang.name}
                          </option>
                        ))}
                      </select>

                    </div>

                    <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-violet-50 text-violet-700 border border-violet-200/60 rounded-lg text-xs font-mono font-medium">
                      <Terminal className="w-3.5 h-3.5 text-violet-600" />
                      <span>{activeLangConfig.compiler}</span>
                    </div>

                    <span className="text-xs text-slate-400 hidden lg:block">
                      Tab = 4 spaces
                    </span>

                  </div>


                  {/* Editor actions */}

                  <div className="flex items-center gap-2">

                    <button
                      type="button"
                      onClick={handleResetCode}
                      disabled={submitting || stopping}
                      className="
          flex items-center gap-1.5
          px-3 py-1.5
          bg-white
          hover:bg-slate-100
          text-slate-700
          border border-slate-200
          rounded-lg
          text-xs
          font-medium
          shadow-sm
          transition
          disabled:opacity-50
        "
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Reset
                    </button>

                    {result && (
                      <button
                        type="button"
                        onClick={() => setResult(null)}
                        className="
            px-3 py-1.5
            bg-white
            hover:bg-slate-100
            text-slate-700
            border border-slate-200
            rounded-lg
            text-xs
            font-medium
            shadow-sm
            transition
          "
                      >
                        Clear Output
                      </button>
                    )}

                  </div>

                </div>


                {/* =================================================
      CODE AREA
  ================================================= */}

                <div className="relative flex w-full bg-white font-mono text-sm leading-6">

                  {/* ===============================================
        LINE NUMBERS
    =============================================== */}

                  <div
                    ref={lineNumbersRef}
                    aria-hidden="true"
                    className="
        shrink-0
        w-14
        h-[450px]
        py-4
        pr-3
        pl-2
        select-none
        text-right
        font-mono
        text-sm
        leading-6
        text-slate-400
        bg-slate-50
        border-r
        border-slate-200
        overflow-hidden
      "
                  >
                    {lineNumbers.map((num) => (
                      <div
                        key={num}
                        className="h-6 leading-6"
                      >
                        {num}
                      </div>
                    ))}
                  </div>


                  {/* ===============================================
        TEXTAREA
    =============================================== */}

                  <textarea
                    ref={textareaRef}
                    value={code}

                    onChange={(e) => {
                      setCode(e.target.value);
                    }}

                    onKeyDown={handleKeyDown}

                    onScroll={handleScroll}

                    disabled={
                      submitting ||
                      stopping
                    }

                    wrap="off"

                    spellCheck={false}
                    autoCapitalize="off"
                    autoComplete="off"
                    autoCorrect="off"

                    className="
        flex-1
        min-w-0
        h-[450px]

        bg-white
        text-slate-800

        py-4
        px-4

        font-mono
        text-sm
        leading-6

        outline-none
        resize-none
        border-0

        focus:ring-0

        overflow-y-auto
        overflow-x-auto

        whitespace-pre

        selection:bg-indigo-100
        selection:text-indigo-900

        disabled:opacity-60
        disabled:cursor-not-allowed
      "

                    style={{
                      tabSize: 4,
                      WebkitOverflowScrolling: "touch",
                    }}

                    placeholder={`Write your ${activeLangConfig.name
                      } code here...`}
                  />

                </div>

              </div>
            </div>
          </motion.section>



          <motion.div
            initial={{
              opacity: 0,
              y: 20,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              duration: 0.5,
              delay: 0.3,
            }}
            className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center justify-between gap-4 mb-6"
          >
            <div className="flex flex-wrap items-center gap-3">
              {/* Run Code */}
              <motion.button
                whileHover={{
                  scale: 1.02,
                  y: -2,
                }}
                whileTap={{
                  scale: 0.98,
                }}
                onClick={handleRunCode}
                disabled={
                  running ||
                  submitting ||
                  stopping
                }
                className="px-6 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl disabled:opacity-50 font-semibold transition-all shadow-lg shadow-blue-100 flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4 fill-current" />
                {running
                  ? "Testing Sample Cases..."
                  : "Run Code (Sample Tests)"}
              </motion.button>

              {/* Submit */}
              <motion.button
                whileHover={{
                  scale: 1.02,
                  y: -2,
                }}
                whileTap={{
                  scale: 0.98,
                }}
                onClick={handleSubmit}
                disabled={
                  submitting ||
                  running ||
                  stopping
                }
                className="px-6 py-3.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white rounded-xl disabled:opacity-50 font-semibold transition-all shadow-lg shadow-violet-200 flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                {submitting
                  ? "Evaluating All Tests..."
                  : "Submit Solution (All Tests)"}
              </motion.button>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-500 bg-white/70 px-3 py-2 rounded-xl border border-slate-200/60 shadow-xs">
              <span className="flex items-center gap-1 font-semibold text-blue-700">
                <Eye className="w-3.5 h-3.5" />
                Run tests visible cases
              </span>
              <span className="text-slate-300">•</span>
              <span className="flex items-center gap-1 font-semibold text-violet-700">
                <Lock className="w-3.5 h-3.5" />
                Submit verifies hidden cases
              </span>
            </div>
          </motion.div>



          <AnimatePresence>
            {error && (
              <motion.div
                initial={{
                  opacity: 0,
                  y: -10,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                exit={{
                  opacity: 0,
                  y: -10,
                }}
                className="mb-6 bg-red-50/90 backdrop-blur border border-red-200 text-red-700 p-4 rounded-2xl text-sm font-medium flex items-start gap-3"
              >
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span>{error}</span>
              </motion.div>
            )}
          </AnimatePresence>



          <AnimatePresence>
            {result && (
              <motion.section
                initial={{
                  opacity: 0,
                  y: 25,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                exit={{
                  opacity: 0,
                  y: 15,
                }}
                className="mb-10"
              >
                <div className="rounded-3xl overflow-hidden bg-[#1a1b26] shadow-2xl shadow-slate-300/30 border border-gray-800">
                  {/* Console Header with Tabs */}
                  <div className="px-5 py-3.5 border-b border-gray-800 flex flex-wrap items-center justify-between gap-3 bg-[#13141c]">
                    <div className="flex items-center gap-2">
                      {result.sample_results && result.sample_results.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setActiveConsoleTab("sample_cases")}
                          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-2 ${activeConsoleTab === "sample_cases"
                              ? "bg-violet-600 text-white shadow-md shadow-violet-900/50"
                              : "text-gray-400 hover:text-gray-200 hover:bg-gray-800"
                            }`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>
                            Sample Tests (
                            {result.summary
                              ? `${result.summary.passed}/${result.summary.total} Passed`
                              : result.sample_results.length}
                            )
                          </span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => setActiveConsoleTab("console")}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-2 ${activeConsoleTab === "console"
                            ? "bg-violet-600 text-white shadow-md shadow-violet-900/50"
                            : "text-gray-400 hover:text-gray-200 hover:bg-gray-800"
                          }`}
                      >
                        <Terminal className="w-3.5 h-3.5" />
                        <span>Console Output</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-3">
                      {result.summary && (
                        <span
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 ${result.summary.all_passed
                              ? "bg-emerald-950 text-emerald-400 border border-emerald-800/60"
                              : "bg-red-950 text-red-400 border border-red-800/60"
                            }`}
                        >
                          {result.summary.all_passed ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              All Sample Cases Passed
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3.5 h-3.5" />
                              {result.summary.failed} Case(s) Failed
                            </>
                          )}
                        </span>
                      )}

                      {result.execution_time !== undefined && (
                        <div className="flex items-center gap-1.5 text-xs text-gray-400 font-mono">
                          <Clock3 className="w-3.5 h-3.5" />
                          <span>{result.execution_time}s</span>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => setResult(null)}
                        className="text-gray-400 hover:text-gray-200 p-1 rounded hover:bg-gray-800"
                        title="Close console"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Console Body */}
                  <div className="p-5">
                    {/* View 1: Interactive Sample Test Cases Breakdown */}
                    {activeConsoleTab === "sample_cases" && result.sample_results && result.sample_results.length > 0 && (
                      <div className="space-y-4">
                        {/* Case Selector Pills */}
                        <div className="flex flex-wrap items-center gap-2 border-b border-gray-800/80 pb-3">
                          {result.sample_results.map((c, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setSelectedSampleIdx(idx)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold flex items-center gap-2 transition ${selectedSampleIdx === idx
                                  ? "bg-gray-800 text-white border border-gray-700 shadow-sm"
                                  : "bg-[#13141c] text-gray-400 hover:text-gray-200 border border-transparent"
                                }`}
                            >
                              <span
                                className={`w-2 h-2 rounded-full ${c.passed ? "bg-emerald-400" : "bg-red-400"
                                  }`}
                              />
                              <span>Case {c.test_index}</span>
                              <span
                                className={`text-[10px] uppercase font-sans font-bold px-1.5 py-0.5 rounded ${c.passed
                                    ? "bg-emerald-950 text-emerald-400"
                                    : "bg-red-950 text-red-400"
                                  }`}
                              >
                                {c.status}
                              </span>
                            </button>
                          ))}
                        </div>

                        {/* Selected Case Details */}
                        {(() => {
                          const currentCase =
                            result.sample_results[selectedSampleIdx] ||
                            result.sample_results[0];
                          if (!currentCase) return null;

                          return (
                            <div className="space-y-4">
                              <div className="flex items-center justify-between text-xs text-gray-400">
                                <span className="font-semibold text-gray-300">
                                  Sample Case {currentCase.test_index} Comparison
                                </span>
                                <span>Execution time: {currentCase.execution_time}s</span>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                {/* Input */}
                                <div className="space-y-1.5">
                                  <span className="text-xs font-bold text-gray-400 block font-mono">
                                    Input
                                  </span>
                                  <pre className="p-3 rounded-xl bg-[#13141c] text-gray-200 border border-gray-800 font-mono text-xs whitespace-pre-wrap min-h-[70px]">
                                    {currentCase.input}
                                  </pre>
                                </div>

                                {/* Expected Output */}
                                <div className="space-y-1.5">
                                  <span className="text-xs font-bold text-gray-400 block font-mono">
                                    Expected Output
                                  </span>
                                  <pre className="p-3 rounded-xl bg-emerald-950/20 text-emerald-300 border border-emerald-900/40 font-mono text-xs whitespace-pre-wrap min-h-[70px]">
                                    {currentCase.expected_output}
                                  </pre>
                                </div>

                                {/* Your Output */}
                                <div className="space-y-1.5">
                                  <span className="text-xs font-bold text-gray-400 block font-mono">
                                    Your Output
                                  </span>
                                  <pre
                                    className={`p-3 rounded-xl font-mono text-xs whitespace-pre-wrap min-h-[70px] border ${currentCase.passed
                                        ? "bg-emerald-950/30 text-emerald-300 border-emerald-800/60"
                                        : "bg-red-950/30 text-red-300 border-red-800/60"
                                      }`}
                                  >
                                    {currentCase.actual_output || (
                                      <span className="italic text-gray-500">
                                        (No output printed)
                                      </span>
                                    )}
                                  </pre>
                                </div>
                              </div>

                              {currentCase.error && (
                                <div>
                                  <span className="text-xs text-red-400 font-bold block mb-1 font-mono">
                                    Traceback / Error Output
                                  </span>
                                  <pre className="p-3 rounded-xl bg-red-950/40 text-red-300 border border-red-900/60 font-mono text-xs whitespace-pre-wrap">
                                    {currentCase.error}
                                  </pre>
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    )}

                    {/* View 2: Raw Terminal Output */}
                    {(activeConsoleTab === "console" || !result.sample_results) && (
                      <div className="space-y-4">
                        {result.stdout && (
                          <div>
                            <span className="text-xs text-gray-400 block mb-2 font-mono">
                              stdout
                            </span>
                            <pre className="bg-[#13141c] text-emerald-400 p-4 rounded-2xl font-mono text-sm overflow-auto whitespace-pre-wrap leading-relaxed border border-gray-800/50">
                              {result.stdout}
                            </pre>
                          </div>
                        )}

                        {result.stderr && (
                          <div>
                            <span className="text-xs text-red-400 block mb-2 font-mono">
                              stderr / traceback
                            </span>
                            <pre className="bg-red-950/40 text-red-300 p-4 rounded-2xl font-mono text-sm overflow-auto whitespace-pre-wrap leading-relaxed border border-red-900/60">
                              {result.stderr}
                            </pre>
                          </div>
                        )}

                        {!result.stdout && !result.stderr && (
                          <p className="text-gray-400 text-sm font-mono italic">
                            Code executed successfully with no console output.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </motion.section>
            )}
          </AnimatePresence>

          {/* Submission Evaluation Modal (Sample Tests + Hidden Test Cases) */}
          <AnimatePresence>
            {submissionModalData && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm"
              >
                <motion.div
                  initial={{ scale: 0.95, opacity: 0, y: 20 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.95, opacity: 0, y: 20 }}
                  className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl border border-slate-100 flex flex-col"
                >
                  {/* Modal Header */}
                  <div className="p-6 bg-gradient-to-r from-violet-600 to-indigo-600 text-white flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 text-xs font-bold tracking-wider uppercase text-violet-200">
                        <Sparkles className="w-4 h-4" />
                        <span>Submission Evaluation</span>
                      </div>
                      <h3 className="text-xl sm:text-2xl font-bold mt-1">
                        Question {submissionModalData.submittedQuestionNumber || 1} Assessment
                      </h3>
                      {submissionModalData.submittedTitle && (
                        <p className="text-violet-100 text-xs mt-0.5">
                          {submissionModalData.submittedTitle}
                        </p>
                      )}
                    </div>

                    <button
                      onClick={() => setSubmissionModalData(null)}
                      className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition"
                    >
                      <X className="w-5 h-5 text-white" />
                    </button>
                  </div>

                  {/* Modal Content */}
                  <div className="p-6 overflow-y-auto space-y-6">
                    {submissionModalData.test_summary && (
                      <>
                        {/* Overall Verdict Banner */}
                        <div
                          className={`p-4 rounded-2xl border flex items-center justify-between gap-4 ${submissionModalData.test_summary.all_passed
                              ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                              : "bg-amber-50 border-amber-200 text-amber-900"
                            }`}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-10 h-10 rounded-xl flex items-center justify-center text-white ${submissionModalData.test_summary.all_passed
                                  ? "bg-emerald-600"
                                  : "bg-amber-600"
                                }`}
                            >
                              {submissionModalData.test_summary.all_passed ? (
                                <CheckCircle2 className="w-6 h-6" />
                              ) : (
                                <AlertCircle className="w-6 h-6" />
                              )}
                            </div>
                            <div>
                              <div className="font-bold text-base">
                                {submissionModalData.test_summary.all_passed
                                  ? "All Test Cases Passed!"
                                  : `${submissionModalData.test_summary.total_passed} of ${submissionModalData.test_summary.total_tests} Tests Passed`}
                              </div>
                              <div className="text-xs opacity-80">
                                Pass Rate: {submissionModalData.test_summary.pass_rate}%
                              </div>
                            </div>
                          </div>

                          <span className="text-2xl font-black">
                            {submissionModalData.test_summary.pass_rate}%
                          </span>
                        </div>

                        {/* Two Columns: Visible vs Hidden Tests */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {/* Column 1: Visible Sample Tests */}
                          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5 uppercase tracking-wider">
                                <Eye className="w-3.5 h-3.5 text-blue-600" />
                                <span>Visible Sample Tests</span>
                              </span>
                              <span className="text-xs font-extrabold text-blue-600 px-2 py-0.5 rounded-full bg-blue-50">
                                {submissionModalData.test_summary.sample_passed} / {submissionModalData.test_summary.sample_total}
                              </span>
                            </div>

                            <div className="space-y-2">
                              {(submissionModalData.test_summary.sample_results || []).map((s, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-center justify-between text-xs p-2 rounded-lg bg-white border border-slate-100"
                                >
                                  <span className="font-medium text-slate-700">
                                    Sample Case {s.test_index}
                                  </span>
                                  <span
                                    className={`font-bold flex items-center gap-1 ${s.passed ? "text-emerald-600" : "text-red-600"
                                      }`}
                                  >
                                    {s.passed ? (
                                      <>
                                        <CheckCircle2 className="w-3.5 h-3.5" /> Passed
                                      </>
                                    ) : (
                                      <>
                                        <XCircle className="w-3.5 h-3.5" /> Failed
                                      </>
                                    )}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Column 2: Hidden Test Cases */}
                          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5 uppercase tracking-wider">
                                <Lock className="w-3.5 h-3.5 text-violet-600" />
                                <span>Hidden Test Cases</span>
                              </span>
                              <span className="text-xs font-extrabold text-violet-600 px-2 py-0.5 rounded-full bg-violet-50">
                                {submissionModalData.test_summary.hidden_passed} / {submissionModalData.test_summary.hidden_total}
                              </span>
                            </div>

                            <div className="space-y-2">
                              {(submissionModalData.test_summary.hidden_results || []).map((h, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-center justify-between text-xs p-2 rounded-lg bg-white border border-slate-100"
                                >
                                  <span className="font-medium text-slate-700 capitalize">
                                    Hidden Case {h.test_index} ({h.category?.replace(/_/g, " ") || "edge case"})
                                  </span>
                                  <span
                                    className={`font-bold flex items-center gap-1 ${h.passed ? "text-emerald-600" : "text-red-600"
                                      }`}
                                  >
                                    {h.passed ? (
                                      <>
                                        <CheckCircle2 className="w-3.5 h-3.5" /> Passed
                                      </>
                                    ) : (
                                      <>
                                        <XCircle className="w-3.5 h-3.5" /> Failed
                                      </>
                                    )}
                                  </span>
                                </div>
                              ))}
                            </div>

                            <p className="text-[10px] text-slate-400 mt-2 italic">
                              🔒 Inputs & outputs are masked to preserve assessment integrity.
                            </p>
                          </div>
                        </div>
                      </>
                    )}

                    {/* AI Feedback Preview */}
                    {submissionModalData.evaluation && (
                      <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                            <Brain className="w-4 h-4 text-indigo-600" />
                            <span>AI Evaluator Assessment</span>
                          </span>
                          <span className="text-xs font-extrabold text-indigo-700 px-2 py-0.5 rounded-full bg-indigo-100">
                            Score: {submissionModalData.evaluation.overall_score}/10
                          </span>
                        </div>

                        {submissionModalData.evaluation.feedback && (
                          <p className="text-xs text-slate-700 leading-relaxed">
                            {submissionModalData.evaluation.feedback}
                          </p>
                        )}

                        <div className="flex flex-wrap gap-2 pt-1 text-[11px]">
                          {submissionModalData.evaluation.time_complexity && (
                            <span className="px-2 py-1 bg-white rounded-lg border border-indigo-100 text-slate-700 font-mono">
                              Time: {submissionModalData.evaluation.time_complexity}
                            </span>
                          )}
                          {submissionModalData.evaluation.space_complexity && (
                            <span className="px-2 py-1 bg-white rounded-lg border border-indigo-100 text-slate-700 font-mono">
                              Space: {submissionModalData.evaluation.space_complexity}
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Candidate Answer (Submitted Code) */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                          <FileCode2 className="w-4 h-4 text-violet-600" />
                          <span>Candidate Answer (Your Code)</span>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-violet-100 text-violet-700 font-semibold uppercase">
                            {submissionModalData.candidate_language || language}
                          </span>
                        </span>
                        {submissionModalData.candidate_code && (
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(submissionModalData.candidate_code);
                              setCopiedCandidateCode(true);
                              setTimeout(() => setCopiedCandidateCode(false), 2000);
                            }}
                            className="text-[11px] text-slate-500 hover:text-slate-800 flex items-center gap-1 transition"
                          >
                            {copiedCandidateCode ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                                <span className="text-emerald-600">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                <span>Copy</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                      <pre className="p-3.5 rounded-xl bg-slate-900 text-slate-100 font-mono text-xs overflow-x-auto max-h-44 border border-slate-800 leading-relaxed">
                        <code>{submissionModalData.candidate_code || code}</code>
                      </pre>
                    </div>

                    {/* Correct Answer (Reference Solution) */}
                    {(submissionModalData.correct_answer || submissionModalData.reference_solution) && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            <span>Correct Answer (Reference Solution)</span>
                            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold">
                              RAG Verified
                            </span>
                          </span>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(
                                submissionModalData.correct_answer || submissionModalData.reference_solution
                              );
                              setCopiedCorrectCode(true);
                              setTimeout(() => setCopiedCorrectCode(false), 2000);
                            }}
                            className="text-[11px] text-emerald-700 hover:text-emerald-900 flex items-center gap-1 transition"
                          >
                            {copiedCorrectCode ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                                <span className="text-emerald-600">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                <span>Copy Solution</span>
                              </>
                            )}
                          </button>
                        </div>
                        <pre className="p-3.5 rounded-xl bg-slate-950 text-emerald-400 font-mono text-xs overflow-x-auto max-h-48 border border-emerald-900/40 leading-relaxed">
                          <code>{submissionModalData.correct_answer || submissionModalData.reference_solution}</code>
                        </pre>

                        {submissionModalData.solution_explanation && (
                          <div className="p-3 bg-emerald-50/70 border border-emerald-200/60 rounded-xl text-xs text-slate-700 leading-relaxed">
                            <span className="font-bold text-emerald-900 block mb-1">
                              Solution Explanation:
                            </span>
                            {submissionModalData.solution_explanation}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Modal Footer */}
                  <div className="p-4 sm:p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
                    <button
                      onClick={() => setSubmissionModalData(null)}
                      className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white text-sm font-semibold transition shadow-md shadow-violet-200 flex items-center gap-2"
                    >
                      <span>Proceed to Next Question</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

        </main>

      </div>
    </div>
  );
}





function AnimatedBackground() {
  return (
    <>
      <motion.div
        className="absolute -top-32 -left-32 w-[420px] h-[420px] rounded-full bg-violet-300/30 blur-3xl pointer-events-none"
        animate={{
          x: [0, 80, 20, 0],
          y: [0, 60, 120, 0],
          scale: [1, 1.15, 0.95, 1],
        }}
        transition={{
          duration: 14,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      <motion.div
        className="absolute top-1/3 -right-40 w-[480px] h-[480px] rounded-full bg-indigo-300/25 blur-3xl pointer-events-none"
        animate={{
          x: [0, -80, -20, 0],
          y: [0, -70, 40, 0],
          scale: [1, 0.9, 1.15, 1],
        }}
        transition={{
          duration: 16,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      <motion.div
        className="absolute bottom-[-180px] left-1/3 w-[500px] h-[500px] rounded-full bg-purple-300/20 blur-3xl pointer-events-none"
        animate={{
          x: [0, 100, -50, 0],
          y: [0, -80, -20, 0],
          scale: [1, 1.1, 0.9, 1],
        }}
        transition={{
          duration: 18,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,0.08),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(79,70,229,0.08),transparent_35%)] pointer-events-none" />
    </>
  );
}


// QUESTION INFO CARD

function InfoCard({ title, value }) {
  return (
    <motion.div
      whileHover={{
        y: -2,
      }}
      className="rounded-2xl bg-slate-50/80 border border-slate-100 p-5"
    >
      <h3 className="font-bold text-slate-900 text-sm mb-2">
        {title}
      </h3>

      <p className="text-slate-600 text-sm leading-6">
        {value}
      </p>
    </motion.div>
  );
}

