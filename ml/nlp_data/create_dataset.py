import json
from pathlib import Path

examples = [
    {
        "name": "HARIHARAN K",
        "course": "Introduction to Soft Skills",
        "organization": "TCS iON",
        "certificate_id": "66790-25861468-1016",
        "date": "03 Feb 2024"
    },
    {
        "name": "ARUN KUMAR",
        "course": "Python Programming",
        "organization": "Infosys",
        "certificate_id": "INF-PY-2024-001",
        "date": "15 Jan 2024"
    },
    {
        "name": "PRIYA S",
        "course": "Data Science Fundamentals",
        "organization": "IBM",
        "certificate_id": "IBM-DS-2024-001",
        "date": "20 Feb 2024"
    },
    {
        "name": "RAHUL M",
        "course": "Machine Learning",
        "organization": "NPTEL",
        "certificate_id": "NPTEL-ML-2024-123",
        "date": "10 Mar 2024"
    },
    {
        "name": "DIVYA R",
        "course": "Artificial Intelligence",
        "organization": "Google",
        "certificate_id": "GOOG-AI-2024-456",
        "date": "12 Apr 2024"
    },
    {
        "name": "KARTHIK S",
        "course": "Deep Learning Specialization",
        "organization": "Coursera",
        "certificate_id": "COURSE-DL-789",
        "date": "05 May 2024"
    },
    {
        "name": "ANJALI P",
        "course": "Web Development",
        "organization": "Udemy",
        "certificate_id": "UD-WEB-2024-111",
        "date": "18 Jun 2024"
    },
    {
        "name": "VIGNESH K",
        "course": "Cloud Computing",
        "organization": "Microsoft",
        "certificate_id": "MS-CLOUD-222",
        "date": "21 Jul 2024"
    },
    {
        "name": "SNEHA R",
        "course": "Cyber Security",
        "organization": "Cisco",
        "certificate_id": "CISCO-CS-333",
        "date": "09 Aug 2024"
    },
    {
        "name": "ROHIT V",
        "course": "Data Analytics",
        "organization": "IBM",
        "certificate_id": "IBM-DA-444",
        "date": "14 Sep 2024"
    },
    {
        "name": "MEENA S",
        "course": "Natural Language Processing",
        "organization": "Google",
        "certificate_id": "GOOG-NLP-555",
        "date": "02 Oct 2024"
    },
    {
        "name": "SURESH B",
        "course": "Python for Data Science",
        "organization": "NPTEL",
        "certificate_id": "NPTEL-PY-666",
        "date": "11 Nov 2024"
    },
    {
        "name": "LAKSHMI K",
        "course": "Cloud Computing Basics",
        "organization": "AWS",
        "certificate_id": "AWS-CC-777",
        "date": "19 Dec 2024"
    },
    {
        "name": "ADITHYA R",
        "course": "Generative AI",
        "organization": "Microsoft",
        "certificate_id": "MS-GENAI-888",
        "date": "07 Jan 2025"
    },
    {
        "name": "POOJA M",
        "course": "Artificial Intelligence and Machine Learning",
        "organization": "IBM",
        "certificate_id": "IBM-AIML-999",
        "date": "13 Feb 2025"
    },
    {
        "name": "SANJAY K",
        "course": "Java Programming",
        "organization": "Udemy",
        "certificate_id": "UD-JAVA-101",
        "date": "22 Mar 2025"
    },
    {
        "name": "RESHMA P",
        "course": "Python Basics",
        "organization": "Coursera",
        "certificate_id": "COUR-PY-202",
        "date": "16 Apr 2025"
    },
    {
        "name": "NAVEEN S",
        "course": "Machine Learning with Python",
        "organization": "Google",
        "certificate_id": "GOOG-ML-303",
        "date": "25 May 2025"
    },
    {
        "name": "KEERTHANA V",
        "course": "Full Stack Development",
        "organization": "Infosys",
        "certificate_id": "INF-FS-404",
        "date": "08 Jun 2025"
    },
    {
        "name": "MANOJ R",
        "course": "Introduction to Cyber Security",
        "organization": "Cisco",
        "certificate_id": "CISCO-SEC-505",
        "date": "17 Jul 2025"
    },
    {
        "name": "ASHWIN K",
        "course": "Computer Vision",
        "organization": "NPTEL",
        "certificate_id": "NPTEL-CV-606",
        "date": "03 Aug 2025"
    },
    {
        "name": "SWATHI R",
        "course": "Deep Learning",
        "organization": "Coursera",
        "certificate_id": "COUR-DL-707",
        "date": "14 Sep 2025"
    },
    {
        "name": "GOKUL S",
        "course": "DevOps Fundamentals",
        "organization": "Microsoft",
        "certificate_id": "MS-DEV-808",
        "date": "29 Oct 2025"
    },
    {
        "name": "HARINI P",
        "course": "SQL and Database Management",
        "organization": "IBM",
        "certificate_id": "IBM-SQL-909",
        "date": "12 Nov 2025"
    },
    {
        "name": "DINESH M",
        "course": "React Web Development",
        "organization": "Udemy",
        "certificate_id": "UD-REACT-110",
        "date": "21 Dec 2025"
    },
    {
        "name": "MONIKA S",
        "course": "Natural Language Processing",
        "organization": "NPTEL",
        "certificate_id": "NPTEL-NLP-220",
        "date": "06 Jan 2026"
    },
    {
        "name": "BALAJI K",
        "course": "Data Visualization",
        "organization": "Google",
        "certificate_id": "GOOG-DV-330",
        "date": "18 Feb 2026"
    },
    {
        "name": "NITHYA R",
        "course": "Prompt Engineering",
        "organization": "Microsoft",
        "certificate_id": "MS-PE-440",
        "date": "24 Mar 2026"
    },
    {
        "name": "VISHAL P",
        "course": "Generative AI Applications",
        "organization": "AWS",
        "certificate_id": "AWS-GEN-550",
        "date": "09 Apr 2026"
    },
    {
        "name": "AKSHAYA S",
        "course": "Software Testing",
        "organization": "Infosys",
        "certificate_id": "INF-ST-660",
        "date": "20 May 2026"
    }
]


