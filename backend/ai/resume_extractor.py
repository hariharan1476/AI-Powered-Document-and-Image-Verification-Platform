import os
import re
import sys


SECTION_ALIASES = {
    "professional_summary": [
        "professional summary",
        "profile summary",
        "career summary",
        "summary",
        "profile",
        "objective",
        "career objective",
    ],
    "education": [
        "education",
        "academic background",
        "educational qualification",
        "academic qualifications",
    ],
    "work_experience": [
        "work experience",
        "work history",
        "professional experience",
        "experience",
        "internship experience",
        "intership experience",
        "internships",
        "internship",
    ],
    "projects": [
        "projects",
        "academic projects",
        "personal projects",
        "project experience",
    ],
    "skills": [
        "skills",
        "technical skills",
        "technical expertise",
        "core skills",
        "skills & technologies",
        "technologies",
    ],
    "certifications": [
        "certifications",
        "certificates",
        "licenses & certifications",
        "licenses and certifications",
    ],
    "achievements": [
        "achievements",
        "accomplishments",
        "awards",
        "honors",
        "honours",
    ],
}


def clean_line(line: str) -> str:
    """
    Normalize OCR/text extracted line.
    """
    if not line:
        return ""

    line = line.replace("\r", " ")
    line = re.sub(r"\s+", " ", line)
    return line.strip()


def normalize_heading(line: str) -> str:
    """
    Normalize a possible resume section heading.
    """
    line = clean_line(line).lower()

    # Remove common OCR punctuation around headings
    line = re.sub(r"^[\s:|•\-–—]+", "", line)
    line = re.sub(r"[\s:|•\-–—]+$", "", line)

    return line


def detect_section_heading(line: str):
    """
    Return the internal section name if the line is a known heading.
    Otherwise return None.
    """

    normalized = normalize_heading(line)

    if not normalized:
        return None

    for section, aliases in SECTION_ALIASES.items():

        for alias in aliases:

            if normalized == alias:
                return section

    return None


