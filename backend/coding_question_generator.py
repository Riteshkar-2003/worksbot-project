import json
import re
import os
from dotenv import load_dotenv
from groq import Groq
from rag_coding.retriever import retrieve_coding_knowledge

load_dotenv()

api_key = os.getenv("GROQ_API_KEY")

if not api_key:
    raise ValueError("GROQ_API_KEY is missing from .env")

client = Groq(api_key=api_key)


def repair_pseudo_json_expressions(text: str) -> str:
    """Repairs pseudo-JSON where models write Python expressions like 'a' + 'b' or 'x' * 10."""
    if not text:
        return ""

    # Replace Python string multiplication: "str" * N -> repeated string (limit N to 10)
    def eval_repeat(m):
        base = m.group(1)
        try:
            n = min(int(m.group(2)), 10)
            return '"' + (base * n) + '"'
        except Exception:
            return '"' + base + '"'

    text = re.sub(r'"([^"\\]*)"\s*\*\s*(\d+)', eval_repeat, text)

    # Replace Python string concatenation: "str1" + "str2" -> "str1str2"
    for _ in range(10):
        new_text = re.sub(r'"([^"\\]*)"\s*\+\s*"([^"\\]*)"', r'"\1\2"', text)
        if new_text == text:
            break
        text = new_text

    # Remove trailing commas before closing braces/brackets
    text = re.sub(r',\s*([\}\]])', r'\1', text)
    return text


def get_default_starter_code(language: str = "python") -> str:
    lang = (language or "python").lower().strip()
    if lang in ["javascript", "js"]:
        return (
            "const fs = require('fs');\n\n"
            "function solve() {\n"
            "    const input = fs.readFileSync(0, 'utf-8').trim();\n"
            "    if (!input) return;\n"
            "    // Read input lines/tokens and print result\n"
            "}\n\n"
            "solve();\n"
        )
    elif lang in ["java"]:
        return (
            "import java.util.*;\n"
            "import java.io.*;\n\n"
            "public class Solution {\n"
            "    public static void main(String[] args) {\n"
            "        Scanner sc = new Scanner(System.in);\n"
            "        // Read from standard input and print output\n"
            "    }\n"
            "}\n"
        )
    elif lang in ["c"]:
        return (
            "#include <stdio.h>\n"
            "#include <stdlib.h>\n"
            "#include <string.h>\n\n"
            "int main() {\n"
            "    // Read from standard input (e.g. scanf / fgets)\n"
            "    // Write your solution here\n"
            "    return 0;\n"
            "}\n"
        )
    elif lang in ["cpp", "c++"]:
        return (
            "#include <iostream>\n"
            "#include <vector>\n"
            "#include <string>\n"
            "#include <algorithm>\n\n"
            "using namespace std;\n\n"
            "int main() {\n"
            "    ios_base::sync_with_stdio(false);\n"
            "    cin.tie(NULL);\n"
            "    // Read input and print output\n"
            "    return 0;\n"
            "}\n"
        )
    else:
        return (
            "import sys\n\n"
            "def solve():\n"
            "    # Read from standard input (e.g. sys.stdin.read().split())\n"
            "    pass\n\n"
            "if __name__ == '__main__':\n"
            "    solve()\n"
        )


