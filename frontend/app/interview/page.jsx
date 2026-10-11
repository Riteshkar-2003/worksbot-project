// "use client";

// import { useEffect, useState } from "react";
// import { useRouter } from "next/navigation";


// export default function InterviewPage() {
//     const router = useRouter();
//     const [question, setQuestion] = useState(
//         "Loading your first interview question..."
//     );
//     const [answer, setAnswer] = useState("");
//     const [difficulty, setDifficulty] = useState("Easy");
//     const [evaluation, setEvaluation] = useState(null);
//     const [loading, setLoading] = useState(false);
//     const [questionNumber, setQuestionNumber] = useState(1);
//     const [resumeData, setResumeData] = useState(null);
//     const [history, setHistory] = useState([]);
//     useEffect(() => {

//         const storedResume =
//             sessionStorage.getItem("resumeData");
//         const storedDifficulty =
//             sessionStorage.getItem("difficulty");
//         if (!storedResume) {
//             router.push("/dashboard");
//             return;
//         }
//         const parsedResume = JSON.parse(storedResume);
//         setResumeData(parsedResume);
//         const selectedDifficulty =
//             storedDifficulty || "Easy";
//         setDifficulty(selectedDifficulty);
//         generateFirstQuestion(
//             parsedResume,
//             selectedDifficulty
//         );
//     }, []);

//     const generateFirstQuestion = async (
//         resume,
//         selectedDifficulty,

//     ) => {
//         try {
//             const response = await fetch(
//                 "http://localhost:8000/interview/first-question",
//                 {
//                     method: "POST",
//                     headers: {
//                         "Content-Type": "application/json",
//                     },
//                     body: JSON.stringify({
//                         resume_data: resume,
//                         difficulty: selectedDifficulty,
//                     }),
//                 }
//             );
//             const data = await response.json();
//             if (!response.ok) {
//                 throw new Error(
//                     data.detail || "Failed to generate question"
//                 );
//             }
//             setQuestion(data.question);
//         } catch (error) {
//             console.error(error);
//             setQuestion(
//                 "Unable to generate interview question."
//             );
//         }
//     };

// const submitAnswer = async () => {
//     if (!answer.trim()) {
//         return;
//     }
//     try {
//         setLoading(true);
//         const response = await fetch(
//             "http://localhost:8000/interview/answer",
//             {
//                 method: "POST",
//                 headers: {
//                     "Content-Type": "application/json",
//                 },
//                 body: JSON.stringify({
//                     question: question,
//                     candidate_answer: answer,
//                     current_difficulty: difficulty,
//                 }),
//             }
//         );
//         const data = await response.json();
//         if (!response.ok) {
//             throw new Error(
//                 data.detail || "Answer evaluation failed"
//             );
//         }
//         const newEvaluation = data.evaluation;
//         await fetch(
//             "http://localhost:8000/interview/save-answer",
//             {
//                 method: "POST",
//                 headers: {
//                     "Content-Type": "application/json"
//                 },
//                 body: JSON.stringify({
//                     candidate_answer: answer,
//                     evaluation: newEvaluation
//                 })
//             }
//         );
//         setEvaluation(newEvaluation);
//         setDifficulty(
//             newEvaluation.next_difficulty
//         );
//         setHistory((previous) => [
//             ...previous,
//             {
//                 question,
//                 answer,
//                 evaluation: newEvaluation,
//             },
//         ]);
//     } catch (error) {
//         console.error(error);
//     } finally {
//         setLoading(false);
//     }
// };

//     const nextQuestion = async () => {
//         try {
//             setLoading(true);
//             setAnswer("");
//             setEvaluation(null);
//             const response = await fetch(
//                 "http://localhost:8000/interview/next-question",
//                 {
//                     method: "POST",
//                     headers: {
//                         "Content-Type": "application/json",
//                     },
//                     body: JSON.stringify({
//                         resume_data: resumeData,
//                         chat_history: history,
//                         current_difficulty: difficulty,
//                         evaluation: evaluation,
//                         asked_sections: [],
//                     }),
//                 }
//             );
//             const data = await response.json();
//             if (!response.ok) {
//                 throw new Error(
//                     data.detail || "Failed to generate question"
//                 );
//             }
//             setQuestion(data.question);
//             setQuestionNumber(
//                 (number) => number + 1
//             );
//         } catch (error) {
//             console.error(error);
//         } finally {
//             setLoading(false);
//         }
//     };

