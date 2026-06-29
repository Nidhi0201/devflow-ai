import json

from openai import OpenAI

from app.config import settings

SYSTEM_PROMPT = """You are an expert code reviewer. Analyze the pull request diff and provide:
1. A brief summary of the changes
2. Specific improvement suggestions
3. Security issues (if any)
4. Bug explanations (if any)
5. A security score from 0-10 (10 = most secure)

Respond ONLY with valid JSON in this exact format:
{
  "summary": "Brief overview of changes",
  "suggestions": ["suggestion 1", "suggestion 2"],
  "security_issues": ["issue 1", "issue 2"],
  "bug_explanations": ["bug 1 explanation"],
  "security_score": 8.5
}

Be specific and reference actual code patterns. If no issues found, use empty arrays."""


class AIService:
    def __init__(self):
        self.client = OpenAI(api_key=settings.openai_api_key) if settings.openai_api_key else None

    def review_code(self, pr_title: str, diff: str, files: list[dict]) -> dict:
        if not self.client:
            return self._mock_review(pr_title, diff)

        file_summary = "\n".join(
            f"- {f.get('filename', 'unknown')}: +{f.get('additions', 0)}/-{f.get('deletions', 0)}"
            for f in files[:20]
        )
        truncated_diff = diff[:12000] if len(diff) > 12000 else diff

        user_content = f"""Pull Request: {pr_title}

Files changed:
{file_summary}

Diff:
```
{truncated_diff}
```"""

        response = self.client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_content},
            ],
            temperature=0.3,
            response_format={"type": "json_object"},
        )

        content = response.choices[0].message.content or "{}"
        return json.loads(content)

    def _mock_review(self, pr_title: str, diff: str) -> dict:
        suggestions = []
        security_issues = []
        bug_explanations = []

        diff_lower = diff.lower()
        if "eval(" in diff_lower or "exec(" in diff_lower:
            security_issues.append("Found use of eval()/exec() which can lead to code injection")
        if "password" in diff_lower and "hash" not in diff_lower:
            security_issues.append("Password handling detected without apparent hashing")
        if "select " in diff_lower and "+" in diff and "where" in diff_lower:
            security_issues.append("Potential SQL injection risk — use parameterized queries")
        if "console.log" in diff_lower:
            suggestions.append("Remove debug console.log statements before merging")
        if len(diff.split("\n")) > 200:
            suggestions.append("Consider splitting this large PR into smaller, focused changes")

        suggestions.append("Add unit tests for the new functionality")
        suggestions.append("Consider adding caching for frequently accessed data")

        score = 10.0 - len(security_issues) * 1.5 - len(bug_explanations) * 1.0
        score = max(1.0, min(10.0, score))

        return {
            "summary": f"AI review of '{pr_title}': analyzed {len(diff.split(chr(10)))} lines of changes.",
            "suggestions": suggestions,
            "security_issues": security_issues,
            "bug_explanations": bug_explanations,
            "security_score": round(score, 1),
        }