def get_fallback_question(difficulty: str = "Easy", language: str = "python") -> dict:
    starter = get_default_starter_code(language)
    lang = (language or "python").lower().strip()

    if lang in ["javascript", "js"]:
        ref_code = (
            "const fs = require('fs');\n\n"
            "function solve() {\n"
            "    const input = fs.readFileSync(0, 'utf-8').trim();\n"
            "    if (!input) return;\n"
            "    const tokens = input.split(/\\s+/);\n"
            "    const n = parseInt(tokens[0], 10);\n"
            "    let sum = 0;\n"
            "    for (let i = 1; i <= n; i++) {\n"
            "        sum += parseInt(tokens[i], 10);\n"
            "    }\n"
            "    console.log(sum);\n"
            "}\n\n"
            "solve();\n"
        )
    elif lang in ["java"]:
        ref_code = (
            "import java.util.*;\n\n"
            "public class Solution {\n"
            "    public static void main(String[] args) {\n"
            "        Scanner sc = new Scanner(System.in);\n"
            "        if (!sc.hasNextInt()) return;\n"
            "        int n = sc.nextInt();\n"
            "        long sum = 0;\n"
            "        for (int i = 0; i < n; i++) {\n"
            "            sum += sc.nextLong();\n"
            "        }\n"
            "        System.out.println(sum);\n"
            "    }\n"
            "}\n"
        )
    elif lang in ["c"]:
        ref_code = (
            "#include <stdio.h>\n\n"
            "int main() {\n"
            "    int n;\n"
            "    if (scanf(\"%d\", &n) != 1) return 0;\n"
            "    long long sum = 0;\n"
            "    for (int i = 0; i < n; i++) {\n"
            "        long long val;\n"
            "        scanf(\"%lld\", &val);\n"
            "        sum += val;\n"
            "    }\n"
            "    printf(\"%lld\\n\", sum);\n"
            "    return 0;\n"
            "}\n"
        )
    elif lang in ["cpp", "c++"]:
        ref_code = (
            "#include <iostream>\n"
            "using namespace std;\n\n"
            "int main() {\n"
            "    ios_base::sync_with_stdio(false);\n"
            "    cin.tie(NULL);\n"
            "    int n;\n"
            "    if (!(cin >> n)) return 0;\n"
            "    long long sum = 0;\n"
            "    for (int i = 0; i < n; i++) {\n"
            "        long long val;\n"
            "        cin >> val;\n"
            "        sum += val;\n"
            "    }\n"
            "    cout << sum << \"\\n\";\n"
            "    return 0;\n"
            "}\n"
        )
    else:
        ref_code = (
            "import sys\n\n"
            "def solve():\n"
            "    lines = sys.stdin.read().split()\n"
            "    if not lines:\n"
            "        return\n"
            "    n = int(lines[0])\n"
            "    nums = [int(x) for x in lines[1:n+1]]\n"
            "    print(sum(nums))\n\n"
            "if __name__ == '__main__':\n"
            "    solve()\n"
        )

    return {
        "title": "Array Element Sum",
        "description": "Given a list of integers, compute and print the sum of all elements in the list.",
        "input_format": "The first line contains an integer N. The second line contains N space-separated integers.",
        "output_format": "Print a single integer representing the sum of the elements.",
        "constraints": [
            "1 <= N <= 1000",
            "-10^4 <= each integer <= 10^4"
        ],
        "starter_code": starter,
        "reference_solution": ref_code,
        "correct_answer": ref_code,
        "time_complexity": "O(N)",
        "space_complexity": "O(1)",
        "solution_explanation": "Iterates through the array accumulating the total sum in O(N) time with O(1) auxiliary space.",
        "sample_test_cases": [
            {
                "input": "4\n1 2 3 4",
                "expected_output": "10",
                "explanation": "1 + 2 + 3 + 4 = 10"
            },
            {
                "input": "3\n5 -2 7",
                "expected_output": "10",
                "explanation": "5 + (-2) + 7 = 10"
            }
        ],
        "hidden_test_cases": [
            {
                "input": "1\n42",
                "expected_output": "42",
                "category": "single_element"
            },
            {
                "input": "3\n0 0 0",
                "expected_output": "0",
                "category": "zero_elements"
            },
            {
                "input": "4\n-10 -20 -30 -40",
                "expected_output": "-100",
                "category": "negative_numbers"
            }
        ],
        "examples": [
            {
                "input": "4\n1 2 3 4",
                "output": "10",
                "explanation": "1 + 2 + 3 + 4 = 10"
            }
        ]
    }


