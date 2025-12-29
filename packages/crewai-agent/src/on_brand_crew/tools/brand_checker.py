"""Brand checking tools for CrewAI agents."""

import hashlib
import json
from datetime import datetime
from pathlib import Path
from typing import Any, Optional, Type

from crewai.tools import BaseTool
from pydantic import BaseModel, Field

from on_brand_crew.models import (
    BrandProfile,
    BrandCheckRequest,
    BrandCheckResponse,
    BrandAlignmentStatus,
    BrandExplanation,
    ExplanationSeverity,
    ExplanationAspect,
)


def compute_content_hash(content: str) -> str:
    """Compute SHA-256 hash of content."""
    return hashlib.sha256(content.encode()).hexdigest()


def normalize_text(text: str) -> str:
    """Normalize text for comparison."""
    import re
    return re.sub(r'\s+', ' ', text.lower().strip())


def contains_phrase(content: str, phrase: str) -> bool:
    """Check if content contains a phrase (case-insensitive)."""
    return normalize_text(phrase) in normalize_text(content)


def tokenize(text: str) -> set[str]:
    """Tokenize text into words."""
    import re
    normalized = normalize_text(text)
    words = re.split(r'[\s.,!?;:\'"()\[\]{}]+', normalized)
    return {w for w in words if w}


def calculate_word_overlap(text1: str, text2: str) -> float:
    """Calculate Jaccard similarity between two texts."""
    words1 = tokenize(text1)
    words2 = tokenize(text2)
    if not words1 or not words2:
        return 0.0
    intersection = len(words1 & words2)
    union = len(words1 | words2)
    return intersection / union if union > 0 else 0.0


class LoadBrandProfileInput(BaseModel):
    """Input for loading a brand profile."""
    profile_path: str = Field(
        description="Path to the brand profile JSON file"
    )


class LoadBrandProfileTool(BaseTool):
    """Tool to load a brand profile from a JSON file."""

    name: str = "load_brand_profile"
    description: str = (
        "Load a brand profile from a JSON file. "
        "Returns the parsed brand profile with values, voice descriptors, "
        "tone boundaries, never rules, and examples."
    )
    args_schema: Type[BaseModel] = LoadBrandProfileInput

    def _run(self, profile_path: str) -> dict[str, Any]:
        """Load and validate a brand profile."""
        path = Path(profile_path)
        if not path.exists():
            return {"error": f"Profile not found: {profile_path}"}

        try:
            with open(path) as f:
                data = json.load(f)
            profile = BrandProfile.model_validate(data)
            return profile.model_dump(by_alias=True)
        except json.JSONDecodeError as e:
            return {"error": f"Invalid JSON: {e}"}
        except Exception as e:
            return {"error": f"Failed to load profile: {e}"}


class CheckNeverRulesInput(BaseModel):
    """Input for checking never rules."""
    content: str = Field(description="The content to check")
    never_rules: list[str] = Field(description="List of never rules to check against")


class CheckNeverRulesTool(BaseTool):
    """Tool to check content against 'never do/say' rules."""

    name: str = "check_never_rules"
    description: str = (
        "Check if content violates any 'never do/say' rules. "
        "Returns a list of violated rules and whether the content passes."
    )
    args_schema: Type[BaseModel] = CheckNeverRulesInput

    def _run(self, content: str, never_rules: list[str]) -> dict[str, Any]:
        """Check content against never rules."""
        violated = []
        passed = []

        for rule in never_rules:
            if contains_phrase(content, rule):
                violated.append(rule)
            else:
                passed.append(rule)

        return {
            "violated": sorted(violated),
            "passed": sorted(passed),
            "has_violations": len(violated) > 0,
            "violation_count": len(violated),
        }


class CheckToneInput(BaseModel):
    """Input for checking tone boundaries."""
    content: str = Field(description="The content to check")
    acceptable: list[str] = Field(description="List of acceptable tone characteristics")
    unacceptable: list[str] = Field(description="List of unacceptable tone characteristics")


class CheckToneTool(BaseTool):
    """Tool to check content against tone boundaries."""

    name: str = "check_tone"
    description: str = (
        "Check if content matches acceptable tone and avoids unacceptable tone. "
        "Returns found acceptable and unacceptable tone characteristics."
    )
    args_schema: Type[BaseModel] = CheckToneInput

    def _run(
        self,
        content: str,
        acceptable: list[str],
        unacceptable: list[str]
    ) -> dict[str, Any]:
        """Check content against tone boundaries."""
        acceptable_found = []
        unacceptable_found = []

        for tone in acceptable:
            if contains_phrase(content, tone):
                acceptable_found.append(tone)

        for tone in unacceptable:
            if contains_phrase(content, tone):
                unacceptable_found.append(tone)

        return {
            "acceptable_found": sorted(acceptable_found),
            "unacceptable_found": sorted(unacceptable_found),
            "has_violations": len(unacceptable_found) > 0,
            "tone_score": len(acceptable_found) / max(len(acceptable), 1),
        }