templates = [
    "Certificate awarded to {name} for successfully completing {course} from {organization}. Certificate ID: {certificate_id}. Date: {date}.",

    "This certificate is presented to {name} for completing {course}. Organization: {organization}. Certificate ID: {certificate_id}. Date: {date}.",

    "Congratulations {name} for successfully completing {course} from {organization}. Cert ID: {certificate_id}. Date: {date}.",

    "{organization} certifies that {name} has successfully completed {course}. Certificate Number: {certificate_id}. Issued on {date}.",

    "This is to certify that {name} completed {course} from {organization}. ID: {certificate_id}. Awarded on {date}."
]


def find_entity(text, value, entity_type):

    start = text.index(value)
    end = start + len(value)

    return [start, end, entity_type]


output = []

for index, item in enumerate(examples):

    template = templates[index % len(templates)]

    text = template.format(**item)

    entities = [
        find_entity(text, item["name"], "PERSON"),
        find_entity(text, item["course"], "COURSE"),
        find_entity(text, item["organization"], "ORGANIZATION"),
        find_entity(text, item["certificate_id"], "CERTIFICATE_ID"),
        find_entity(text, item["date"], "DATE")
    ]

    output.append({
        "text": text,
        "entities": entities
    })


output_path = Path("ml/nlp_data/train.json")
output_path.parent.mkdir(parents=True, exist_ok=True)

with open(output_path, "w", encoding="utf-8") as f:
    json.dump(output, f, indent=2, ensure_ascii=False)

print(f"Created {len(output)} training examples.")
print(f"Saved to: {output_path}")