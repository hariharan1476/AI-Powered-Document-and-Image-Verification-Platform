import uuid
from typing import Dict, Any

# In-memory store for active jobs
_jobs: Dict[str, Any] = {}

def create_job() -> str:
    job_id = str(uuid.uuid4())
    _jobs[job_id] = {
        "status": "pending",
        "progress": 0,
        "logs": [],
        "result": None,
        "error": None,
        "new_logs_event": None # We will use asyncio.Event to notify listeners
    }
    return job_id

def update_job(job_id: str, status: str = None, progress: int = None, log: str = None, result: Any = None, error: str = None):
    if job_id not in _jobs:
        return

    job = _jobs[job_id]
    
    if status is not None:
        job["status"] = status
    if progress is not None:
        job["progress"] = progress
    if log is not None:
        job["logs"].append(log)
    if result is not None:
        job["result"] = result
        job["status"] = "completed"
        job["progress"] = 100
    if error is not None:
        job["error"] = error
        job["status"] = "failed"
        
    event = job.get("new_logs_event")
    loop = job.get("loop")
    if event and loop:
        loop.call_soon_threadsafe(event.set)

def get_job(job_id: str) -> Dict[str, Any]:
    return _jobs.get(job_id)

def get_job_event(job_id: str):
    import asyncio
    if job_id not in _jobs:
        return None
    if _jobs[job_id].get("new_logs_event") is None:
        _jobs[job_id]["new_logs_event"] = asyncio.Event()
        _jobs[job_id]["loop"] = asyncio.get_running_loop()
    return _jobs[job_id]["new_logs_event"]

def clear_job_event(job_id: str):
    if job_id in _jobs and _jobs[job_id].get("new_logs_event"):
        _jobs[job_id]["new_logs_event"].clear()

def pop_job(job_id: str) -> Dict[str, Any]:
    return _jobs.pop(job_id, None)
