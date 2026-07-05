import asyncio
import json
from notebooklm_mcp_cli.api import NotebookLM

async def main():
    try:
        api = NotebookLM.from_profile("default")
        await api.init()
        
        # We know the notebook ID
        notebook_id = "b4292bd5-f7dd-4178-a317-148f9dd9d568"
        
        # Get query answer
        print("--- QUERYING NOTEBOOK ---")
        prompt = "Summarize the project requirements, architecture guidelines, best practices, and SDLC roles for the Unified Racing Intelligence Platform Frontend Development Proposal."
        answer = await api.query_notebook(notebook_id, prompt)
        print(answer)
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(main())
