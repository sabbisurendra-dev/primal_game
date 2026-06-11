#!/usr/bin/env python3
import os
import json
import glob
import google.generativeai as genai

# Setup API Key registration from local env variables
api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
if not api_key:
    print("[-] Error: GEMINI_API_KEY or GOOGLE_API_KEY environment variable is not set!")
    print("Please set your API key in your terminal before running the script:")
    print("  export GEMINI_API_KEY=\"your_actual_key_here\"")
    exit(1)

genai.configure(api_key=api_key)

def init_directories():
    """Ensure required directories exist."""
    base_dir = os.path.dirname(os.path.abspath(__file__))
    os.makedirs(os.path.join(base_dir, "intake_dump"), exist_ok=True)
    os.makedirs(os.path.join(base_dir, "optimized_outputs"), exist_ok=True)

def load_context_assets():
    """Reads profile and configurations from local files using script-relative paths."""
    base_dir = os.path.dirname(os.path.abspath(__file__))
    
    config_path = os.path.join(base_dir, "config.json")
    resume_path = os.path.join(base_dir, "resume_base.txt")
    
    with open(config_path, "r", encoding="utf-8") as f:
        config = json.load(f)
    
    with open(resume_path, "r", encoding="utf-8") as f:
        resume_text = f.read()
        
    return config, resume_text

def build_system_instructions(config, resume_text):
    """Generates the rigid prompt wrapper ensuring high-volume execution alignment."""
    instructions = f"""
    You are an automated, high-velocity Product Management Recruitment Agent. Your sole task is to take a raw job post, validate it against candidate criteria, and produce optimized outreach scripts.

    CANDIDATE BASE PROFILE:
    {resume_text}

    STRICT CONTEXT FILTERS:
    - Minimum Target CTC: {config['minimum_fixed_ctc_lpa']} LPA Fixed. Flag immediately if position text explicitly limits budget below this.
    - Priority Level: {config['target_level']} roles only.
    - Notice Period Leverage: Candidate is an 'Immediate Joiner' working on independent AI tools. Emphasize this heavily.
    - Target Geography: Only process if matching {config['allowed_locations']}.

    OUTPUT GUIDELINES:
    Bypass all introductory conversational filler. Respond strictly in structured JSON matching this schema:
    {{
        "company_name": "string",
        "fit_index": "0-100%",
        "instahyre_cover_note": "A powerful 3-sentence application pitch mapping his specific Ola/Kuhoo metrics to this job context.",
        "linkedin_recruiter_dm": "A concise, high-conversion direct message emphasizing immediate availability.",
        "left_weighted_resume_adjustments": ["Bullet 1 with metrics shifted left", "Bullet 2 with metrics shifted left"]
    }}
    """
    return instructions

def process_intake_pipeline():
    """Iterates through raw job texts, queries Gemini Pro, and dumps out applications."""
    init_directories()
    config, resume_text = load_context_assets()
    system_prompt = build_system_instructions(config, resume_text)
    
    # Initialize the Gemini model with advanced system instructions
    model = genai.GenerativeModel(
        model_name="gemini-1.5-pro",
        system_instruction=system_prompt,
        generation_config={"response_mime_type": "application/json"}
    )
    
    base_dir = os.path.dirname(os.path.abspath(__file__))
    job_files = glob.glob(os.path.join(base_dir, "intake_dump/*.txt"))
    if not job_files:
        print("[-] Intake folder empty. Drop copied job post .txt files into 'intake_dump/'.")
        return

    print(f"[+] Found {len(job_files)} files to parse. Executing Gemini optimization engine...")
    
    for file_path in job_files:
        base_name = os.path.basename(file_path).replace(".txt", "")
        with open(file_path, "r", encoding="utf-8") as f:
            raw_job_spec = f.read()
            
        print(f"[*] Processing application roadmap for: {base_name}")
        
        response = model.generate_content(f"PROCESS THIS JOB SPECIFICATION:\n{raw_job_spec}")
        
        # Save structured output payload
        output_path = os.path.join(base_dir, f"optimized_outputs/{base_name}_application.json")
        with open(output_path, "w", encoding="utf-8") as out_f:
            out_f.write(response.text)
            
        print(f"[+] Output successfully generated at: {output_path}")

if __name__ == "__main__":
    process_intake_pipeline()
