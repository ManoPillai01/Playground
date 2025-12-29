"""Pydantic models for brand consistency checking."""

from enum import Enum
from typing import Literal, Optional
from datetime import datetime
from pydantic import BaseModel, Field, field_validator
import re


class BrandAlignmentStatus(str, Enum):
    """Brand alignment status values."""
    ON_BRAND = "on-brand"
    BORDERLINE = "borderline"
    OFF_BRAND = "off-brand"


class BrandExample(BaseModel):
    """Canonical example of brand content."""
    content: str = Field(..., min_length=1)
    type: Literal["good", "bad"] = "good"
    note: Optional[str] = None


class BrandProfile(BaseModel):
    """Brand Profile - the source of truth for brand consistency."""

    name: str = Field(..., min_length=1, description="Profile name/identifier")
    version: str = Field(..., description="Profile version (semver format)")
    values: list[str] = Field(
        ..., min_length=1, max_length=20,
        description="Brand values (5-10 recommended)"
    )
    voice_descriptors: list[str] = Field(
        ..., min_length=1, max_length=10,
        description="Voice descriptors (e.g., 'optimistic', 'premium')",
        alias="voiceDescriptors"
    )
    tone_acceptable: list[str] = Field(
        default_factory=list,
        description="Acceptable tone characteristics",
        alias="toneAcceptable"
    )
    tone_unacceptable: list[str] = Field(
        default_factory=list,
        description="Unacceptable tone characteristics",
        alias="toneUnacceptable"
    )
    never_rules: list[str] = Field(
        default_factory=list,
        description="Never do / never say rules",
        alias="neverRules"
    )
    examples: list[BrandExample] = Field(
        default_factory=list,
        description="Canonical examples of brand content"
    )
    description: Optional[str] = None
    created_at: Optional[datetime] = Field(None, alias="createdAt")
    updated_at: Optional[datetime] = Field(None, alias="updatedAt")

    @field_validator("version")
    @classmethod
    def validate_version(cls, v: str) -> str:
        if not re.match(r"^\d+\.\d+\.\d+$", v):
            raise ValueError("Version must be in semver format (e.g., 1.0.0)")
        return v

    model_config = {"populate_by_name": True}


class ContentType(str, Enum):
    """Content type options."""
    AD_COPY = "ad-copy"
    SOCIAL_POST = "social-post"
    INFLUENCER_SCRIPT = "influencer-script"
    PRESS_RELEASE = "press-release"
    CAMPAIGN_NAME = "campaign-name"
    AI_GENERATED = "ai-generated"
    EMAIL = "email"
    WEBSITE = "website"
    OTHER = "other"


class BrandCheckRequest(BaseModel):
    """Content to be evaluated for brand consistency."""
    content: str = Field(..., min_length=1, description="The content to evaluate")
    content_type: Optional[ContentType] = Field(
        None,
        description="Optional content type hint",
        alias="contentType"
    )
    metadata: Optional[dict[str, str]] = None

    model_config = {"populate_by_name": True}


class ExplanationSeverity(str, Enum):
    """Severity levels for explanations."""
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"


class ExplanationAspect(str, Enum):
    """Brand aspects for explanations."""
    VALUE = "value"
    VOICE = "voice"
    TONE = "tone"
    NEVER_RULE = "never-rule"
    EXAMPLE_MATCH = "example-match"


class BrandExplanation(BaseModel):
    """Explanation bullet point for brand check result."""
    text: str = Field(..., min_length=1, description="The explanation text")
    aspect: Optional[ExplanationAspect] = None
    severity: ExplanationSeverity = ExplanationSeverity.INFO


class BrandCheckResponse(BaseModel):
    """Brand check response - the output of a brand consistency check."""
    status: BrandAlignmentStatus
    status_display: str = Field(..., alias="statusDisplay")
    explanations: list[BrandExplanation] = Field(..., min_length=1, max_length=3)
    confidence: Optional[int] = Field(None, ge=0, le=100)
    profile_version: str = Field(..., alias="profileVersion")
    checked_at: datetime = Field(..., alias="checkedAt")
    content_hash: str = Field(..., alias="contentHash")

    model_config = {"populate_by_name": True}


class BrandCheckAuditEntry(BaseModel):
    """Audit log entry for brand checks."""
    id: str
    timestamp: datetime
    profile_name: str = Field(..., alias="profileName")
    profile_version: str = Field(..., alias="profileVersion")
    content_hash: str = Field(..., alias="contentHash")
    status: BrandAlignmentStatus
    confidence: Optional[int] = None

    model_config = {"populate_by_name": True}