//     const stopInterview = async () => {
//         if (history.length === 0) {
//             alert(
//                 `Please answer at least 8 questions before stopping the interview. You have answered ${history.length} question(s).`
//             );
//             return;
//         }
//         sessionStorage.setItem(
//             "interviewHistory",
//             JSON.stringify(history)
//         );
//         sessionStorage.setItem(
//             "resumeData",
//             JSON.stringify(resumeData)
//         );
//         router.push("/report");
//     };


//     return (
//         <div className="min-h-screen bg-slate-950 text-white">
//             <header className="border-b border-slate-800">
//                 <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
//                     <div>
//                         <h1 className="font-bold">
//                             AI Technical Interview
//                         </h1>
//                         <p className="text-xs text-slate-500">
//                             Question {questionNumber}
//                         </p>
//                     </div>
//                     <div className="flex items-center gap-4">
//                         <div className="rounded-full border border-slate-700 bg-slate-900 px-4 py-2 text-sm">
//                             Difficulty:{" "}
//                             <span className="font-semibold text-blue-400">
//                                 {difficulty}
//                             </span>
//                         </div>
//                         <button
//                             onClick={stopInterview}
//                             className="rounded-lg border border-red-900 px-4 py-2 text-sm text-red-400 hover:bg-red-950"
//                         >
//                             Stop Interview
//                         </button>
//                     </div>
//                 </div>
//             </header>
//             <main className="mx-auto max-w-5xl px-6 py-12">
//                 <div className="mb-10">
//                     <div className="mb-3 flex justify-between text-xs text-slate-500">
//                         <span>Interview Progress</span>
//                         <span>
//                             Question {questionNumber}
//                         </span>
//                     </div>
//                     <div className="h-2 overflow-hidden rounded-full bg-slate-800">
//                         <div
//                             className="h-full rounded-full bg-blue-600 transition-all"
//                             style={{
//                                 width: `${Math.min(
//                                     questionNumber * 10,
//                                     100
//                                 )}%`,
//                             }}
//                         />
//                     </div>
//                 </div>
//                 <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8">
//                     <div className="mb-6 flex items-center gap-3">
//                         <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600">
//                             AI
//                         </div>
//                         <div>
//                             <p className="font-semibold">
//                                 AI Interviewer
//                             </p>
//                             <p className="text-xs text-slate-500">
//                                 Technical Interview
//                             </p>
//                         </div>
//                     </div>
//                     <h2 className="text-2xl font-semibold leading-relaxed">
//                         {question}
//                     </h2>
//                 </div>
//                 <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-8">
//                     <label className="mb-3 block text-sm font-medium">
//                         Your Answer
//                     </label>
//                     <textarea
//                         value={answer}
//                         onChange={(e) =>
//                             setAnswer(e.target.value)
//                         }
//                         disabled={!!evaluation}
//                         placeholder="Type your answer here..."
//                         className="min-h-[220px] w-full resize-none rounded-xl border border-slate-700 bg-slate-950 p-5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-blue-500"
//                     />
//                     {!evaluation && (
//                         <button
//                             onClick={submitAnswer}
//                             disabled={
//                                 loading ||
//                                 !answer.trim()
//                             }
//                             className="mt-5 w-full rounded-xl bg-blue-600 px-6 py-4 font-semibold hover:bg-blue-500 disabled:opacity-40"
//                         >
//                             {loading
//                                 ? "Evaluating Answer..."
//                                 : "Submit Answer"}
//                         </button>
//                     )}
//                 </div>
//                 {evaluation && (
//                     <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-8">
//                         <div className="mt-6 rounded-xl border border-blue-900 bg-blue-950/30 p-5">
//                             <p className="text-sm text-slate-400">
//                                 Next difficulty
//                             </p>
//                             <p className="mt-1 font-semibold text-blue-400">
//                                 {evaluation.next_difficulty}
//                             </p>
//                         </div>
//                         <button
//                             onClick={nextQuestion}
//                             disabled={loading}
//                             className="mt-6 w-full rounded-xl bg-blue-600 px-6 py-4 font-semibold hover:bg-blue-500"
//                         >
//                             {loading
//                                 ? "Generating..."
//                                 : "Next Question →"}
//                         </button>
//                     </div>
//                 )}
//             </main>
//         </div>
//     );
// }











"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
    getFirstQuestion,
    analyzeAnswer,
    getNextQuestion,
} from "../../lib/api";