class CheckValueAlignmentInput(BaseModel):
    """Input for checking value alignment."""
    content: str = Field(description="The content to check")
    values: list[str] = Field(description="List of brand values")
    voice_descriptors: list[str] = Field(description="List of voice descriptors")


class CheckValueAlignmentTool(BaseTool):
    """Tool to check content alignment with brand values and voice."""

    name: str = "check_value_alignment"
    description: str = (
        "Check how well content aligns with brand values and voice descriptors. "
        "Returns alignment scores and matched/missing elements."
    )
    args_schema: Type[BaseModel] = CheckValueAlignmentInput

    def _run(
        self,
        content: str,
        values: list[str],
        voice_descriptors: list[str]
    ) -> dict[str, Any]:
        """Check content alignment with values and voice."""
        # Check values
        values_aligned = []
        values_missing = []
        for value in values:
            if contains_phrase(content, value):
                values_aligned.append(value)
            else:
                values_missing.append(value)

        # Check voice
        voice_aligned = []
        voice_missing = []
        for descriptor in voice_descriptors:
            if contains_phrase(content, descriptor):
                voice_aligned.append(descriptor)
            else:
                voice_missing.append(descriptor)

        value_score = len(values_aligned) / max(len(values), 1)
        voice_score = len(voice_aligned) / max(len(voice_descriptors), 1)

        return {
            "values_aligned": sorted(values_aligned),
            "values_missing": sorted(values_missing),
            "voice_aligned": sorted(voice_aligned),
            "voice_missing": sorted(voice_missing),
            "value_score": value_score,
            "voice_score": voice_score,
            "combined_score": (value_score + voice_score) / 2,
        }


class BrandCheckerInput(BaseModel):
    """Input for the complete brand check."""
    content: str = Field(description="The content to check for brand consistency")
    profile_path: str = Field(
        description="Path to the brand profile JSON file",
        default="./brand-profile.json"
    )
    content_type: Optional[str] = Field(
        None,
        description="Type of content (ad-copy, social-post, etc.)"
    )