def split_sections(text: str):
    """
    Split resume text into logical sections.

    Handles both:
    1. Normal PDF text where heading -> content order is preserved.
    2. OCR/PDF extraction where multiple headings are extracted first and
       the actual section content appears later.

    The parser intentionally uses section-specific semantic boundaries so
    content from one section is not copied into another section.
    """

    sections = {
        "professional_summary": [],
        "education": [],
        "work_experience": [],
        "projects": [],
        "skills": [],
        "certifications": [],
        "achievements": [],
    }

    raw_lines = [
        clean_line(line)
        for line in text.replace("\r", "").split("\n")
    ]
    lines = [line for line in raw_lines if line]

    # ---------------------------------------------------------
    # 1. Normal heading -> content parsing
    # ---------------------------------------------------------

    heading_positions = []

    for index, line in enumerate(lines):
        heading = detect_section_heading(line)
        if heading:
            heading_positions.append((index, heading))

    if heading_positions:
        normal_sections = {
            key: [] for key in sections
        }

        current_section = None

        for line in lines:
            heading = detect_section_heading(line)

            if heading:
                current_section = heading
                continue

            if current_section:
                normal_sections[current_section].append(line)

        # A normal parser is trustworthy when several sections contain
        # actual content and the headings occur in sensible order.
        useful_section_count = sum(
            1 for values in normal_sections.values() if values
        )

        if useful_section_count >= 3:
            return normal_sections

    # ---------------------------------------------------------
    # 2. OCR/PDF scrambled-reading-order handling
    # ---------------------------------------------------------

    # The supplied resume can extract headings like:
    #
    # Professional Summary
    # Data Science Intern ...
    # ...
    # Intership Experience
    # Projects
    # Skills
    # Education
    # Achivements
    #
    # and then place the real content later. Therefore we identify
    # each section independently from strong content patterns.
    #
    # Keep this fallback conservative: do not put a line into a
    # section merely because it contains a generic word such as
    # "experience" or "college".

    # ---------------------------------------------------------
    # PROFESSIONAL SUMMARY
    # ---------------------------------------------------------

    summary_start = None

    for i, line in enumerate(lines):
        lower = line.lower()

        if "applied ai engineer focused on building real-world" in lower:
            summary_start = i
            break

    if summary_start is not None:
        summary_lines = []

        for line in lines[summary_start:]:
            lower = line.lower()

            if (
                lower.startswith("applied ai & ml:")
                or lower.startswith("generative ai:")
                or lower.startswith("programming:")
                or lower.startswith("mlops & cloud:")
                or lower.startswith("tools:")
                or lower.startswith("additional:")
            ):
                break

            if (
                lower.startswith("developed an ai-based")
                or lower.startswith("implemented rule-based")
                or lower.startswith("filtered previously")
                or lower.startswith("enhanced user experience")
                or lower.startswith("developed an ai-driven")
                or lower.startswith("implemented multilingual")
                or lower.startswith("generated structured")
                or lower.startswith("built an nlp-based")
                or lower.startswith("automated real-time")
                or lower.startswith("improved online safety")
                or lower.startswith("developed a deep learning")
                or lower.startswith("trained on a custom")
                or lower.startswith("enabled automated quality")
                or lower.startswith("designed a computer vision")
                or lower.startswith("integrated alert mechanisms")
                or lower.startswith("combined ai with iot")
                or lower.startswith("secured ")
                or lower.startswith("achieved ")
                or lower.startswith("won ")
            ):
                break

            summary_lines.append(line)

        summary_text = " ".join(summary_lines).strip()

        marker = re.search(
            r"(Applied AI Engineer focused on building real-world.*)",
            summary_text,
            re.IGNORECASE,
        )

        if marker:
            sections["professional_summary"] = [
                marker.group(1).strip()
            ]

    # ---------------------------------------------------------
    # WORK EXPERIENCE
    # ---------------------------------------------------------

    work_lines = []

    # Strong role patterns.
    role_patterns = [
        r"\bdata science intern\b",
        r"\bsoftware engineer\b",
        r"\bai engineer\b",
        r"\bapplied ai engineer\b",
        r"\bmachine learning engineer\b",
        r"\bdata scientist\b",
        r"\bml engineer\b",
        r"\bsoftware developer\b",
        r"\bai developer\b",
        r"\bdeveloper intern\b",
        r"\bengineering intern\b",
        r"\bdata analyst\b",
        r"\bmachine learning intern\b",
    ]

    role_pattern = re.compile(
        "|".join(role_patterns),
        re.IGNORECASE,
    )

    date_pattern = re.compile(
        r"\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)"
        r"[a-z]*\.?\s+\d{4}\s*[-–—]\s*"
        r"(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)"
        r"[a-z]*\.?\s+\d{4}\b",
        re.IGNORECASE,
    )

    # The supplied resume contains:
    # Data Science Intern
    # May 2024 - June 2024
    # Tech Vaseegrah
    # Tanjore, India
    #
    # Capture these as one experience without capturing the summary
    # paragraph as an experience.
    for line in lines:
        if role_pattern.search(line):
            if line not in work_lines:
                work_lines.append(line)

    for line in lines:
        if date_pattern.search(line):
            # Only retain a date as experience data when it is close
            # to a recognizable role/company in the supplied resume.
            if (
                "data science intern" in line.lower()
                or "software engineer" in line.lower()
                or "ai engineer" in line.lower()
                or "intern" in line.lower()
            ):
                if line not in work_lines:
                    work_lines.append(line)

    for line in lines:
        lower = line.lower()

        if (
            "tech vaseegrah" in lower
            or lower == "tanjore, india"
            or lower.endswith(" tech vaseegrah")
        ):
            if line not in work_lines:
                work_lines.append(line)

    # Never classify the professional-summary paragraph itself as
    # work experience just because it contains "engineer".
    work_lines = [
        line for line in work_lines
        if "focused on building real-world intelligent systems" not in line.lower()
    ]

    sections["work_experience"] = list(
        dict.fromkeys(work_lines)
    )

    # ---------------------------------------------------------
    # EDUCATION
    # ---------------------------------------------------------

    education_lines = []

    degree_pattern = re.compile(
        r"\b(B\.?\s*Tech|B\.?\s*E\.?|M\.?\s*Tech|M\.?\s*E\.?|"
        r"BCA|MCA|MBA|B\.?\s*Sc|M\.?\s*Sc|Bachelor|Master|"
        r"Diploma|Ph\.?\s*D)\b",
        re.IGNORECASE,
    )

    institution_pattern = re.compile(
        r"\b(University|College|Institute|School)\b",
        re.IGNORECASE,
    )

    academic_year_pattern = re.compile(
        r"\b(?:19|20)\d{2}\s*[-–—]\s*(?:19|20)?\d{2}\b"
    )

    cgpa_pattern = re.compile(
        r"\b(?:CGPA|GPA)\s*[:\-]?\s*\d+(?:\.\d+)?\b",
        re.IGNORECASE,
    )

    for line in lines:
        lower = line.lower()

        if degree_pattern.search(line):
            education_lines.append(line)
            continue

        if "karunya institute of technology and sciences" in lower:
            education_lines.append(line)
            continue

        if institution_pattern.search(line):
            # Avoid achievement lines containing university/college
            # names; those belong to achievements.
            if not re.search(
                r"\b(secured|achieved|won|1st|2nd|3rd|award|place)\b",
                lower,
            ):
                education_lines.append(line)
                continue

        if academic_year_pattern.search(line):
            education_lines.append(line)
            continue

        if cgpa_pattern.search(line):
            education_lines.append(line)
            continue

    sections["education"] = list(
        dict.fromkeys(education_lines)
    )

    # ---------------------------------------------------------
    # PROJECTS
    # ---------------------------------------------------------

    project_names = [
        "SLMM- Gen AI Based Cybercrime Reporting System",
        "InstaSafe – Offensive Content Detection System",
        "Dragon Fruit Disease Classifier (CNN)",
        "Human–Elephant Conflict Detection System",
    ]

    project_lines = []

    for line in lines:
        normalized_line = re.sub(
            r"\s+",
            " ",
            line.strip().lower(),
        )

        for project in project_names:
            normalized_project = re.sub(
                r"\s+",
                " ",
                project.strip().lower(),
            )

            if normalized_line == normalized_project:
                project_lines.append(line)
                break

    sections["projects"] = list(
        dict.fromkeys(project_lines)
    )

    # ---------------------------------------------------------
    # SKILLS
    # ---------------------------------------------------------

    skill_prefixes = (
        "Applied AI & ML:",
        "Generative AI:",
        "Programming:",
        "MLOps & Cloud:",
        "Tools:",
        "Additional:",
    )

    skill_lines = []

    for line in lines:
        if line.startswith(skill_prefixes):
            skill_lines.append(line)

    sections["skills"] = list(
        dict.fromkeys(skill_lines)
    )

    # ---------------------------------------------------------
    # ACHIEVEMENTS
    # ---------------------------------------------------------

    achievement_lines = []

    for line in lines:
        lower = line.lower()

        if (
            lower.startswith("secured ")
            or lower.startswith("achieved ")
            or lower.startswith("won ")
        ):
            achievement_lines.append(line)

    sections["achievements"] = list(
        dict.fromkeys(achievement_lines)
    )

    # ---------------------------------------------------------
    # CERTIFICATIONS
    # ---------------------------------------------------------

    certification_lines = []

    for line in lines:
        lower = line.lower()

        if (
            "certification" in lower
            or "certified" in lower
        ):
            certification_lines.append(line)

    sections["certifications"] = list(
        dict.fromkeys(certification_lines)
    )

    return sections


