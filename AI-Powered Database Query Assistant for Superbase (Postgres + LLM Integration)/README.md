# AI-Powered Database Query Assis## 📦 Requirements

### Prerequisites
- n8n (self-hosted or cloud)
- Postg## 🔑 Notes

- If a query returns NULL, the bot responds with: "No value is entered in the Supabase."
- Always ensure the sequence: Schema → Definitions → Column Descriptions → SQL Execution
- For ambiguous user questions, the bot asks for clarification before queryingpabase database with accessible connection credentials
- OpenAI API Key (for GPT model integration)

### Required n8n Community Nodes
- `@n8n/n8n-nodes-langchain`
- `n8n-nodes-base.postgresTool`+ Postgres + LLM Integration)

## Overview
This repository contains an n8n workflow that enables natural language querying of a Postgres database hosted on Supabase using an LLM (OpenAI GPT).
It converts user chat messages into structured SQL queries, executes them against the database, and returns insights in plain language.

## 🚀 Features
- **Chat Interface**: IME BOT with custom styling
- **Database Integration**: Postgres database with memory support
- **Smart Tools**:
  - Schema discovery (list all tables)
  - Table definitions (columns, datatypes, constraints)
  - Contextual descriptions for each table
  - Query execution against Supabase
- **AI Integration**: 
  - Powered by OpenAI GPT-4.1-mini via LangChain
  - Step-wise reasoning for safe and accurate querying

## 🛠 Workflow Overview

The workflow consists of the following nodes:

| Node | Description |
|------|-------------|
| Chat Trigger | Receives user questions |
| Postgres Agent | Main LangChain agent that orchestrates tool usage |
| Postgres Chat Memory | Stores conversation history in Postgres |
| DB Schema and Tables Tool | Retrieves all available tables |
| Table Definitions Tool | Provides details of table columns, datatypes, and constraints |
| {table_name}description Tool | Contextual info for table columns |
| Execute SQL Query Tool | Runs AI-generated SQL queries |
| OpenAI Chat Model | LLM for reasoning and natural language responses |

📦 Requirements

To deploy this workflow, you’ll need:

n8n (self-hosted or cloud)

Postgres / Superbase database with accessible connection credentials

OpenAI API Key (for GPT model integration)

Installed n8n community nodes:

@n8n/n8n-nodes-langchain

n8n-nodes-base.postgresTool

🏗 Deployment Notes

When deploying, you must create custom tool nodes for your schema:

{table_name}description

Description: Provides contextual info about each table’s columns (e.g., what the column represents).

Requirement: For every relevant table, define a description tool so the AI can interpret columns meaningfully before writing queries.

This ensures that the AI doesn’t just see column names but also understands their business meaning.

⚡ Usage

Import the provided JSON workflow into n8n.

Configure:

Postgres DB credentials

OpenAI API key

Start the workflow.

Open the chatbot UI → Ask questions in natural language (e.g., “What are the top 5 strategies in Flexi-cap PMS with 5-star rating?”).

The workflow will:

Inspect schema

Fetch column definitions

Build and run the query

Return results in conversational text

📌 Example Query Flow

User Question: Show me the latest transactions above ₹10,000.

Workflow fetches DB schema → identifies transactions table.

Reads column definitions → finds amount and transaction_date.

Confirms meaning via {transactions}description tool.

Generates SQL:

SELECT * FROM transactions WHERE amount > 10000 ORDER BY transaction_date DESC;


Executes query and returns result in chat.

🔑 Notes

If a query returns NULL, the bot responds with:
“No value is entered in the Superbase.”

Always ensure the sequence: Schema → Definitions → Column Descriptions → SQL Execution.

For ambiguous user questions, the bot asks for clarification before querying.