class BrandCheckerTool(BaseTool):
    """Complete brand consistency checking tool."""

    name: str = "check_brand_consistency"
    description: str = (
        "Perform a complete brand consistency check on content. "
        "Evaluates content against the brand profile including values, voice, "
        "tone, never rules, and examples. Returns status (on-brand, borderline, "
        "off-brand), explanations, and confidence score."
    )
    args_schema: Type[BaseModel] = BrandCheckerInput

    def _run(
        self,
        content: str,
        profile_path: str = "./brand-profile.json",
        content_type: Optional[str] = None
    ) -> dict[str, Any]:
        """Perform complete brand consistency check."""
        # Load profile
        path = Path(profile_path)
        if not path.exists():
            return {"error": f"Profile not found: {profile_path}"}

        try:
            with open(path) as f:
                data = json.load(f)
            profile = BrandProfile.model_validate(data)
        except Exception as e:
            return {"error": f"Failed to load profile: {e}"}

        explanations: list[dict[str, Any]] = []
        status = BrandAlignmentStatus.ON_BRAND
        confidence = 85

        # 1. Check never rules (critical)
        never_violations = []
        for rule in profile.never_rules:
            if contains_phrase(content, rule):
                never_violations.append(rule)

        if never_violations:
            status = BrandAlignmentStatus.OFF_BRAND
            confidence = 95
            explanations.append({
                "text": f'Contains prohibited content: "{never_violations[0]}"',
                "aspect": "never-rule",
                "severity": "critical",
            })

        # 2. Check tone boundaries
        unacceptable_found = []
        acceptable_found = []
        for tone in profile.tone_unacceptable:
            if contains_phrase(content, tone):
                unacceptable_found.append(tone)
        for tone in profile.tone_acceptable:
            if contains_phrase(content, tone):
                acceptable_found.append(tone)

        if unacceptable_found:
            status = BrandAlignmentStatus.OFF_BRAND
            confidence = max(confidence, 90)
            if len(explanations) < 3:
                explanations.append({
                    "text": f'Uses unacceptable tone: "{unacceptable_found[0]}"',
                    "aspect": "tone",
                    "severity": "critical",
                })

        # 3. Check example similarity
        good_similarity = 0.0
        bad_similarity = 0.0
        for example in profile.examples:
            sim = calculate_word_overlap(content, example.content)
            if example.type == "good":
                good_similarity = max(good_similarity, sim)
            else:
                bad_similarity = max(bad_similarity, sim)

        if bad_similarity > 0.3:
            if status != BrandAlignmentStatus.OFF_BRAND:
                status = (
                    BrandAlignmentStatus.OFF_BRAND
                    if bad_similarity > 0.5
                    else BrandAlignmentStatus.BORDERLINE
                )
            confidence = max(confidence, 80)
            if len(explanations) < 3:
                explanations.append({
                    "text": "Content resembles known off-brand examples",
                    "aspect": "example-match",
                    "severity": "critical" if bad_similarity > 0.5 else "warning",
                })

        # 4. Check value and voice alignment
        values_aligned = [v for v in profile.values if contains_phrase(content, v)]
        voice_aligned = [v for v in profile.voice_descriptors if contains_phrase(content, v)]

        value_score = len(values_aligned) / max(len(profile.values), 1)
        voice_score = len(voice_aligned) / max(len(profile.voice_descriptors), 1)
        combined_score = (value_score + voice_score) / 2

        if status == BrandAlignmentStatus.ON_BRAND:
            if combined_score < 0.3:
                status = BrandAlignmentStatus.BORDERLINE
                confidence = 70
            elif combined_score < 0.5:
                status = BrandAlignmentStatus.BORDERLINE
                confidence = 75
            else:
                confidence = 80 + int(combined_score * 15)

        # Add positive/constructive explanations
        if not explanations:
            if good_similarity > 0.3:
                explanations.append({
                    "text": "Content aligns well with established brand examples",
                    "aspect": "example-match",
                    "severity": "info",
                })
            elif value_score > 0.5:
                aligned_str = ", ".join(values_aligned[:2])
                explanations.append({
                    "text": f"Content reflects brand values: {aligned_str}",
                    "aspect": "value",
                    "severity": "info",
                })
            else:
                explanations.append({
                    "text": "Content is acceptable but could better reflect brand values",
                    "aspect": "value",
                    "severity": "info",
                })

        # Add voice explanation if space
        if len(explanations) < 3 and voice_score < 0.5 and status != BrandAlignmentStatus.OFF_BRAND:
            voice_missing = [v for v in profile.voice_descriptors if not contains_phrase(content, v)]
            if voice_missing:
                missing_str = ", ".join(voice_missing[:2])
                explanations.append({
                    "text": f"Voice could better emphasize: {missing_str}",
                    "aspect": "voice",
                    "severity": "info",
                })

        # Add acceptable tone if space
        if len(explanations) < 3 and acceptable_found:
            found_str = ", ".join(acceptable_found[:2])
            explanations.append({
                "text": f"Good use of brand tone: {found_str}",
                "aspect": "tone",
                "severity": "info",
            })

        # Ensure at least one explanation
        if not explanations:
            explanations.append({
                "text": (
                    "Content aligns with brand guidelines"
                    if status == BrandAlignmentStatus.ON_BRAND
                    else "Content requires review for brand alignment"
                ),
                "severity": "info",
            })

        # Sort by severity
        severity_order = {"critical": 0, "warning": 1, "info": 2}
        explanations.sort(key=lambda x: severity_order.get(x.get("severity", "info"), 2))
        explanations = explanations[:3]

        # Build status display
        status_display = {
            BrandAlignmentStatus.ON_BRAND: "On Brand ✅",
            BrandAlignmentStatus.BORDERLINE: "Borderline ⚠️",
            BrandAlignmentStatus.OFF_BRAND: "Off Brand ❌",
        }[status]

        return {
            "status": status.value,
            "statusDisplay": status_display,
            "explanations": explanations,
            "confidence": confidence,
            "profileVersion": profile.version,
            "checkedAt": datetime.utcnow().isoformat() + "Z",
            "contentHash": compute_content_hash(content),
            "details": {
                "neverRuleViolations": sorted(never_violations),
                "unacceptableToneFound": sorted(unacceptable_found),
                "valueAlignmentScore": value_score,
                "voiceAlignmentScore": voice_score,
                "exampleSimilarity": {
                    "good": good_similarity,
                    "bad": bad_similarity,
                },
            },
        }