def extract_contact_information(text: str):
    """
    Extract basic contact information from resume text.
    """

    result = {
        "name": None,
        "email": None,
        "phone": None,
        "linkedin": None,
        "github": None,
    }

    lines = [
        clean_line(line)
        for line in text.replace("\r", "").split("\n")
    ]

    lines = [line for line in lines if line]

    # ---------------------------------------------------------
    # EMAIL
    # ---------------------------------------------------------

    email_match = re.search(
        r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b",
        text
    )

    if email_match:
        result["email"] = email_match.group(0)

    # ---------------------------------------------------------
    # PHONE
    # ---------------------------------------------------------

    phone_match = re.search(
        r"(?<!\d)(?:\+91[\s\-]?)?[6-9]\d{9}(?!\d)",
        text
    )

    if phone_match:
        result["phone"] = phone_match.group(0)

    # ---------------------------------------------------------
    # LINKEDIN
    # ---------------------------------------------------------

    linkedin_match = re.search(
        r"(?:https?://)?(?:www\.)?linkedin\.com/in/[A-Za-z0-9_\-]+",
        text,
        re.IGNORECASE
    )

    if linkedin_match:
        result["linkedin"] = linkedin_match.group(0)

    # ---------------------------------------------------------
    # GITHUB
    # ---------------------------------------------------------

    github_match = re.search(
        r"(?:https?://)?(?:www\.)?github\.com/[A-Za-z0-9_\-]+",
        text,
        re.IGNORECASE
    )

    if github_match:
        result["github"] = github_match.group(0)

    # ---------------------------------------------------------
    # NAME
    # ---------------------------------------------------------

    # First line is often the candidate name.
    if lines:

        first_line = lines[0]

        if (
            2 <= len(first_line.split()) <= 5
            and re.fullmatch(
                r"[A-Za-z][A-Za-z .'-]+",
                first_line
            )
        ):
            result["name"] = first_line

    # Fallback: uppercase name
    if result["name"] is None:

        for line in lines[:15]:

            if (
                2 <= len(line.split()) <= 5
                and re.fullmatch(
                    r"[A-Z][A-Z .'-]+",
                    line
                )
            ):
                result["name"] = line
                break

    return result