def generate_coding_question(
    resume_text: str,
    difficulty: str = "Easy",
    language: str = "python",
    previous_questions: list = None
):
    avoid_clause = ""
    if previous_questions:
        prev_list = ", ".join([f'"{q}"' for q in previous_questions if q])
        if prev_list:
            avoid_clause = f"\n10. Do NOT generate problems similar to previously asked: {prev_list}. Pick a different algorithmic concept."

    clean_resume = resume_text.strip() if resume_text else "Software engineering candidate skilled in algorithms and data structures."
    starter_template = get_default_starter_code(language)

    # Query RAG coding knowledge base
    rag_coding_context = retrieve_coding_knowledge(
        query=f"{difficulty} algorithm problem data structures",
        language=language,
        k=3
    )

    prompt = f"""
You are an AI coding interview question generator.

Generate ONE coding interview question based on the candidate's resume and knowledge base.
CRITICAL DESIGN REQUIREMENT: You MUST separate visible sample test cases from hidden test cases, AND provide the optimal working reference solution (Correct Answer).
- Visible sample tests (2 cases): Used by candidate during interview to test and debug their code.
- Hidden test cases (3 to 4 cases): Used during final submission to evaluate edge cases, boundary conditions, zero/negative inputs, or empty/single elements. Candidate should NOT see hidden test cases upfront.
- Reference Solution (Correct Answer): Working optimal code in {language} that reads stdin and prints stdout.

Candidate Resume:
{clean_resume}

Difficulty:
{difficulty}

Programming Language:
{language}

{f"RAG CODING KNOWLEDGE BASE CONTEXT:\n{rag_coding_context}\n" if rag_coding_context else ""}

Requirements:
1. Generate exactly ONE coding problem suitable for {language}.
2. The problem must strictly match the requested difficulty: {difficulty}.
3. Use skills/topics mentioned in the resume and RAG knowledge base.
4. Provide the complete optimal reference solution code (Correct Answer) in {language}.
5. Standard I/O (stdin / stdout): The problem must read input from standard input (stdin) and print output to standard output (stdout).
6. Provide exactly 2 visible sample test cases with clear explanations.
7. Provide 3-4 hidden test cases testing edge cases and boundary limits.
8. CRITICAL SYNTAX RULE: All JSON values must be plain literal strings. NEVER use code expressions, string concatenation ('+' operator), or repetition ('*' operator) in JSON strings. Write literal inputs directly (e.g. "5\\n1 2 3 4 5"). Keep boundary inputs concrete and under 100 characters.
9. Return ONLY a valid JSON object. Do not include markdown codeblocks.{avoid_clause}

Return exactly this JSON structure:

{{
    "title": "Problem title",
    "description": "Detailed problem description explaining the task clearly",
    "input_format": "Input format description (e.g. First line contains integer N, followed by...)",
    "output_format": "Output format description (e.g. Print a single integer representing...)",
    "constraints": [
        "1 <= N <= 10^5",
        "0 <= elements <= 10^9"
    ],
    "starter_code": {json.dumps(starter_template)},
    "reference_solution": "Complete working optimal solution code in {language} reading stdin and printing stdout",
    "correct_answer": "Complete working optimal solution code in {language}",
    "time_complexity": "O(N)",
    "space_complexity": "O(1)",
    "solution_explanation": "Explanation of the optimal approach",
    "sample_test_cases": [
        {{
            "input": "Sample input string exactly as passed to stdin",
            "expected_output": "Sample expected output string exactly as printed to stdout",
            "explanation": "Why this output is produced"
        }}
    ],
    "hidden_test_cases": [
        {{
            "input": "Hidden input string for edge/boundary case",
            "expected_output": "Expected output string",
            "category": "edge_case"
        }},
        {{
            "input": "Another hidden test input",
            "expected_output": "Expected output string",
            "category": "boundary_limit"
        }},
        {{
            "input": "Another hidden test input",
            "expected_output": "Expected output string",
            "category": "special_values"
        }}
    ],
    "examples": [
        {{
            "input": "Same as sample_test_cases[0].input",
            "output": "Same as sample_test_cases[0].expected_output",
            "explanation": "Same as sample_test_cases[0].explanation"
        }}
    ]
}}
"""

    content = ""
    try:
        # First attempt with json_object mode
        response = client.chat.completions.create(
            model=os.getenv("MODEL_NAME"),
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a professional coding interview question generator. "
                        "Return strictly valid JSON only. Every value must be a plain literal string. "
                        "Never use code expressions, string concatenation (+), or multiplication (*) in JSON values."
                    )
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            response_format={"type": "json_object"},
            temperature=0.2,
            max_tokens=2500
        )
        content = response.choices[0].message.content.strip()

    except Exception as api_err:
        err_msg = str(api_err)
        print("Groq JSON generation warning:", err_msg[:200])

        # If Groq returns 400 json_validate_failed, attempt to recover failed_generation
        fg_match = re.search(r"failed_generation':\s*(?:'|\")(\{.*?\})(?:'|\")", err_msg, re.DOTALL)
        if fg_match:
            try:
                raw_fg = fg_match.group(1).encode('utf-8').decode('unicode_escape', errors='ignore')
                content = repair_pseudo_json_expressions(raw_fg)
            except Exception:
                content = ""

        # If still empty, retry without response_format
        if not content:
            try:
                retry_resp = client.chat.completions.create(
                    model=os.getenv("MODEL_NAME"),
                    messages=[
                        {
                            "role": "system",
                            "content": "You output valid JSON object only. Output { to start and } to end. Never use string operations."
                        },
                        {
                            "role": "user",
                            "content": prompt + "\n\nCRITICAL: All strings must be literal strings. No string concatenation."
                        }
                    ],
                    temperature=0.2,
                    max_tokens=2500
                )
                content = retry_resp.choices[0].message.content.strip()
            except Exception as retry_err:
                print("Retry generation failed:", retry_err)
                return get_fallback_question(difficulty=difficulty, language=language)

    # Parse and clean JSON
    try:
        content = repair_pseudo_json_expressions(content)
        match = re.search(r"\{.*\}", content, re.DOTALL)
        if match:
            clean_json = match.group(0)
        else:
            clean_json = re.sub(r"^```json\s*", "", content)
            clean_json = re.sub(r"^```\s*", "", clean_json)
            clean_json = re.sub(r"\s*```$", "", clean_json).strip()

        clean_json = repair_pseudo_json_expressions(clean_json)
        question = json.loads(clean_json)

    except Exception as parse_err:
        print("JSON parse error, using fallback question:", parse_err)
        return get_fallback_question(difficulty=difficulty, language=language)

    # Basic validation
    required_fields = [
        "title",
        "description",
        "input_format",
        "output_format"
    ]

    for field in required_fields:
        if field not in question or not question[field]:
            print(f"Missing required field {field}, using fallback")
            return get_fallback_question(difficulty=difficulty, language=language)

    # Normalize sample_test_cases
    sample_tests = question.get("sample_test_cases") or []
    if not sample_tests and question.get("examples"):
        sample_tests = []
        for ex in question.get("examples", []):
            sample_tests.append({
                "input": str(ex.get("input", "")),
                "expected_output": str(ex.get("output", ex.get("expected_output", ""))),
                "explanation": ex.get("explanation", "")
            })

    normalized_samples = []
    for s in sample_tests:
        inp = str(s.get("input", "")).strip()
        exp = str(s.get("expected_output", s.get("output", ""))).strip()
        normalized_samples.append({
            "input": inp,
            "expected_output": exp,
            "explanation": s.get("explanation", "")
        })

    if not normalized_samples:
        normalized_samples.append({
            "input": "0",
            "expected_output": "0",
            "explanation": "Default sample case"
        })

    # Normalize hidden_test_cases
    hidden_tests = question.get("hidden_test_cases") or []
    normalized_hidden = []
    for h in hidden_tests:
        inp = str(h.get("input", "")).strip()
        exp = str(h.get("expected_output", h.get("output", ""))).strip()
        cat = h.get("category", "edge_case")
        normalized_hidden.append({
            "input": inp,
            "expected_output": exp,
            "category": cat
        })

    if not normalized_hidden:
        normalized_hidden = [
            {
                "input": normalized_samples[0]["input"],
                "expected_output": normalized_samples[0]["expected_output"],
                "category": "standard_check"
            }
        ]

    # Sync examples for backwards compatibility
    examples = []
    for s in normalized_samples:
        examples.append({
            "input": s["input"],
            "output": s["expected_output"],
            "explanation": s.get("explanation", "")
        })

    question["sample_test_cases"] = normalized_samples
    question["hidden_test_cases"] = normalized_hidden
    question["examples"] = examples

    if not question.get("starter_code"):
        question["starter_code"] = get_default_starter_code(language)

    return question