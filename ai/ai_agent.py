from agents import Agent, Runner, function_tool
import os
from dotenv import load_dotenv

load_dotenv()

# Tools
@function_tool
def make_payment(recipient: str, amount: float, currency: str = "USD") -> str:
    # Mocked logic — you’ll call your Node.js backend later
    return f"Initiated payment of {amount} {currency} to {recipient}."

# Agent
payment_agent = Agent(
    name="Zapbot",
    instructions="You help users send money by understanding their natural language requests. Ask for confirmation before sending.",
    tools=[make_payment],
)

# API handler
async def handle_input(text_input):
    result = await Runner.run(payment_agent, input=text_input)
    return result.final_output

# CLI test (remove in prod)
if __name__ == "__main__":
    import asyncio
    user_input = input("Say something: ")
    asyncio.run(handle_input(user_input))