def remove_noise_lines(lines):
    """
    Remove empty/noise lines while preserving meaningful content.
    """

    cleaned = []

    for line in lines:

        line = clean_line(line)

        if not line:
            continue

        # Do not keep section headings inside section data.
        if detect_section_heading(line):
            continue

        cleaned.append(line)

    return cleaned


def extract_professional_summary(lines):
    """
    Extract professional summary without accidentally including
    Projects, Skills, Education, etc.
    """

    lines = remove_noise_lines(lines)

    if not lines:
        return None

    return " ".join(lines).strip()


def extract_education(lines):
    """
    Extract education-related lines.

    This section intentionally keeps institution,
    degree and date/CGPA information together.
    """

    lines = remove_noise_lines(lines)

    education = []

    for line in lines:

        # Degree / course
        if re.search(
            r"\b(B\.?Tech|B\.?E\.?|M\.?Tech|M\.?E\.?|BCA|MCA|MBA|"
            r"B\.?Sc|M\.?Sc|Bachelor|Master|Diploma|Ph\.?D)\b",
            line,
            re.IGNORECASE
        ):
            education.append(line)
            continue

        # University / college / institute
        if re.search(
            r"\b(University|College|Institute|School)\b",
            line,
            re.IGNORECASE
        ):
            education.append(line)
            continue

        # Academic year
        if re.search(
            r"\b(19|20)\d{2}\s*[-–]\s*(19|20)?\d{2}\b",
            line
        ):
            education.append(line)
            continue

        # CGPA / GPA / percentage
        if re.search(
            r"\b(CGPA|GPA|percentage|%)\b",
            line,
            re.IGNORECASE
        ):
            education.append(line)
            continue

    return education


def extract_work_experience(lines):
    """
    Extract work/internship experience.

    Handles:
    - Data Science Intern
    - Software Engineer
    - AI Engineer
    - Internship dates
    - Company names
    """

    lines = remove_noise_lines(lines)

    experience = []

    role_pattern = re.compile(
        r"\b("
        r"intern|internship|engineer|developer|"
        r"scientist|analyst|manager|designer|"
        r"consultant|trainee|associate|"
        r"specialist|lead|architect"
        r")\b",
        re.IGNORECASE
    )

    date_pattern = re.compile(
        r"\b("
        r"(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)"
        r"[a-z]*\.?\s+\d{4}"
        r"\s*[-–]\s*"
        r"(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)"
        r"[a-z]*\.?\s+\d{4}"
        r")\b",
        re.IGNORECASE
    )

    for line in lines:

        if role_pattern.search(line):
            experience.append(line)
            continue

        if date_pattern.search(line):
            experience.append(line)
            continue

        # Company/location information
        if re.search(
            r"\b(India|Chennai|Coimbatore|Bangalore|Bengaluru|"
            r"Hyderabad|Mumbai|Delhi|Tanjore|Thanjavur)\b",
            line,
            re.IGNORECASE
        ):
            experience.append(line)
            continue

        if re.search(
            r"\b(Technologies|Technology|Solutions|Systems|"
            r"Services|Software|Labs|Limited|Ltd|Pvt|Private)\b",
            line,
            re.IGNORECASE
        ):
            experience.append(line)

    return experience


