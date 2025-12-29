"""On Brand Crew - CrewAI implementation for brand consistency checking."""

from pathlib import Path
from typing import Any, Optional

from crewai import Agent, Crew, Process, Task
from crewai.project import CrewBase, agent, crew, task

from on_brand_crew.tools import (
    BrandCheckerTool,
    LoadBrandProfileTool,
    CheckNeverRulesTool,
    CheckToneTool,
    CheckValueAlignmentTool,
)


@CrewBase
class OnBrandCrew:
    """
    On Brand Crew - A CrewAI crew for brand consistency checking.

    This crew evaluates content against a brand profile to determine
    if it is on-brand, borderline, or off-brand.

    Example usage:
        crew = OnBrandCrew()
        result = crew.crew().kickoff(inputs={
            "content": "Your marketing copy here",
            "profile_path": "./brand-profile.json"
        })
    """

    # Configuration file paths
    agents_config = "config/agents.yaml"
    tasks_config = "config/tasks.yaml"

    def __init__(self, profile_path: str = "./brand-profile.json"):
        """
        Initialize the On Brand Crew.

        Args:
            profile_path: Path to the brand profile JSON file
        """
        self.profile_path = profile_path
        self._tools = self._create_tools()

    def _create_tools(self) -> list:
        """Create the brand checking tools."""
        return [
            BrandCheckerTool(),
            LoadBrandProfileTool(),
            CheckNeverRulesTool(),
            CheckToneTool(),
            CheckValueAlignmentTool(),
        ]

    @agent
    def brand_analyst(self) -> Agent:
        """Create the brand analyst agent."""
        return Agent(
            config=self.agents_config["brand_analyst"],
            tools=self._tools,
            verbose=True,
        )

    @agent
    def content_reviewer(self) -> Agent:
        """Create the content reviewer agent."""
        return Agent(
            config=self.agents_config["content_reviewer"],
            tools=[],  # No special tools needed
            verbose=True,
        )

    @agent
    def audit_recorder(self) -> Agent:
        """Create the audit recorder agent."""
        return Agent(
            config=self.agents_config["audit_recorder"],
            tools=[],
            verbose=False,
        )

    @task
    def check_brand_consistency_task(self) -> Task:
        """Create the main brand consistency check task."""
        return Task(
            config=self.tasks_config["check_brand_consistency"],
            agent=self.brand_analyst(),
        )

    @task
    def analyze_content_quality_task(self) -> Task:
        """Create the content quality analysis task."""
        return Task(
            config=self.tasks_config["analyze_content_quality"],
            agent=self.content_reviewer(),
        )

    @task
    def record_audit_entry_task(self) -> Task:
        """Create the audit recording task."""
        return Task(
            config=self.tasks_config["record_audit_entry"],
            agent=self.audit_recorder(),
        )

    @crew
    def crew(self) -> Crew:
        """Create and return the On Brand Crew."""
        return Crew(
            agents=self.agents,  # Automatically collected by @agent decorator
            tasks=self.tasks,    # Automatically collected by @task decorator
            process=Process.sequential,
            verbose=True,
        )

    def check(
        self,
        content: str,
        profile_path: Optional[str] = None,
        content_type: Optional[str] = None,
    ) -> dict[str, Any]:
        """
        Perform a brand consistency check.

        This is a convenience method that runs the crew with the
        appropriate inputs.

        Args:
            content: The content to check
            profile_path: Path to brand profile (uses default if not provided)
            content_type: Optional content type hint

        Returns:
            Brand check result dictionary
        """
        path = profile_path or self.profile_path

        result = self.crew().kickoff(
            inputs={
                "content": content,
                "profile_path": path,
                "content_type": content_type or "other",
            }
        )

        return result

    def check_batch(
        self,
        content_items: list[str],
        profile_path: Optional[str] = None,
    ) -> dict[str, Any]:
        """
        Perform brand consistency checks on multiple content items.

        Args:
            content_items: List of content strings to check
            profile_path: Path to brand profile

        Returns:
            Batch check results with summary
        """
        path = profile_path or self.profile_path

        # Format content items for the task
        formatted_items = "\n\n".join(
            f"Item {i+1}:\n{item}"
            for i, item in enumerate(content_items)
        )

        result = self.crew().kickoff(
            inputs={
                "content_items": formatted_items,
                "profile_path": path,
            }
        )

        return result


class SimpleBrandChecker:
    """
    Simple brand checker that uses tools directly without the full crew.

    This is useful for quick checks without the overhead of running
    a full CrewAI crew.

    Example:
        checker = SimpleBrandChecker("./brand-profile.json")
        result = checker.check("Your content here")
        print(result["statusDisplay"])
    """

    def __init__(self, profile_path: str = "./brand-profile.json"):
        """Initialize with a brand profile path."""
        self.profile_path = profile_path
        self._tool = BrandCheckerTool()

    def check(
        self,
        content: str,
        content_type: Optional[str] = None,
    ) -> dict[str, Any]:
        """
        Check content for brand consistency.

        Args:
            content: The content to check
            content_type: Optional content type hint

        Returns:
            Brand check result dictionary
        """
        return self._tool._run(
            content=content,
            profile_path=self.profile_path,
            content_type=content_type,
        )

    def check_batch(self, content_items: list[str]) -> list[dict[str, Any]]:
        """
        Check multiple content items.

        Args:
            content_items: List of content strings

        Returns:
            List of brand check results
        """
        return [self.check(item) for item in content_items]

    def get_summary(self, results: list[dict[str, Any]]) -> dict[str, Any]:
        """
        Get a summary of batch check results.

        Args:
            results: List of brand check results

        Returns:
            Summary with counts and health score
        """
        on_brand = sum(1 for r in results if r.get("status") == "on-brand")
        borderline = sum(1 for r in results if r.get("status") == "borderline")
        off_brand = sum(1 for r in results if r.get("status") == "off-brand")

        total = len(results)
        health_score = (
            (on_brand * 100 + borderline * 50) / total
            if total > 0
            else 0
        )

        return {
            "total": total,
            "on_brand": on_brand,
            "borderline": borderline,
            "off_brand": off_brand,
            "health_score": round(health_score, 1),
            "needs_attention": [
                i for i, r in enumerate(results)
                if r.get("status") == "off-brand"
            ],
        }