export default function InterviewPage() {
    const router = useRouter();

    const [question, setQuestion] = useState(
        "Loading your first interview question..."
    );
    const [answer, setAnswer] = useState("");
    const [difficulty, setDifficulty] = useState("Easy");
    const [evaluation, setEvaluation] = useState(null);
    const [loading, setLoading] = useState(false);
    const [questionNumber, setQuestionNumber] = useState(1);
    const [resumeData, setResumeData] = useState(null);
    const [history, setHistory] = useState([]);

    useEffect(() => {
        const storedResume =
            sessionStorage.getItem("resumeData");

        const storedDifficulty =
            sessionStorage.getItem("difficulty");

        if (
            !storedResume ||
            storedResume === "undefined" ||
            storedResume === "null"
        ) {
            console.error(
                "RESUME DATA NOT FOUND"
            );

            router.push("/dashboard");
            return;
        }

        try {
            const parsedResume =
                JSON.parse(storedResume);

            if (!parsedResume) {
                throw new Error(
                    "Resume data is empty"
                );
            }

            setResumeData(
                parsedResume
            );

            const selectedDifficulty =
                storedDifficulty || "Easy";

            setDifficulty(
                selectedDifficulty
            );

            generateFirstQuestion(
                parsedResume,
                selectedDifficulty
            );

        } catch (error) {
            console.error(
                "INVALID RESUME DATA:",
                error
            );

            sessionStorage.removeItem(
                "resumeData"
            );

            sessionStorage.removeItem(
                "resumeFileName"
            );

            router.push("/dashboard");
        }
    }, [router]);

    const generateFirstQuestion = async (
        resume,
        selectedDifficulty
    ) => {
        try {
            const data = await getFirstQuestion(
                resume,
                selectedDifficulty
            );

            console.log(
                "FIRST QUESTION RESPONSE:",
                data
            );

            if (!data?.question) {
                throw new Error(
                    "Backend did not return a question"
                );
            }

            setQuestion(data.question);

        } catch (error) {
            console.error(
                "FIRST QUESTION ERROR:",
                error
            );

            setQuestion(
                "Unable to generate interview question."
            );
        }
    };

    const submitAnswer = async () => {
        if (!answer.trim()) {
            return;
        }
        try {
            setLoading(true);
            const data = await analyzeAnswer(
                question,
                answer,
                difficulty,
                null,
                questionNumber || (history.length + 1)
            );
            const newEvaluation = data.evaluation;
            setEvaluation(newEvaluation);
            setDifficulty(
                newEvaluation.next_difficulty
            );
            setHistory((previous) => [
                ...previous,
                {
                    question,
                    answer,
                    evaluation: newEvaluation,
                },
            ]);
        } catch (error) {
            console.error("Submit answer error:", error);
        } finally {
            setLoading(false);
        }
    };



    const nextQuestion = async () => {
        try {
            setLoading(true);

            const nextDifficulty =
                evaluation?.next_difficulty ||
                difficulty;

            const data = await getNextQuestion(
                resumeData,
                history,
                nextDifficulty,
                evaluation,
                []
            );

            console.log(
                "NEXT QUESTION RESPONSE:",
                data
            );

            if (!data?.question) {
                throw new Error(
                    "Backend did not return the next question."
                );
            }

            setQuestion(
                data.question
            );

            setQuestionNumber(
                (number) => number + 1
            );

            setDifficulty(
                nextDifficulty
            );

            setAnswer("");

            setEvaluation(null);

        } catch (error) {
            console.error(
                "NEXT QUESTION ERROR:",
                error
            );

            alert(
                error?.message ||
                "Failed to generate next question."
            );

        } finally {
            setLoading(false);
        }
    };

    const stopInterview = async () => {
        if (history.length === 0) {
            alert(
                `Please answer at least 8 questions before stopping the interview. You have answered ${history.length} question(s).`
            );
            return;
        }

        sessionStorage.setItem(
            "interviewHistory",
            JSON.stringify(history)
        );

        sessionStorage.setItem(
            "resumeData",
            JSON.stringify(resumeData)
        );

        router.push("/report");
    };

    return (
        <main className="relative min-h-screen overflow-hidden bg-[#f8f7ff] text-slate-900">

            {/* Animated Background Blob 1 */}
            <motion.div
                className="pointer-events-none fixed -left-32 -top-32 h-96 w-96 rounded-full bg-violet-300/30 blur-3xl"
                animate={{
                    x: [0, 80, 0],
                    y: [0, 50, 0],
                    scale: [1, 1.15, 1],
                }}
                transition={{
                    duration: 10,
                    repeat: Infinity,
                    ease: "easeInOut",
                }}
            />

            {/* Animated Background Blob 2 */}
            <motion.div
                className="pointer-events-none fixed -right-32 top-40 h-96 w-96 rounded-full bg-indigo-300/30 blur-3xl"
                animate={{
                    x: [0, -70, 0],
                    y: [0, 60, 0],
                    scale: [1, 1.2, 1],
                }}
                transition={{
                    duration: 12,
                    repeat: Infinity,
                    ease: "easeInOut",
                }}
            />

            {/* Animated Background Blob 3 */}
            <motion.div
                className="pointer-events-none fixed bottom-0 left-1/3 h-80 w-80 rounded-full bg-purple-300/20 blur-3xl"
                animate={{
                    x: [0, 50, 0],
                    y: [0, -70, 0],
                }}
                transition={{
                    duration: 11,
                    repeat: Infinity,
                    ease: "easeInOut",
                }}
            />

            {/* Navbar */}
            <motion.header
                initial={{ y: -30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.6 }}
                className="relative z-10 border-b border-white/70 bg-white/70 backdrop-blur-xl"
            >
                <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">

                    {/* Logo */}
                    <div>
                        <h1 className="text-xl font-bold text-slate-900">
                            AI Interview Preparation
                        </h1>

                        <p className="text-xs text-slate-500">
                            Technical Interview
                        </p>
                    </div>

                    {/* Right Side */}
                    <div className="flex items-center gap-3">

                        {/* Question */}
                        <div className="hidden rounded-full border border-violet-200 bg-white/80 px-4 py-2 text-sm shadow-sm sm:block">
                            <span className="text-slate-500">
                                Question{" "}
                            </span>

                            <span className="font-semibold text-violet-600">
                                {questionNumber}
                            </span>
                        </div>

                        {/* Difficulty */}
                        <div className="rounded-full border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm">
                            <span className="text-slate-500">
                                Difficulty:{" "}
                            </span>

                            <span className="font-semibold text-indigo-600">
                                {difficulty}
                            </span>
                        </div>

                     
                        

                        {/* Stop */}
                        <motion.button
                            onClick={stopInterview}
                            whileHover={{
                                scale: 1.03,
                            }}
                            whileTap={{
                                scale: 0.97,
                            }}
                            className="rounded-xl border border-red-200 bg-red-50 px-2.5 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-red-600 transition hover:bg-red-100"
                        >
                            Stop Interview
                        </motion.button>
                    </div>
                </div>
            </motion.header>

            {/* Main */}
            <div className="relative z-10 mx-auto max-w-5xl px-6 py-10">

                {/* Progress */}
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
                        duration: 0.6,
                        delay: 0.15,
                    }}
                    className="mb-7 rounded-3xl border border-white/70 bg-white/75 p-5 shadow-lg backdrop-blur-xl"
                >
                    <div className="mb-3 flex items-center justify-between text-sm">
                        <span className="font-medium text-slate-600">
                            Interview Progress
                        </span>

                        <span className="font-semibold text-violet-600">
                            Question {questionNumber}
                        </span>
                    </div>

                    <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                        <motion.div
                            className="h-full rounded-full bg-gradient-to-r from-violet-600 to-indigo-600"
                            initial={{
                                width: 0,
                            }}
                            animate={{
                                width: `${Math.min(
                                    questionNumber * 10,
                                    100
                                )}%`,
                            }}
                            transition={{
                                duration: 0.6,
                            }}
                        />
                    </div>

                    <div className="mt-3 flex justify-between text-xs text-slate-400">
                        <span>
                            Question {questionNumber}
                        </span>

                        <span>
                            {Math.min(
                                questionNumber * 10,
                                100
                            )}
                            %
                        </span>
                    </div>
                </motion.div>

                {/* Question Card */}
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
                        delay: 0.25,
                    }}
                    whileHover={{
                        y: -2,
                    }}
                    className="rounded-3xl border border-white/70 bg-white/80 p-8 shadow-xl backdrop-blur-xl"
                >
                    <div className="mb-7 flex items-center gap-4">

                        {/* AI Icon */}
                        <motion.div
                            animate={{
                                scale: [1, 1.05, 1],
                            }}
                            transition={{
                                duration: 2,
                                repeat: Infinity,
                            }}
                            className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 text-sm font-bold text-white shadow-lg shadow-violet-200"
                        >
                            AI
                        </motion.div>

                        <div>
                            <p className="font-semibold text-slate-900">
                                AI Interviewer
                            </p>

                            <p className="text-sm text-slate-500">
                                Technical Interview
                            </p>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-violet-100 bg-violet-50/60 p-6">
                        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-violet-500">
                            Interview Question
                        </p>

                        <h2 className="text-xl font-semibold leading-relaxed text-slate-800 md:text-2xl">
                            {question}
                        </h2>
                    </div>
                </motion.section>

                {/* Answer Card */}
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
                        delay: 0.35,
                    }}
                    className="mt-6 rounded-3xl border border-white/70 bg-white/80 p-8 shadow-xl backdrop-blur-xl"
                >
                    <div className="mb-4 flex items-center justify-between">
                        <label className="text-sm font-semibold text-slate-800">
                            Your Answer
                        </label>

                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-500">
                            {answer.length} characters
                        </span>
                    </div>

                    <textarea
                        value={answer}
                        onChange={(e) =>
                            setAnswer(e.target.value)
                        }
                        disabled={!!evaluation}
                        placeholder="Type your answer here..."
                        className="min-h-[220px] w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100 disabled:cursor-not-allowed disabled:bg-slate-100"
                    />

                    {!evaluation && (
                        <motion.button
                            onClick={submitAnswer}
                            disabled={
                                loading ||
                                !answer.trim()
                            }
                            whileHover={{
                                scale: 1.01,
                            }}
                            whileTap={{
                                scale: 0.98,
                            }}
                            className="mt-5 w-full rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 px-6 py-4 font-semibold text-white shadow-lg shadow-violet-200 transition hover:from-violet-500 hover:to-indigo-500 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            {loading
                                ? "Evaluating Answer..."
                                : "Submit Answer →"}
                        </motion.button>
                    )}
                </motion.section>

                {/* Evaluation */}
                {evaluation && (
                    <motion.section
                        initial={{
                            opacity: 0,
                            y: 30,
                        }}
                        animate={{
                            opacity: 1,
                            y: 0,
                        }}
                        transition={{
                            duration: 0.6,
                        }}
                        className="mt-6 rounded-3xl border border-white/70 bg-white/80 p-8 shadow-xl backdrop-blur-xl"
                    >
                        <div className="mb-6">
                            <p className="text-sm font-semibold uppercase tracking-wider text-violet-600">
                                AI Evaluation
                            </p>

                            <h3 className="mt-1 text-2xl font-bold text-slate-900">
                                Your answer has been evaluated
                            </h3>
                        </div>

                        {/* Evaluation Details */}
                        <div className="grid gap-4 sm:grid-cols-2">

                            {/* Next Difficulty */}
                            <motion.div
                                whileHover={{
                                    scale: 1.02,
                                }}
                                className="rounded-2xl border border-indigo-100 bg-indigo-50 p-5"
                            >
                                <p className="text-sm text-slate-500">
                                    Next difficulty
                                </p>

                                <p className="mt-2 text-xl font-bold text-indigo-600">
                                    {
                                        evaluation.next_difficulty
                                    }
                                </p>
                            </motion.div>

                            {/* Current Question */}
                            <motion.div
                                whileHover={{
                                    scale: 1.02,
                                }}
                                className="rounded-2xl border border-violet-100 bg-violet-50 p-5"
                            >
                                <p className="text-sm text-slate-500">
                                    Current question
                                </p>

                                <p className="mt-2 text-xl font-bold text-violet-600">
                                    #{questionNumber}
                                </p>
                            </motion.div>
                        </div>

                        {/* Next Question */}
                        <motion.button
                            onClick={nextQuestion}
                            disabled={loading}
                            whileHover={{
                                scale: 1.01,
                            }}
                            whileTap={{
                                scale: 0.98,
                            }}
                            className="mt-6 w-full rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 px-6 py-4 font-semibold text-white shadow-lg shadow-violet-200 transition hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50"
                        >
                            {loading
                                ? "Generating Next Question..."
                                : "Next Question →"}
                        </motion.button>
                    </motion.section>
                )}

                {/* Bottom Info */}
                
            </div>
        </main>
    );
}