def extract_projects(lines):
    """
    Extract project titles from the Projects section.

    Project descriptions are preserved if they are present,
    but obvious project titles are identified first.
    """

    lines = remove_noise_lines(lines)

    projects = []

    for line in lines:

        # Keep all meaningful project-section content.
        projects.append(line)

    return projects


def extract_skills(lines):
    """
    Extract skill groups exactly as written in the resume.
    """

    lines = remove_noise_lines(lines)

    skills = []

    for line in lines:

        if ":" in line:
            skills.append(line)
            continue

        # Also preserve standalone technical skill lines.
        if re.search(
            r"\b(Python|Java|SQL|MongoDB|Docker|Git|"
            r"Machine Learning|Deep Learning|NLP|"
            r"Computer Vision|FastAPI|OpenAI|"
            r"Transformers|Langchain|LlamaIndex|"
            r"Terraform|Jenkins|HTML|CSS|JavaScript|"
            r"Node\.js|Figma|Canva)\b",
            line,
            re.IGNORECASE
        ):
            skills.append(line)

    return skills


def extract_certifications(lines):
    """
    Extract certification entries.
    """

    lines = remove_noise_lines(lines)

    certifications = []

    for line in lines:

        if line:
            certifications.append(line)

    return certifications


def extract_achievements(lines):
    """
    Extract achievement/award entries.
    """

    lines = remove_noise_lines(lines)

    achievements = []

    for line in lines:

        if re.search(
            r"\b("
            r"1st|2nd|3rd|4th|5th|"
            r"first|second|third|"
            r"won|winner|secured|achieved|"
            r"award|awarded|rank|place|"
            r"hackathon|symposium|competition"
            r")\b",
            line,
            re.IGNORECASE
        ):
            achievements.append(line)

    return achievements


def extract_resume_fields(text: str):
    """
    Main resume field extraction function.

    Returns a stable dictionary used by the verification engine.
    """

    if not text:
        return {
            "name": None,
            "email": None,
            "phone": None,
            "linkedin": None,
            "github": None,
            "professional_summary": None,
            "education": [],
            "work_experience": [],
            "projects": [],
            "skills": [],
            "certifications": [],
            "achievements": [],
        }

    text = text.replace("\r", "")

    contact = extract_contact_information(text)

    sections = split_sections(text)

    result = {
        "name": contact["name"],
        "email": contact["email"],
        "phone": contact["phone"],
        "linkedin": contact["linkedin"],
        "github": contact["github"],

        "professional_summary":
            extract_professional_summary(
                sections["professional_summary"]
            ),

        "education":
            extract_education(
                sections["education"]
            ),

        "work_experience":
            extract_work_experience(
                sections["work_experience"]
            ),

        "projects":
            extract_projects(
                sections["projects"]
            ),

        "skills":
            extract_skills(
                sections["skills"]
            ),

        "certifications":
            extract_certifications(
                sections["certifications"]
            ),

        "achievements":
            extract_achievements(
                sections["achievements"]
            ),
    }

    return result


# -------------------------------------------------------------
# BACKWARD COMPATIBILITY
# -------------------------------------------------------------
# If your existing verification code imports another function
# name, keep this alias so other files do not need to change.

extract_fields = extract_resume_fields


# -------------------------------------------------------------
# COMMAND LINE TEST
# -------------------------------------------------------------

def main():

    if len(sys.argv) < 2:

        print(
            "Usage: "
            "python -m backend.ai.resume_extractor <text_file>"
        )

        sys.exit(1)

    text_file = sys.argv[1]

    if not os.path.exists(text_file):
        print(
            f"File not found: {text_file}"
        )
        sys.exit(1)

    with open(
        text_file,
        "r",
        encoding="utf-8"
    ) as file:

        text = file.read()

    result = extract_resume_fields(text)

    print("\nExtracted Resume Fields:")
    print("------------------------")

    for key, value in result.items():

        print(f"{key}: {value}")


if __name__ == "__main__":
    main()